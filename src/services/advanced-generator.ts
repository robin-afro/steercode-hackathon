// Advanced Generator Service
// Main orchestrator for the advanced AI documentation generation pipeline

import { createClient } from '@/lib/supabase/server'
import { GitHubService } from '@/lib/github'
import { ComponentExtractorFactory, Component, Artifact } from './component-extractor'
import { Planner, WorkPlan, WorkPlanItem } from './planner'
import { DocGenerator, GenerationResult } from './doc-generator'
import { ContextLoader } from './context-loader'
import crypto from 'crypto'

export interface AdvancedGenerationResult {
  success: boolean
  documentsGenerated: number
  linksCreated: number
  totalCost: number
  error?: string
  sessionId: string
  metrics: {
    discoveryTimeMs: number
    extractionTimeMs: number
    planningTimeMs: number
    generationTimeMs: number
    totalTimeMs: number
    componentsExtracted: number
    artifactsDiscovered: number
  }
}

export interface GenerationSession {
  id: string
  repositoryId: string
  sessionType: 'full' | 'incremental'
  status: 'planning' | 'generating' | 'completed' | 'failed'
  workPlan: WorkPlan
  progress: {
    completed: number
    total: number
    currentItem?: string
  }
  startedAt: string
  completedAt?: string
  error?: string
}

export class AdvancedGenerator {
  private readonly planner: Planner
  private readonly docGenerator: DocGenerator
  private readonly contextLoader: ContextLoader

  constructor() {
    this.planner = new Planner()
    this.docGenerator = new DocGenerator()
    this.contextLoader = new ContextLoader()
  }

  async generateDocumentation(
    repositoryId: string,
    githubToken: string,
    sessionType: 'full' | 'incremental' = 'full'
  ): Promise<AdvancedGenerationResult> {
    const startTime = Date.now()
    const sessionId = this.generateSessionId()
    
    let discoveryTime = 0
    let extractionTime = 0
    let planningTime = 0
    let generationTime = 0

    console.log(`🚀 Starting Advanced Documentation Generation`)
    console.log(`   Session ID: ${sessionId}`)
    console.log(`   Repository ID: ${repositoryId}`)
    console.log(`   Session Type: ${sessionType}`)
    console.log(`   Started at: ${new Date().toISOString()}`)

    try {
      const supabase = await createClient()

      // Get repository info
      console.log(`📋 Loading repository information...`)
      const { data: repository, error: repoError } = await supabase
        .from('repositories')
        .select('*')
        .eq('id', repositoryId)
        .single()

      if (repoError || !repository) {
        throw new Error('Repository not found')
      }

      console.log(`   Repository: ${repository.full_name}`)
      console.log(`   Language: ${repository.language || 'Mixed'}`)
      console.log(`   Branch: ${repository.default_branch}`)

      // Phase 1: Discovery
      console.log(`\n🔍 Phase 1: Artifact Discovery`)
      const discoveryStart = Date.now()
      const artifacts = await this.discoverArtifacts(repository, githubToken)
      discoveryTime = Date.now() - discoveryStart
      console.log(`   ✅ Discovery completed in ${discoveryTime}ms`)

      // Phase 2: Component Extraction
      console.log(`\n🧩 Phase 2: Component Extraction`)
      const extractionStart = Date.now()
      const components = await this.extractComponents(repositoryId, artifacts)
      extractionTime = Date.now() - extractionStart
      console.log(`   ✅ Extraction completed in ${extractionTime}ms`)

      // Phase 3: Planning
      console.log(`\n📝 Phase 3: Work Planning`)
      const planningStart = Date.now()
      const workPlan = await this.createWorkPlan(repositoryId, components, sessionType)
      await this.savePlanningSession(sessionId, repositoryId, workPlan)
      planningTime = Date.now() - planningStart
      console.log(`   ✅ Planning completed in ${planningTime}ms`)
      console.log(`   📄 ${workPlan.items.length} documents planned for generation`)

      // Phase 4: Generation
      console.log(`\n🤖 Phase 4: AI Document Generation`)
      const generationStart = Date.now()
      const generationResults = await this.executeWorkPlan(
        sessionId,
        repositoryId,
        workPlan,
        components,
        repository
      )
      generationTime = Date.now() - generationStart
      console.log(`   ✅ Generation completed in ${generationTime}ms`)

      // Update repository status
      console.log(`\n💾 Updating repository status...`)
      await supabase
        .from('repositories')
        .update({
          analysis_status: 'completed',
          last_analyzed_at: new Date().toISOString()
        })
        .eq('id', repositoryId)

      const totalTime = Date.now() - startTime
      const totalCost = generationResults.reduce((sum, result) => 
        sum + (result.metrics.costEstimated || 0), 0
      )
      const successfulDocs = generationResults.filter(r => r.success).length
      const totalLinks = generationResults.reduce((sum, result) => 
        sum + (result.links?.length || 0), 0
      )

      console.log(`\n🎉 Generation Complete!`)
      console.log(`   ✅ ${successfulDocs}/${generationResults.length} documents generated successfully`)
      console.log(`   🔗 ${totalLinks} cross-references created`)
      console.log(`   💰 Total cost: $${totalCost.toFixed(4)}`)
      console.log(`   ⏱️  Total time: ${totalTime}ms`)
      console.log(`   📊 Breakdown:`)
      console.log(`      Discovery: ${discoveryTime}ms`)
      console.log(`      Extraction: ${extractionTime}ms`)
      console.log(`      Planning: ${planningTime}ms`)
      console.log(`      Generation: ${generationTime}ms`)

      return {
        success: true,
        documentsGenerated: successfulDocs,
        linksCreated: totalLinks,
        totalCost,
        sessionId,
        metrics: {
          discoveryTimeMs: discoveryTime,
          extractionTimeMs: extractionTime,
          planningTimeMs: planningTime,
          generationTimeMs: generationTime,
          totalTimeMs: totalTime,
          componentsExtracted: components.length,
          artifactsDiscovered: artifacts.length
        }
      }

    } catch (error) {
      console.log(`\n❌ Generation Failed!`)
      console.log(`   Error: ${error instanceof Error ? error.message : 'Unknown error'}`)
      
      // Mark session as failed
      await this.markSessionFailed(sessionId, error instanceof Error ? error.message : 'Unknown error')

      const totalTime = Date.now() - startTime
      console.log(`   ⏱️  Failed after: ${totalTime}ms`)
      
      return {
        success: false,
        documentsGenerated: 0,
        linksCreated: 0,
        totalCost: 0,
        error: error instanceof Error ? error.message : 'Unknown error',
        sessionId,
        metrics: {
          discoveryTimeMs: discoveryTime,
          extractionTimeMs: extractionTime,
          planningTimeMs: planningTime,
          generationTimeMs: generationTime,
          totalTimeMs: totalTime,
          componentsExtracted: 0,
          artifactsDiscovered: 0
        }
      }
    }
  }

  private async discoverArtifacts(repository: any, githubToken: string): Promise<Artifact[]> {
    const github = new GitHubService(githubToken)
    const [owner, repo] = repository.full_name.split('/')

    // Get repository structure
    const codeFiles = await github.getCodeFiles(owner, repo, repository.default_branch)
    
    console.log(`📁 Repository Discovery for ${repository.full_name}:`)
    console.log(`   Total files found: ${codeFiles.length}`)
    
    // The GitHub service already filters using .gitignore, so we just need to map to artifacts
    console.log(`📋 Files that will be analyzed:`)
    codeFiles.forEach((file, index) => {
      const ext = file.path!.split('.').pop()?.toLowerCase() || ''
      const language = this.mapExtensionToLanguage(ext)
      console.log(`   ${index + 1}. ${file.path} (${language})`)
    })
    
    console.log(`   ✅ ${codeFiles.length} files will be processed`)

    const artifacts: Artifact[] = []

    for (const file of codeFiles) {
      if (!file.path || !file.sha) continue
      
      const ext = file.path.split('.').pop()?.toLowerCase() || ''
      const language = this.mapExtensionToLanguage(ext)
      
      artifacts.push({
        id: `${repository.id}-${file.sha}`,
        path: file.path,
        language,
        size: file.size || 0,
        hash: file.sha,
        type: this.determineArtifactType(file.path)
      })
    }

    return artifacts
  }

  private async extractComponents(repositoryId: string, artifacts: Artifact[]): Promise<Component[]> {
    const supabase = await createClient()
    const allComponents: Component[] = []

    console.log(`🧩 Starting component extraction from ${artifacts.length} artifacts...`)

    // Store artifacts in database (this can upsert safely)
    const artifactRecords = artifacts.map(artifact => ({
      repository_id: repositoryId,
      artifact_id: artifact.id,
      path: artifact.path,
      language: artifact.language,
      size: artifact.size,
      hash: artifact.hash,
      artifact_type: artifact.type,
      metadata: { extracted_at: new Date().toISOString() }
    }))

    await supabase.from('artifacts').upsert(artifactRecords)
    console.log(`   📦 Stored ${artifactRecords.length} artifacts in database`)

    // Extract components from each artifact
    for (const artifact of artifacts) {
      const extractor = ComponentExtractorFactory.getExtractor(artifact.language)
      if (extractor) {
        console.log(`   🔍 Extracting components from ${artifact.path} (${artifact.language})...`)
        const components = await extractor.extractComponents(artifact)
        allComponents.push(...components)
        console.log(`      Found ${components.length} components: ${components.map(c => `${c.name}(${c.type})`).join(', ')}`)
      } else {
        console.log(`   ⏭️  No extractor available for ${artifact.language} (${artifact.path})`)
      }
    }

    console.log(`🎯 Total components extracted: ${allComponents.length}`)

    // Delete existing components for this repository to ensure clean overwrite
    if (allComponents.length > 0) {
      console.log(`   🗑️  Clearing existing components for repository...`)
      const { error: deleteError } = await supabase
        .from('components')
        .delete()
        .eq('repository_id', repositoryId)

      if (deleteError) {
        console.error('Error deleting existing components:', deleteError)
      } else {
        console.log(`   ✅ Existing components cleared`)
      }

      // Insert new components (fresh insert, not upsert)
      const componentRecords = allComponents.map(component => ({
        repository_id: repositoryId,
        component_id: component.id,
        name: component.name,
        component_type: component.type,
        parent_path: component.parentPath,
        start_line: component.startLine,
        end_line: component.endLine,
        relations: component.relations,
        metadata: component.metadata
      }))

      console.log(`   💾 Inserting ${componentRecords.length} new components...`)
      const { error: insertError } = await supabase.from('components').insert(componentRecords)
      
      if (insertError) {
        console.error('Error inserting components:', insertError)
      } else {
        console.log(`   ✅ Successfully stored ${componentRecords.length} components`)
      }
    }

    return allComponents
  }

  private async createWorkPlan(
    repositoryId: string,
    components: Component[],
    sessionType: 'full' | 'incremental'
  ): Promise<WorkPlan> {
    console.log(`   📋 Creating work plan for ${components.length} components...`)
    const workPlan = await this.planner.createWorkPlan(repositoryId, components, sessionType)
    
    console.log(`   📄 Planned documents:`)
    workPlan.items.forEach((item, index) => {
      console.log(`      ${index + 1}. ${item.docPath} (${item.documentType}) - ${item.componentIds.length} components`)
    })
    
    return workPlan
  }

  private async savePlanningSession(
    sessionId: string,
    repositoryId: string,
    workPlan: WorkPlan
  ): Promise<void> {
    const supabase = await createClient()
    
    await supabase.from('planning_sessions').insert({
      id: sessionId,
      repository_id: repositoryId,
      session_type: workPlan.sessionType,
      status: 'generating',
      work_plan: workPlan,
      metadata: {
        created_at: new Date().toISOString()
      }
    })
  }

  private async executeWorkPlan(
    sessionId: string,
    repositoryId: string,
    workPlan: WorkPlan,
    allComponents: Component[],
    repository: any
  ): Promise<GenerationResult[]> {
    const results: GenerationResult[] = []
    const supabase = await createClient()

    console.log(`📝 Starting document generation for ${workPlan.items.length} planned documents...`)

    // Update session status
    await this.updateSessionProgress(sessionId, 0, workPlan.items.length)

    for (let i = 0; i < workPlan.items.length; i++) {
      const workItem = workPlan.items[i]
      
      try {
        console.log(`   📄 Generating document ${i + 1}/${workPlan.items.length}: ${workItem.docPath}`)
        
        // Check if document already exists
        const { data: existingDoc } = await supabase
          .from('documents')
          .select('id, title')
          .eq('repository_id', repositoryId)
          .eq('document_path', workItem.docPath)
          .single()

        if (existingDoc) {
          console.log(`      🔄 Document exists, will overwrite: "${existingDoc.title}"`)
        } else {
          console.log(`      ✨ Creating new document`)
        }

        // Get components for this work item
        const itemComponents = allComponents.filter(component =>
          workItem.componentIds.includes(component.id)
        )

        console.log(`      🧩 Using ${itemComponents.length} components: ${itemComponents.map(c => c.name).join(', ')}`)

        let result: GenerationResult

        if (workItem.documentType === 'overview') {
          // Generate overview document
          console.log(`      🌐 Generating overview document...`)
          result = await this.docGenerator.generateOverviewDocument(
            repository,
            allComponents.length,
            workPlan.metadata.totalFiles ? [repository.language] : []
          )
        } else {
          // Generate regular document
          console.log(`      🤖 Generating ${workItem.documentType} document...`)
          result = await this.docGenerator.generateDocument(
            repositoryId,
            workItem,
            itemComponents,
            repository
          )
        }

        if (result.success && result.document) {
          console.log(`      ✅ AI generation successful (${result.metrics.tokensOutput} tokens, $${result.metrics.costEstimated?.toFixed(4) || '0.0000'})`)
          
          // Use upsert to handle both new and existing documents
          const documentData = {
            repository_id: repositoryId,
            document_path: workItem.docPath,
            title: result.document.title,
            content: result.document.content,
            document_type: workItem.documentType,
            summary: result.document.summary,
            component_ids: workItem.componentIds,
            metadata: {
              ...workItem.metadata,
              generated_at: new Date().toISOString(),
              session_id: sessionId,
              overwritten: !!existingDoc
            }
          }

          const { data: savedDoc, error: saveError } = await supabase
            .from('documents')
            .upsert(documentData, {
              onConflict: 'repository_id,document_path',
              ignoreDuplicates: false
            })
            .select()
            .single()

          if (saveError) {
            console.error(`      ❌ Error saving document:`, saveError)
          } else if (savedDoc) {
            if (existingDoc) {
              console.log(`      🔄 Document overwritten successfully: "${savedDoc.title}"`)
            } else {
              console.log(`      💾 New document saved successfully: "${savedDoc.title}"`)
            }
            
            // Save generation metrics
            await this.docGenerator.saveGenerationMetrics(
              repositoryId,
              savedDoc.id,
              result.metrics
            )

            // Save document links
            if (result.links && result.links.length > 0) {
              console.log(`      🔗 Creating ${result.links.length} document links...`)
              await this.saveDocumentLinks(savedDoc.id, result.links, repositoryId)
            }
          }
        } else {
          console.log(`      ❌ AI generation failed: ${result.error}`)
        }

        results.push(result)

        // Update progress
        await this.updateSessionProgress(sessionId, i + 1, workPlan.items.length, workItem.docPath)

      } catch (error) {
        console.error(`❌ Error generating document for ${workItem.docPath}:`, error)
        results.push({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          metrics: {
            tokensInput: 0,
            tokensOutput: 0,
            generationTimeMs: 0,
            modelUsed: 'none'
          }
        })
      }
    }

    console.log(`📚 Document generation complete!`)
    const successfulDocs = results.filter(r => r.success).length
    const failedDocs = results.filter(r => !r.success).length
    console.log(`   ✅ ${successfulDocs} documents generated successfully`)
    if (failedDocs > 0) {
      console.log(`   ❌ ${failedDocs} documents failed to generate`)
    }

    // Mark session as completed
    await supabase
      .from('planning_sessions')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString()
      })
      .eq('id', sessionId)

    return results
  }

  private async saveDocumentLinks(
    sourceDocId: string,
    links: any[],
    repositoryId: string
  ): Promise<void> {
    const supabase = await createClient()

    // First, remove any existing links from this document to avoid conflicts
    await supabase
      .from('document_links')
      .delete()
      .eq('source_document_id', sourceDocId)

    // Find target document IDs and create new links
    const linkRecords = []
    
    for (const link of links) {
      const { data: targetDoc } = await supabase
        .from('documents')
        .select('id')
        .eq('repository_id', repositoryId)
        .eq('document_path', link.targetDocPath)
        .single()

      if (targetDoc) {
        linkRecords.push({
          source_document_id: sourceDocId,
          target_document_id: targetDoc.id,
          link_type: link.linkType
        })
      }
    }

    if (linkRecords.length > 0) {
      const { error } = await supabase.from('document_links').insert(linkRecords)
      if (error) {
        console.error(`      ⚠️  Error saving document links:`, error)
      }
    }
  }

  private async updateSessionProgress(
    sessionId: string,
    completed: number,
    total: number,
    currentItem?: string
  ): Promise<void> {
    const supabase = await createClient()
    
    await supabase
      .from('planning_sessions')
      .update({
        metadata: {
          progress: { completed, total, currentItem },
          updated_at: new Date().toISOString()
        }
      })
      .eq('id', sessionId)
  }

  private async markSessionFailed(sessionId: string, error: string): Promise<void> {
    const supabase = await createClient()
    
    await supabase
      .from('planning_sessions')
      .update({
        status: 'failed',
        error_message: error,
        completed_at: new Date().toISOString()
      })
      .eq('id', sessionId)
  }

  private generateSessionId(): string {
    return crypto.randomUUID()
  }

  private determineArtifactType(filePath: string): string {
    if (filePath.includes('test') || filePath.includes('spec')) {
      return 'test'
    }
    if (filePath.includes('config') || filePath.includes('setup')) {
      return 'config'
    }
    if (filePath.includes('README') || filePath.includes('doc')) {
      return 'documentation'
    }
    return 'source'
  }

  private mapExtensionToLanguage(ext: string): string {
    const languageMap: Record<string, string> = {
      // JavaScript/TypeScript
      'js': 'javascript',
      'jsx': 'javascript',
      'ts': 'typescript',
      'tsx': 'typescript',
      'mjs': 'javascript',
      'cjs': 'javascript',
      
      // Python
      'py': 'python',
      'pyx': 'python',
      'pyi': 'python',
      
      // Web technologies
      'html': 'html',
      'htm': 'html',
      'css': 'css',
      'scss': 'scss',
      'sass': 'sass',
      'less': 'less',
      'vue': 'vue',
      'svelte': 'svelte',
      
      // Other languages
      'java': 'java',
      'cpp': 'cpp',
      'c': 'c',
      'cs': 'csharp',
      'php': 'php',
      'rb': 'ruby',
      'go': 'go',
      'rs': 'rust',
      'swift': 'swift',
      'kt': 'kotlin',
      'scala': 'scala',
      'clj': 'clojure',
      'elm': 'elm',
      
      // Data/Config
      'json': 'json',
      'yaml': 'yaml',
      'yml': 'yaml',
      'xml': 'xml',
      'toml': 'toml',
      'ini': 'ini',
      'env': 'env',
      
      // Documentation
      'md': 'markdown',
      'mdx': 'markdown',
      'rst': 'rst',
      'txt': 'text',
      
      // Shell/Scripts
      'sh': 'shell',
      'bash': 'shell',
      'zsh': 'shell',
      'fish': 'shell',
      'ps1': 'powershell',
      'bat': 'batch',
      'cmd': 'batch',
      
      // Database
      'sql': 'sql',
      
      // Docker
      'dockerfile': 'dockerfile',
      
      // Other
      'r': 'r',
      'matlab': 'matlab',
      'm': 'matlab'
    }

    return languageMap[ext] || 'text'
  }



  // Utility methods for checking generation status
  async getSessionStatus(sessionId: string): Promise<GenerationSession | null> {
    const supabase = await createClient()
    
    const { data, error } = await supabase
      .from('planning_sessions')
      .select('*')
      .eq('id', sessionId)
      .single()

    if (error || !data) {
      return null
    }

    return {
      id: data.id,
      repositoryId: data.repository_id,
      sessionType: data.session_type,
      status: data.status,
      workPlan: data.work_plan,
      progress: data.metadata?.progress || { completed: 0, total: 0 },
      startedAt: data.started_at,
      completedAt: data.completed_at,
      error: data.error_message
    }
  }

  async getRepositoryGenerationHistory(repositoryId: string): Promise<GenerationSession[]> {
    const supabase = await createClient()
    
    const { data, error } = await supabase
      .from('planning_sessions')
      .select('*')
      .eq('repository_id', repositoryId)
      .order('started_at', { ascending: false })

    if (error || !data) {
      return []
    }

    return data.map(session => ({
      id: session.id,
      repositoryId: session.repository_id,
      sessionType: session.session_type,
      status: session.status,
      workPlan: session.work_plan,
      progress: session.metadata?.progress || { completed: 0, total: 0 },
      startedAt: session.started_at,
      completedAt: session.completed_at,
      error: session.error_message
    }))
  }
} 