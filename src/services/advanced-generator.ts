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

    try {
      const supabase = await createClient()

      // Get repository info
      const { data: repository, error: repoError } = await supabase
        .from('repositories')
        .select('*')
        .eq('id', repositoryId)
        .single()

      if (repoError || !repository) {
        throw new Error('Repository not found')
      }

      // Phase 1: Discovery
      const discoveryStart = Date.now()
      const artifacts = await this.discoverArtifacts(repository, githubToken)
      discoveryTime = Date.now() - discoveryStart

      // Phase 2: Component Extraction
      const extractionStart = Date.now()
      const components = await this.extractComponents(repositoryId, artifacts)
      extractionTime = Date.now() - extractionStart

      // Phase 3: Planning
      const planningStart = Date.now()
      const workPlan = await this.createWorkPlan(repositoryId, components, sessionType)
      await this.savePlanningSession(sessionId, repositoryId, workPlan)
      planningTime = Date.now() - planningStart

      // Phase 4: Generation
      const generationStart = Date.now()
      const generationResults = await this.executeWorkPlan(
        sessionId,
        repositoryId,
        workPlan,
        components,
        repository
      )
      generationTime = Date.now() - generationStart

      // Update repository status
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

      return {
        success: true,
        documentsGenerated: generationResults.filter(r => r.success).length,
        linksCreated: generationResults.reduce((sum, result) => 
          sum + (result.links?.length || 0), 0
        ),
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
      // Mark session as failed
      await this.markSessionFailed(sessionId, error instanceof Error ? error.message : 'Unknown error')

      const totalTime = Date.now() - startTime
      
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
    
    const artifacts: Artifact[] = []
    
    for (const file of codeFiles) {
      const fileContent = await github.getFileContent(owner, repo, file.path!)
      
      // Determine language from file extension
      const ext = file.path!.split('.').pop()?.toLowerCase() || ''
      const language = this.mapExtensionToLanguage(ext)
      
      // Create content hash for change detection
      const hash = crypto.createHash('md5').update(fileContent.content).digest('hex')
      
      artifacts.push({
        id: file.path!,
        path: file.path!,
        language,
        size: fileContent.size,
        hash,
        type: 'file',
        content: fileContent.content
      })
    }

    return artifacts
  }

  private async extractComponents(repositoryId: string, artifacts: Artifact[]): Promise<Component[]> {
    const supabase = await createClient()
    const allComponents: Component[] = []

    // Store artifacts in database
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

    // Extract components from each artifact
    for (const artifact of artifacts) {
      const extractor = ComponentExtractorFactory.getExtractor(artifact.language)
      if (extractor) {
        const components = await extractor.extractComponents(artifact)
        allComponents.push(...components)
      }
    }

    // Store components in database
    if (allComponents.length > 0) {
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

      await supabase.from('components').upsert(componentRecords)
    }

    return allComponents
  }

  private async createWorkPlan(
    repositoryId: string,
    components: Component[],
    sessionType: 'full' | 'incremental'
  ): Promise<WorkPlan> {
    return await this.planner.createWorkPlan(repositoryId, components, sessionType)
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

    // Update session status
    await this.updateSessionProgress(sessionId, 0, workPlan.items.length)

    for (let i = 0; i < workPlan.items.length; i++) {
      const workItem = workPlan.items[i]
      
      try {
        // Get components for this work item
        const itemComponents = allComponents.filter(component =>
          workItem.componentIds.includes(component.id)
        )

        let result: GenerationResult

        if (workItem.documentType === 'overview') {
          // Generate overview document
          result = await this.docGenerator.generateOverviewDocument(
            repository,
            allComponents.length,
            workPlan.metadata.totalFiles ? [repository.language] : []
          )
        } else {
          // Generate regular document
          result = await this.docGenerator.generateDocument(
            repositoryId,
            workItem,
            itemComponents,
            repository
          )
        }

        if (result.success && result.document) {
          // Save document to database
          const { data: savedDoc, error: saveError } = await supabase
            .from('documents')
            .insert({
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
                session_id: sessionId
              }
            })
            .select()
            .single()

          if (saveError) {
            console.error('Error saving document:', saveError)
          } else if (savedDoc) {
            // Save generation metrics
            await this.docGenerator.saveGenerationMetrics(
              repositoryId,
              savedDoc.id,
              result.metrics
            )

            // Save document links
            if (result.links && result.links.length > 0) {
              await this.saveDocumentLinks(savedDoc.id, result.links, repositoryId)
            }
          }
        }

        results.push(result)

        // Update progress
        await this.updateSessionProgress(sessionId, i + 1, workPlan.items.length, workItem.docPath)

      } catch (error) {
        console.error(`Error generating document for ${workItem.docPath}:`, error)
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

    // Find target document IDs
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
      await supabase.from('document_links').upsert(linkRecords)
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

  private mapExtensionToLanguage(ext: string): string {
    const mapping: Record<string, string> = {
      'ts': 'typescript',
      'tsx': 'typescript',
      'js': 'javascript',
      'jsx': 'javascript',
      'py': 'python',
      'java': 'java',
      'cpp': 'cpp',
      'c': 'c',
      'cs': 'csharp',
      'php': 'php',
      'rb': 'ruby',
      'go': 'go',
      'rs': 'rust'
    }
    return mapping[ext] || 'unknown'
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