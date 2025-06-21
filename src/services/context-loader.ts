// Context Loader Service
// Manages AI context windows for documentation generation

import { createClient } from '@/lib/supabase/server'
import crypto from 'crypto'

export interface ContextWindow {
  documents: ContextDocument[]
  totalTokens: number
  metadata: {
    repositoryId: string
    cacheKey: string
    loadedAt: string
    strategy: string
  }
}

export interface ContextDocument {
  id: string
  title: string
  documentPath: string
  summary: string
  documentType: string
  relevanceScore?: number
}

export interface ContextConfig {
  maxTokens: number
  maxDocuments: number
  strategy: 'recent' | 'relevant' | 'mixed'
  includeOverview: boolean
  cacheExpiryHours: number
}

export class ContextLoader {
  private readonly defaultConfig: ContextConfig = {
    maxTokens: 8000,
    maxDocuments: 50,
    strategy: 'mixed',
    includeOverview: true,
    cacheExpiryHours: 24
  }

  async loadContextWindow(
    repositoryId: string,
    targetDocPath?: string,
    config: Partial<ContextConfig> = {}
  ): Promise<ContextWindow> {
    const finalConfig = { ...this.defaultConfig, ...config }
    const cacheKey = this.generateCacheKey(repositoryId, targetDocPath, finalConfig)

    // Try to load from cache first
    const cachedContext = await this.loadFromCache(repositoryId, cacheKey)
    if (cachedContext) {
      return cachedContext
    }

    // Load context from database
    const context = await this.buildContextWindow(repositoryId, targetDocPath, finalConfig)
    
    // Cache the result
    await this.saveToCache(repositoryId, cacheKey, context, finalConfig.cacheExpiryHours)
    
    return context
  }

  private async buildContextWindow(
    repositoryId: string,
    targetDocPath: string | undefined,
    config: ContextConfig
  ): Promise<ContextWindow> {
    const supabase = await createClient()
    
    // Load existing documents with summaries
    const { data: documents, error } = await supabase
      .from('documents')
      .select('id, title, document_path, summary, document_type, created_at, updated_at')
      .eq('repository_id', repositoryId)
      .order('updated_at', { ascending: false })
      .limit(config.maxDocuments * 2) // Get more than needed for filtering

    if (error) {
      throw new Error(`Failed to load documents: ${error.message}`)
    }

    if (!documents || documents.length === 0) {
      return this.createEmptyContext(repositoryId, targetDocPath, config)
    }

    // Filter and score documents
    const contextDocs = await this.selectContextDocuments(
      documents,
      targetDocPath,
      config
    )

    // Calculate total tokens (rough estimation)
    const totalTokens = contextDocs.reduce((total, doc) => {
      return total + this.estimateTokens(doc.title + ' ' + (doc.summary || ''))
    }, 0)

    return {
      documents: contextDocs.slice(0, config.maxDocuments),
      totalTokens,
      metadata: {
        repositoryId,
        cacheKey: this.generateCacheKey(repositoryId, targetDocPath, config),
        loadedAt: new Date().toISOString(),
        strategy: config.strategy
      }
    }
  }

  private async selectContextDocuments(
    documents: any[],
    targetDocPath: string | undefined,
    config: ContextConfig
  ): Promise<ContextDocument[]> {
    const contextDocs: ContextDocument[] = []
    
    // Always include overview if requested and available
    if (config.includeOverview) {
      const overview = documents.find(doc => doc.document_type === 'overview')
      if (overview) {
        contextDocs.push({
          id: overview.id,
          title: overview.title,
          documentPath: overview.document_path,
          summary: overview.summary || 'Project overview document',
          documentType: overview.document_type,
          relevanceScore: 1.0
        })
      }
    }

    // Select documents based on strategy
    switch (config.strategy) {
      case 'recent':
        contextDocs.push(...this.selectRecentDocuments(documents, config.maxDocuments - contextDocs.length))
        break
      case 'relevant':
        contextDocs.push(...this.selectRelevantDocuments(documents, targetDocPath, config.maxDocuments - contextDocs.length))
        break
      case 'mixed':
      default:
        contextDocs.push(...this.selectMixedDocuments(documents, targetDocPath, config.maxDocuments - contextDocs.length))
        break
    }

    return contextDocs
  }

  private selectRecentDocuments(documents: any[], maxCount: number): ContextDocument[] {
    return documents
      .filter(doc => doc.document_type !== 'overview') // Already included
      .slice(0, maxCount)
      .map(doc => ({
        id: doc.id,
        title: doc.title,
        documentPath: doc.document_path,
        summary: doc.summary || this.generateFallbackSummary(doc.title),
        documentType: doc.document_type,
        relevanceScore: 0.8
      }))
  }

  private selectRelevantDocuments(documents: any[], targetDocPath: string | undefined, maxCount: number): ContextDocument[] {
    if (!targetDocPath) {
      return this.selectRecentDocuments(documents, maxCount)
    }

    const scored = documents
      .filter(doc => doc.document_type !== 'overview')
      .map(doc => ({
        ...doc,
        relevanceScore: this.calculateRelevanceScore(doc.document_path, targetDocPath)
      }))
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .slice(0, maxCount)

    return scored.map(doc => ({
      id: doc.id,
      title: doc.title,
      documentPath: doc.document_path,
      summary: doc.summary || this.generateFallbackSummary(doc.title),
      documentType: doc.document_type,
      relevanceScore: doc.relevanceScore
    }))
  }

  private selectMixedDocuments(documents: any[], targetDocPath: string | undefined, maxCount: number): ContextDocument[] {
    const recentCount = Math.ceil(maxCount * 0.6)
    const relevantCount = maxCount - recentCount

    const recent = this.selectRecentDocuments(documents, recentCount)
    const relevant = this.selectRelevantDocuments(documents, targetDocPath, relevantCount)

    // Merge and deduplicate
    const merged = new Map<string, ContextDocument>()
    
    for (const doc of [...recent, ...relevant]) {
      merged.set(doc.id, doc)
    }

    return Array.from(merged.values()).slice(0, maxCount)
  }

  private calculateRelevanceScore(docPath: string, targetPath: string): number {
    const docParts = docPath.split('.')
    const targetParts = targetPath.split('.')
    
    // Calculate common prefix length
    let commonLength = 0
    for (let i = 0; i < Math.min(docParts.length, targetParts.length); i++) {
      if (docParts[i] === targetParts[i]) {
        commonLength++
      } else {
        break
      }
    }

    // Score based on common prefix and path similarity
    const prefixScore = commonLength / Math.max(docParts.length, targetParts.length)
    const lengthPenalty = Math.abs(docParts.length - targetParts.length) * 0.1
    
    return Math.max(0, prefixScore - lengthPenalty)
  }

  private async loadFromCache(repositoryId: string, cacheKey: string): Promise<ContextWindow | null> {
    try {
      const supabase = await createClient()
      
      const { data, error } = await supabase
        .from('context_cache')
        .select('context_data, created_at')
        .eq('repository_id', repositoryId)
        .eq('cache_key', cacheKey)
        .gt('expires_at', new Date().toISOString())
        .single()

      if (error || !data) {
        return null
      }

      return data.context_data as ContextWindow
    } catch (error) {
      console.warn('Failed to load context from cache:', error)
      return null
    }
  }

  private async saveToCache(
    repositoryId: string,
    cacheKey: string,
    context: ContextWindow,
    expiryHours: number
  ): Promise<void> {
    try {
      const supabase = await createClient()
      const expiresAt = new Date(Date.now() + expiryHours * 60 * 60 * 1000)

      await supabase
        .from('context_cache')
        .upsert({
          repository_id: repositoryId,
          cache_key: cacheKey,
          context_data: context,
          expires_at: expiresAt.toISOString()
        })
    } catch (error) {
      console.warn('Failed to save context to cache:', error)
      // Don't throw - caching is optional
    }
  }

  private generateCacheKey(
    repositoryId: string,
    targetDocPath: string | undefined,
    config: ContextConfig
  ): string {
    const keyData = {
      repositoryId,
      targetDocPath: targetDocPath || 'none',
      strategy: config.strategy,
      maxTokens: config.maxTokens,
      maxDocuments: config.maxDocuments
    }
    
    return crypto
      .createHash('md5')
      .update(JSON.stringify(keyData))
      .digest('hex')
  }

  private createEmptyContext(
    repositoryId: string,
    targetDocPath: string | undefined,
    config: ContextConfig
  ): ContextWindow {
    return {
      documents: [],
      totalTokens: 0,
      metadata: {
        repositoryId,
        cacheKey: this.generateCacheKey(repositoryId, targetDocPath, config),
        loadedAt: new Date().toISOString(),
        strategy: config.strategy
      }
    }
  }

  private estimateTokens(text: string): number {
    // Rough estimation: ~4 characters per token
    return Math.ceil(text.length / 4)
  }

  private generateFallbackSummary(title: string): string {
    return `Documentation for ${title}`
  }

  async clearExpiredCache(): Promise<void> {
    try {
      const supabase = await createClient()
      
      await supabase
        .from('context_cache')
        .delete()
        .lt('expires_at', new Date().toISOString())
    } catch (error) {
      console.warn('Failed to clear expired cache:', error)
    }
  }

  async clearCacheForRepository(repositoryId: string): Promise<void> {
    try {
      const supabase = await createClient()
      
      await supabase
        .from('context_cache')
        .delete()
        .eq('repository_id', repositoryId)
    } catch (error) {
      console.warn('Failed to clear repository cache:', error)
    }
  }
} 