// Advanced Generator Service
// Main orchestrator for the advanced AI documentation generation pipeline

import { createClient } from '@/lib/supabase/server'
import { GitHubService } from '@/lib/github'
import { ComponentExtractorFactory, Component, Artifact } from './component-extractor'
import { Planner, WorkPlan, WorkPlanItem } from './planner'
import { DocGenerator, GenerationResult } from './doc-generator'
import { ContextLoader } from './context-loader'
import crypto from 'crypto'

// Logger interface for dependency injection
export interface Logger {
  log(...args: any[]): void
  error(...args: any[]): void
}

// Default console logger
const defaultLogger: Logger = {
  log: console.log,
  error: console.error
}

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
    sessionType: 'full' | 'incremental' = 'full',
    pruneOutdated: boolean = true,
    logger: Logger = defaultLogger
  ): Promise<AdvancedGenerationResult> {
    const startTime = Date.now()
    const sessionId = this.generateSessionId()
    
    let discoveryTime = 0
    let extractionTime = 0
    let planningTime = 0
    let generationTime = 0

    logger.log(`🚀 Starting Advanced Documentation Generation`)
    logger.log(`   Session ID: ${sessionId}`)
    logger.log(`   Repository ID: ${repositoryId}`)
    logger.log(`   Session Type: ${sessionType}`)
    logger.log(`   Started at: ${new Date().toISOString()}`)

    try {
      const supabase = await createClient()

      // Get repository info
      logger.log(`📋 Loading repository information...`)
      const { data: repository, error: repoError } = await supabase
        .from('repositories')
        .select('*')
        .eq('id', repositoryId)
        .single()

      if (repoError || !repository) {
        throw new Error('Repository not found')
      }

      logger.log(`   Repository: ${repository.full_name}`)
      logger.log(`   Language: ${repository.language || 'Mixed'}`)
      logger.log(`   Branch: ${repository.default_branch}`)

      // Phase 1: Discovery
      logger.log(`\n🔍 Phase 1: Artifact Discovery`)
      const discoveryStart = Date.now()
      const artifacts = await this.discoverArtifacts(repository, githubToken, logger)
      discoveryTime = Date.now() - discoveryStart
      logger.log(`   ✅ Discovery completed in ${discoveryTime}ms`)

      // Phase 2: Component Extraction
      logger.log(`\n🧩 Phase 2: Component Extraction`)
      const extractionStart = Date.now()
      const components = await this.extractComponents(repositoryId, artifacts, githubToken, logger)
      extractionTime = Date.now() - extractionStart
      logger.log(`   ✅ Extraction completed in ${extractionTime}ms`)

      // Phase 3: Planning
      logger.log(`\n📝 Phase 3: Work Planning`)
      const planningStart = Date.now()
      const workPlan = await this.createWorkPlan(repositoryId, components, sessionType, logger)
      await this.savePlanningSession(sessionId, repositoryId, workPlan)
      planningTime = Date.now() - planningStart
      logger.log(`   ✅ Planning completed in ${planningTime}ms`)
      logger.log(`   📄 ${workPlan.items.length} documents planned for generation`)

      // Phase 4: Generation
      logger.log(`\n🤖 Phase 4: AI Document Generation`)
      const generationStart = Date.now()
      const generationResults = await this.executeWorkPlan(
        sessionId,
        repositoryId,
        workPlan,
        components,
        repository,
        pruneOutdated,
        logger
      )
      generationTime = Date.now() - generationStart
      logger.log(`   ✅ Generation completed in ${generationTime}ms`)

      // Update repository status
      logger.log(`\n💾 Updating repository status...`)
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

      logger.log(`\n🎉 Generation Complete!`)
      logger.log(`   ✅ ${successfulDocs}/${generationResults.length} documents generated successfully`)
      logger.log(`   🔗 ${totalLinks} cross-references created`)
      logger.log(`   💰 Total cost: $${totalCost.toFixed(4)}`)
      logger.log(`   ⏱️  Total time: ${totalTime}ms`)
      logger.log(`   📊 Breakdown:`)
      logger.log(`      Discovery: ${discoveryTime}ms`)
      logger.log(`      Extraction: ${extractionTime}ms`)
      logger.log(`      Planning: ${planningTime}ms`)
      logger.log(`      Generation: ${generationTime}ms`)

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
      logger.log(`\n❌ Generation Failed!`)
      logger.log(`   Error: ${error instanceof Error ? error.message : 'Unknown error'}`)
      
      // Mark session as failed
      await this.markSessionFailed(sessionId, error instanceof Error ? error.message : 'Unknown error')

      const totalTime = Date.now() - startTime
      logger.log(`   ⏱️  Failed after: ${totalTime}ms`)
      
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

  private async discoverArtifacts(repository: any, githubToken: string, logger: Logger): Promise<Artifact[]> {
    const github = new GitHubService(githubToken)
    const [owner, repo] = repository.full_name.split('/')

    // Get repository structure
    const codeFiles = await github.getCodeFiles(owner, repo, repository.default_branch)
    
    logger.log(`📁 Repository Discovery for ${repository.full_name}:`)
    logger.log(`   Total files found: ${codeFiles.length}`)
    
    // The GitHub service already filters using .gitignore, so we just need to map to artifacts
    logger.log(`📋 Files that will be analyzed:`)
    codeFiles.forEach((file, index) => {
      const ext = file.path!.split('.').pop()?.toLowerCase() || ''
      const language = this.mapExtensionToLanguage(ext)
      logger.log(`   ${index + 1}. ${file.path} (${language})`)
    })
    
    logger.log(`   ✅ ${codeFiles.length} files will be processed`)

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

  private async extractComponents(repositoryId: string, artifacts: Artifact[], githubToken: string, logger: Logger): Promise<Component[]> {
    const supabase = await createClient()
    const allComponents: Component[] = []

    logger.log(`🧩 Starting component extraction from ${artifacts.length} artifacts...`)

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
    logger.log(`   📦 Stored ${artifactRecords.length} artifacts in database`)

    // Get repository details
    const { data: repoData } = await supabase
      .from('repositories')
      .select('full_name')
      .eq('id', repositoryId)
      .single()

    if (!repoData) {
      throw new Error('Repository not found')
    }

    const [owner, repo] = repoData.full_name.split('/')
    const github = new GitHubService(githubToken)

    // Extract components from each artifact
    for (const artifact of artifacts) {
      const extractor = ComponentExtractorFactory.getExtractor(artifact.language)
      if (extractor) {
        logger.log(`   🔍 Extracting components from ${artifact.path} (${artifact.language})...`)
        
        try {
          // Fetch file content from GitHub
          logger.log(`      📄 Fetching content for ${artifact.path}...`)
          const fileData = await github.getFileContent(owner, repo, artifact.path)
          
          if (fileData && fileData.content) {
            // Add content to artifact
            const artifactWithContent: Artifact = {
              ...artifact,
              content: fileData.content
            }
            
            logger.log(`      ✅ Content loaded (${fileData.content.length} chars)`)
            const components = await extractor.extractComponents(artifactWithContent)
            allComponents.push(...components)
            logger.log(`      Found ${components.length} components: ${components.map(c => `${c.name}(${c.type})`).join(', ')}`)
          } else {
            logger.log(`      ⚠️  No content available for ${artifact.path}`)
          }
        } catch (error) {
          logger.log(`      ❌ Error fetching content for ${artifact.path}: ${error}`)
        }
      } else {
        logger.log(`   ⏭️  No extractor available for ${artifact.language} (${artifact.path})`)
      }
    }

    logger.log(`🎯 Total components extracted: ${allComponents.length}`)

    // Delete existing components for this repository to ensure clean overwrite
    if (allComponents.length > 0) {
      logger.log(`   🗑️  Clearing existing components for repository...`)
      const { error: deleteError } = await supabase
        .from('components')
        .delete()
        .eq('repository_id', repositoryId)

      if (deleteError) {
        console.error('Error deleting existing components:', deleteError)
      } else {
        logger.log(`   ✅ Existing components cleared`)
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

      logger.log(`   💾 Inserting ${componentRecords.length} new components...`)
      const { error: insertError } = await supabase.from('components').insert(componentRecords)
      
      if (insertError) {
        console.error('Error inserting components:', insertError)
      } else {
        logger.log(`   ✅ Successfully stored ${componentRecords.length} components`)
      }
    }

    return allComponents
  }

  private async createWorkPlan(
    repositoryId: string,
    components: Component[],
    sessionType: 'full' | 'incremental',
    logger: Logger
  ): Promise<WorkPlan> {
    logger.log(`   📋 Creating work plan for ${components.length} components...`)
    const workPlan = await this.planner.createWorkPlan(repositoryId, components, sessionType)
    
    logger.log(`   📄 Planned documents:`)
    workPlan.items.forEach((item, index) => {
      logger.log(`      ${index + 1}. ${item.docPath} (${item.documentType}) - ${item.componentIds.length} components`)
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
    repository: any,
    pruneOutdated: boolean,
    logger: Logger
  ): Promise<GenerationResult[]> {
    const results: GenerationResult[] = []
    const supabase = await createClient()

    logger.log(`📝 Starting document generation for ${workPlan.items.length} planned documents...`)

    // Prune outdated documents before generating new ones (if enabled)
    if (pruneOutdated) {
      await this.pruneOutdatedDocuments(repositoryId, workPlan, logger)
    } else {
      logger.log(`   ⏭️  Skipping document pruning (disabled)`)
    }

    // Update session status
    await this.updateSessionProgress(sessionId, 0, workPlan.items.length)

    for (let i = 0; i < workPlan.items.length; i++) {
      const workItem = workPlan.items[i]
      
      try {
        logger.log(`   📄 Generating document ${i + 1}/${workPlan.items.length}: ${workItem.docPath}`)
        
        // Check if document already exists
        const { data: existingDoc } = await supabase
          .from('documents')
          .select('id, title')
          .eq('repository_id', repositoryId)
          .eq('document_path', workItem.docPath)
          .single()

        if (existingDoc) {
          logger.log(`      🔄 Document exists, will overwrite: "${existingDoc.title}"`)
        } else {
          logger.log(`      ✨ Creating new document`)
        }

        // Get components for this work item
        const itemComponents = allComponents.filter(component =>
          workItem.componentIds.includes(component.id)
        )

        logger.log(`      🧩 Using ${itemComponents.length} components: ${itemComponents.map(c => c.name).join(', ')}`)

        let result: GenerationResult

        if (workItem.documentType === 'overview') {
          // Generate overview document
          logger.log(`      🌐 Generating overview document...`)
          result = await this.docGenerator.generateOverviewDocument(
            repository,
            allComponents.length,
            workPlan.metadata.totalFiles ? [repository.language] : []
          )
        } else {
          // Generate regular document
          logger.log(`      🤖 Generating ${workItem.documentType} document...`)
          result = await this.docGenerator.generateDocument(
            repositoryId,
            workItem,
            itemComponents,
            repository
          )
        }

        if (result.success && result.document) {
          logger.log(`      ✅ AI generation successful (${result.metrics.tokensOutput} tokens, $${result.metrics.costEstimated?.toFixed(4) || '0.0000'})`)
          
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
              logger.log(`      🔄 Document overwritten successfully: "${savedDoc.title}"`)
            } else {
              logger.log(`      💾 New document saved successfully: "${savedDoc.title}"`)
            }
            
            // Save generation metrics
            await this.docGenerator.saveGenerationMetrics(
              repositoryId,
              savedDoc.id,
              result.metrics
            )

            // Save document links
            if (result.links && result.links.length > 0) {
              logger.log(`      🔗 Creating ${result.links.length} document links...`)
              await this.saveDocumentLinks(savedDoc.id, result.links, repositoryId)
            }
          }
        } else {
          logger.log(`      ❌ AI generation failed: ${result.error}`)
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

    logger.log(`📚 Document generation complete!`)
    const successfulDocs = results.filter(r => r.success).length
    const failedDocs = results.filter(r => !r.success).length
    logger.log(`   ✅ ${successfulDocs} documents generated successfully`)
    if (failedDocs > 0) {
      logger.log(`   ❌ ${failedDocs} documents failed to generate`)
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

  private async pruneOutdatedDocuments(
    repositoryId: string,
    workPlan: WorkPlan,
    logger: Logger
  ): Promise<void> {
    const supabase = await createClient()
    
    try {
      logger.log(`🧹 Pruning outdated documents...`)
      
      // Get all existing documents for this repository
      const { data: existingDocs, error: fetchError } = await supabase
        .from('documents')
        .select('id, document_path, title, document_type')
        .eq('repository_id', repositoryId)
      
      if (fetchError) {
        logger.log(`   ⚠️  Error fetching existing documents: ${fetchError.message}`)
        return
      }
      
      if (!existingDocs || existingDocs.length === 0) {
        logger.log(`   ✅ No existing documents to prune`)
        return
      }
      
      // Get the set of document paths that will be generated/updated
      const plannedDocPaths = new Set(workPlan.items.map(item => item.docPath))
      
      // Find documents that are no longer in the work plan
      const outdatedDocs = existingDocs.filter(doc => !plannedDocPaths.has(doc.document_path))
      
      if (outdatedDocs.length === 0) {
        logger.log(`   ✅ No outdated documents found`)
        return
      }
      
      logger.log(`   🗑️  Found ${outdatedDocs.length} outdated documents to remove:`)
      outdatedDocs.forEach(doc => {
        logger.log(`      - ${doc.document_path} ("${doc.title}")`)
      })
      
      // Delete outdated documents and their associated data
      const outdatedDocIds = outdatedDocs.map(doc => doc.id)
      
      // Delete document links first (foreign key constraints)
      const { error: linksError } = await supabase
        .from('document_links')
        .delete()
        .or(`source_document_id.in.(${outdatedDocIds.join(',')}),target_document_id.in.(${outdatedDocIds.join(',')})`)
      
      if (linksError) {
        logger.log(`   ⚠️  Warning: Error deleting document links: ${linksError.message}`)
      }
      
      // Delete generation metrics
      const { error: metricsError } = await supabase
        .from('generation_metrics')
        .delete()
        .in('document_id', outdatedDocIds)
      
      if (metricsError) {
        logger.log(`   ⚠️  Warning: Error deleting generation metrics: ${metricsError.message}`)
      }
      
      // Finally, delete the documents themselves
      const { error: deleteError } = await supabase
        .from('documents')
        .delete()
        .in('id', outdatedDocIds)
      
      if (deleteError) {
        logger.log(`   ❌ Error deleting outdated documents: ${deleteError.message}`)
        return
      }
      
      logger.log(`   ✅ Successfully pruned ${outdatedDocs.length} outdated documents`)
      
    } catch (error) {
      logger.log(`   ❌ Error during document pruning: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
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
      'pyw': 'python',
      
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