import { createClient } from '@/lib/supabase/server'
import { GitHubService } from '@/lib/github'
import { NextResponse } from 'next/server'
import { Mistral } from '@mistralai/mistralai'

const mistral = new Mistral({
  apiKey: process.env.MISTRAL_API_KEY!,
})

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { repositoryId } = await request.json()

    if (!repositoryId) {
      return NextResponse.json({ error: 'Repository ID is required' }, { status: 400 })
    }

    // Get the repository
    const { data: repository, error: repoError } = await supabase
      .from('repositories')
      .select('*')
      .eq('id', repositoryId)
      .eq('user_id', user.id)
      .single()

    if (repoError || !repository) {
      return NextResponse.json({ error: 'Repository not found' }, { status: 404 })
    }

    // Get the user's GitHub access token
    const { data: { session } } = await supabase.auth.getSession()
    const provider_token = session?.provider_token

    if (!provider_token) {
      return NextResponse.json({ error: 'No GitHub access token found' }, { status: 401 })
    }

    // Update repository status to analyzing
    await supabase
      .from('repositories')
      .update({ analysis_status: 'analyzing' })
      .eq('id', repositoryId)

    // Create analysis log
    const { data: analysisLog, error: logError } = await supabase
      .from('analysis_logs')
      .insert({
        repository_id: repositoryId,
        analysis_type: 'full',
        status: 'in_progress'
      })
      .select()
      .single()

    if (logError) {
      return NextResponse.json({ error: 'Failed to create analysis log' }, { status: 500 })
    }

    // Initialize GitHub service with OAuth token
    const github = new GitHubService(provider_token)
    const [owner, repo] = repository.full_name.split('/')

    let documents: any[] = []
    let filesAnalyzed = 0

    try {
      // Get repository structure and code files
      const codeFiles = await github.getCodeFiles(owner, repo, repository.default_branch)
      console.log(`Found ${codeFiles.length} code files in ${repository.full_name}`)

      // Create overview document
      documents.push({
        repository_id: repositoryId,
        document_path: 'overview',
        title: `${repository.name} - Project Overview`,
        content: `# ${repository.name}\n\n${repository.description || 'No description available'}\n\nRepository: ${repository.full_name}\nLanguage: ${repository.language || 'Mixed'}\nFiles analyzed: ${codeFiles.length}\n\nThis repository contains ${codeFiles.length} code files across various directories.`,
        document_type: 'overview' as const,
        file_path: null,
        metadata: { 
          repository_name: repository.name,
          analyzed_at: new Date().toISOString(),
          total_files: codeFiles.length
        }
      })

      // Process a subset of files to avoid overwhelming the system
      const filesToProcess = codeFiles.slice(0, 10) // Limit to first 10 files
      
      for (const file of filesToProcess) {
        try {
          const fileContent = await github.getFileContent(owner, repo, file.path!)
          
          // Generate documentation for this file
          const documentPath = file.path!
            .replace(/\//g, '.')
            .replace(/\.[^.]+$/, '') // Remove file extension
          
          // Use AI to analyze the file content
          const prompt = `Analyze this code file and create comprehensive documentation:

File: ${file.path}
Content:
${fileContent.content}

Create documentation that includes:
1. Purpose and overview of the file
2. Key functions, classes, or components
3. Dependencies and imports
4. Usage examples if applicable
5. Any important implementation details

Keep the documentation clear and developer-friendly.`

          const response = await mistral.chat.complete({
            model: 'mistral-large-latest',
            messages: [{ role: 'user', content: prompt }]
          })

          const aiContent = response.choices?.[0]?.message?.content || 'Documentation generation failed'

          documents.push({
            repository_id: repositoryId,
            document_path: documentPath,
            title: `${file.path}`,
            content: aiContent,
            document_type: 'file' as const,
            file_path: file.path!,
            metadata: { 
              size: fileContent.size,
              sha: fileContent.sha,
              language: file.path!.split('.').pop() || 'unknown'
            }
          })

          filesAnalyzed++
          
        } catch (fileError) {
          console.error(`Error processing file ${file.path}:`, fileError)
          // Continue processing other files
        }
      }

      console.log(`Successfully processed ${filesAnalyzed} files`)

    } catch (githubError) {
      console.error('Error accessing GitHub repository:', githubError)
      
             // Fall back to mock documentation if GitHub access fails
       documents = [{
         repository_id: repositoryId,
         document_path: 'overview',
         title: `${repository.name} - Project Overview`,
         content: `# ${repository.name}\n\n${repository.description || 'No description available'}\n\nNote: Limited access to repository contents. Basic documentation generated from available metadata.`,
         document_type: 'overview' as const,
         file_path: null,
         metadata: { 
           repository_name: repository.name,
           analyzed_at: new Date().toISOString(),
           access_limited: true
         }
       }]
       
       filesAnalyzed = 1
     }

    // Store documents
    const { error: docsError } = await supabase
      .from('documents')
      .insert(documents)

    if (docsError) {
      console.error('Error storing documents:', docsError)
    }

    // Update repository and analysis status
    await Promise.all([
      supabase
        .from('repositories')
        .update({ 
          analysis_status: 'completed',
          last_analyzed_at: new Date().toISOString()
        })
        .eq('id', repositoryId),
      
      supabase
        .from('analysis_logs')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          files_analyzed: filesAnalyzed,
          documents_generated: documents.length
        })
        .eq('id', analysisLog.id)
    ])

    return NextResponse.json({ 
      success: true, 
      message: 'Repository analysis completed',
      documents_generated: documents.length
    })

  } catch (error) {
    console.error('Error in repository analysis:', error)
    
    // Update status to failed if we have repository ID
    const { repositoryId } = await request.json().catch(() => ({}))
    if (repositoryId) {
      const supabase = await createClient()
      await supabase
        .from('repositories')
        .update({ analysis_status: 'failed' })
        .eq('id', repositoryId)
    }
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 