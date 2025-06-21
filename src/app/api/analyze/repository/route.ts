import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { AdvancedGenerator } from '@/services/advanced-generator'

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

    // Use the new Advanced Generator
    const generator = new AdvancedGenerator()
    
    console.log(`Starting advanced analysis for repository: ${repository.full_name}`)
    
    const result = await generator.generateDocumentation(
      repositoryId,
      provider_token,
      'full'
    )

    // Update analysis log with results
    await supabase
      .from('analysis_logs')
      .update({
        status: result.success ? 'completed' : 'failed',
        completed_at: new Date().toISOString(),
        files_analyzed: result.metrics.artifactsDiscovered,
        documents_generated: result.documentsGenerated,
        error_message: result.error || null
      })
      .eq('id', analysisLog.id)

    if (result.success) {
      console.log(`✅ Advanced analysis completed successfully:`)
      console.log(`- Documents Generated: ${result.documentsGenerated}`)
      console.log(`- Links Created: ${result.linksCreated}`)
      console.log(`- Components Extracted: ${result.metrics.componentsExtracted}`)
      console.log(`- Total Cost: $${result.totalCost.toFixed(4)}`)
      console.log(`- Total Time: ${result.metrics.totalTimeMs}ms`)

      return NextResponse.json({
        success: true,
        message: 'Advanced documentation generation completed',
        documentsGenerated: result.documentsGenerated,
        linksCreated: result.linksCreated,
        sessionId: result.sessionId,
        metrics: {
          documentsGenerated: result.documentsGenerated,
          componentsExtracted: result.metrics.componentsExtracted,
          artifactsDiscovered: result.metrics.artifactsDiscovered,
          totalCost: result.totalCost,
          totalTimeMs: result.metrics.totalTimeMs,
          breakdown: {
            discoveryTimeMs: result.metrics.discoveryTimeMs,
            extractionTimeMs: result.metrics.extractionTimeMs,
            planningTimeMs: result.metrics.planningTimeMs,
            generationTimeMs: result.metrics.generationTimeMs
          }
        }
      })
    } else {
      console.error(`❌ Advanced analysis failed:`, result.error)
      
      return NextResponse.json({
        success: false,
        error: result.error || 'Documentation generation failed',
        sessionId: result.sessionId,
        metrics: result.metrics
      }, { status: 500 })
    }

  } catch (error) {
    console.error('Error in advanced repository analysis:', error)
    
    // Update status to failed if we have repository ID
    try {
      const { repositoryId } = await request.json().catch(() => ({}))
      if (repositoryId) {
        const supabase = await createClient()
        await supabase
          .from('repositories')
          .update({ analysis_status: 'failed' })
          .eq('id', repositoryId)
      }
    } catch (updateError) {
      console.error('Error updating repository status:', updateError)
    }
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 