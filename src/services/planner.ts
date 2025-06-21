// Planner Service
// Determines how to group components into logical documents

import { Component, ComponentType } from './component-extractor'

export interface WorkPlanItem {
  docPath: string
  title: string
  componentIds: string[]
  documentType: DocumentType
  priority: number
  estimatedTokens: number
  metadata: Record<string, any>
}

export interface WorkPlan {
  repositoryId: string
  sessionType: 'full' | 'incremental'
  items: WorkPlanItem[]
  totalEstimatedTokens: number
  metadata: {
    totalComponents: number
    totalFiles: number
    planningStrategy: string
    createdAt: string
  }
}

export type DocumentType = 
  | 'overview' 
  | 'module' 
  | 'class' 
  | 'service' 
  | 'component' 
  | 'system' 
  | 'workflow'

export interface PlanningStrategy {
  name: string
  maxComponentsPerDoc: number
  maxTokensPerDoc: number
  groupingRules: GroupingRule[]
}

export interface GroupingRule {
  type: 'namespace' | 'file' | 'component_type' | 'size' | 'complexity'
  weight: number
  parameters: Record<string, any>
}

interface ComponentGroup {
  id: string
  docPath: string
  title: string
  components: Component[]
  documentType: DocumentType
  metadata: Record<string, any>
}

export class Planner {
  private readonly strategies: Map<string, PlanningStrategy> = new Map([
    ['default', {
      name: 'Default Strategy',
      maxComponentsPerDoc: 10,
      maxTokensPerDoc: 3000,
      groupingRules: [
        { type: 'namespace', weight: 0.4, parameters: { maxDepth: 3 } },
        { type: 'file', weight: 0.3, parameters: { mergeSmallFiles: true } },
        { type: 'component_type', weight: 0.2, parameters: { separateByType: true } },
        { type: 'size', weight: 0.1, parameters: { minComponentsPerDoc: 2 } }
      ]
    }]
  ])

  async createWorkPlan(
    repositoryId: string,
    components: Component[],
    sessionType: 'full' | 'incremental' = 'full',
    strategyName: string = 'default'
  ): Promise<WorkPlan> {
    const strategy = this.strategies.get(strategyName) || this.strategies.get('default')!
    
    // Group components according to strategy
    const groupedComponents = await this.groupComponents(components, strategy)
    
    // Create work plan items
    const items: WorkPlanItem[] = []
    
    // Always create an overview document first
    items.push({
      docPath: 'overview',
      title: 'Project Overview',
      componentIds: [],
      documentType: 'overview',
      priority: 1,
      estimatedTokens: 500,
      metadata: {
        isOverview: true,
        totalFiles: this.getUniqueFiles(components).length,
        totalComponents: components.length,
        mainLanguages: this.getMainLanguages(components)
      }
    })

    // Create documents for each group
    for (const group of groupedComponents) {
      const item = await this.createWorkPlanItem(group, strategy)
      items.push(item)
    }

    // Sort by priority and namespace depth
    items.sort((a, b) => {
      if (a.priority !== b.priority) return a.priority - b.priority
      return a.docPath.split('.').length - b.docPath.split('.').length
    })

    const totalEstimatedTokens = items.reduce((sum, item) => sum + item.estimatedTokens, 0)

    return {
      repositoryId,
      sessionType,
      items,
      totalEstimatedTokens,
      metadata: {
        totalComponents: components.length,
        totalFiles: this.getUniqueFiles(components).length,
        planningStrategy: strategy.name,
        createdAt: new Date().toISOString()
      }
    }
  }

  private async groupComponents(
    components: Component[],
    strategy: PlanningStrategy
  ): Promise<ComponentGroup[]> {
    // Group components by file path initially
    const fileMap = new Map<string, Component[]>()
    
    for (const component of components) {
      if (!fileMap.has(component.parentPath)) {
        fileMap.set(component.parentPath, [])
      }
      fileMap.get(component.parentPath)!.push(component)
    }

    const groups: ComponentGroup[] = []
    for (const [filePath, fileComponents] of fileMap) {
      const docPath = filePath.replace(/\//g, '.').replace(/\.[^.]+$/, '')
      groups.push({
        id: filePath,
        docPath,
        title: this.generateTitleFromPath(filePath),
        components: fileComponents,
        documentType: this.inferDocumentType(fileComponents),
        metadata: {
          filePath,
          groupingRule: 'file'
        }
      })
    }

    return groups
  }

  private async createWorkPlanItem(
    group: ComponentGroup,
    strategy: PlanningStrategy
  ): Promise<WorkPlanItem> {
    const estimatedTokens = this.estimateTokens(group.components)
    const priority = this.calculatePriority(group)

    return {
      docPath: group.docPath,
      title: group.title,
      componentIds: group.components.map(c => c.id),
      documentType: group.documentType,
      priority,
      estimatedTokens,
      metadata: {
        ...group.metadata,
        componentCount: group.components.length,
        componentTypes: [...new Set(group.components.map(c => c.type))],
        hasExports: group.components.some(c => c.type === 'export'),
        complexity: this.calculateComplexity(group.components)
      }
    }
  }

  private generateTitleFromPath(filePath: string): string {
    const fileName = filePath.split('/').pop()?.replace(/\.[^.]+$/, '') || 'Unknown'
    return fileName
      .split(/[-_.]/)
      .map(part => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ')
  }

  private inferDocumentType(components: Component[]): DocumentType {
    const types = components.map(c => c.type)
    
    if (types.includes('class')) return 'class'
    if (types.includes('component')) return 'component'
    if (types.includes('service')) return 'service'
    if (types.includes('hook')) return 'component'
    
    return 'module'
  }

  private estimateTokens(components: Component[]): number {
    // Rough estimation: 50 tokens per component + 20 per relation
    return components.reduce((total, component) => {
      return total + 50 + (component.relations.length * 20)
    }, 200) // Base tokens for document structure
  }

  private calculatePriority(group: ComponentGroup): number {
    let priority = 5 // Default priority
    
    // Higher priority for exports and main components
    if (group.components.some(c => c.type === 'export')) priority -= 1
    if (group.components.some(c => c.metadata.isExported)) priority -= 1
    
    // Lower priority for utilities and small groups
    if (group.components.length < 3) priority += 1
    if (group.docPath.includes('util')) priority += 1
    
    return Math.max(1, Math.min(10, priority))
  }

  private calculateComplexity(components: Component[]): number {
    return components.reduce((total, component) => {
      return total + component.relations.length + (component.endLine || 0) - (component.startLine || 0)
    }, 0)
  }

  private getUniqueFiles(components: Component[]): string[] {
    return [...new Set(components.map(c => c.parentPath))]
  }

  private getMainLanguages(components: Component[]): string[] {
    const languageCounts = new Map<string, number>()
    
    for (const component of components) {
      // Infer language from file extension
      const ext = component.parentPath.split('.').pop()?.toLowerCase()
      const language = this.mapExtensionToLanguage(ext || '')
      
      languageCounts.set(language, (languageCounts.get(language) || 0) + 1)
    }

    return Array.from(languageCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([lang]) => lang)
  }

  private mapExtensionToLanguage(ext: string): string {
    const mapping: Record<string, string> = {
      'ts': 'TypeScript',
      'tsx': 'TypeScript',
      'js': 'JavaScript',
      'jsx': 'JavaScript',
      'py': 'Python',
      'java': 'Java'
    }
    return mapping[ext] || 'Unknown'
  }

  getStrategy(name: string): PlanningStrategy | undefined {
    return this.strategies.get(name)
  }

  getAllStrategies(): PlanningStrategy[] {
    return Array.from(this.strategies.values())
  }
} 