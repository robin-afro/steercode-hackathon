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
      name: 'File-based Strategy',
      maxComponentsPerDoc: 10,
      maxTokensPerDoc: 3000,
      groupingRules: [
        { type: 'file', weight: 0.6, parameters: { mergeSmallFiles: true } },
        { type: 'component_type', weight: 0.2, parameters: { separateByType: true } },
        { type: 'size', weight: 0.2, parameters: { minComponentsPerDoc: 2 } }
      ]
    }],
    ['component-based', {
      name: 'Component-based Strategy',
      maxComponentsPerDoc: 8,
      maxTokensPerDoc: 3500,
      groupingRules: [
        { type: 'component_type', weight: 0.4, parameters: { separateClasses: true, separateServices: true } },
        { type: 'namespace', weight: 0.3, parameters: { groupRelated: true } },
        { type: 'complexity', weight: 0.2, parameters: { separateComplex: true } },
        { type: 'size', weight: 0.1, parameters: { minComponentsPerDoc: 1 } }
      ]
    }]
  ])

  async createWorkPlan(
    repositoryId: string,
    components: Component[],
    sessionType: 'full' | 'incremental' = 'full',
    strategyName: string = 'component-based'  // Changed default to component-based
  ): Promise<WorkPlan> {
    const strategy = this.strategies.get(strategyName) || this.strategies.get('component-based')!
    
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
    // Check if this is component-based strategy
    if (strategy.name === 'Component-based Strategy') {
      return this.groupComponentsLogically(components, strategy)
    }
    
    // Fall back to file-based grouping for other strategies
    return this.groupComponentsByFile(components, strategy)
  }

  private async groupComponentsLogically(
    components: Component[],
    strategy: PlanningStrategy
  ): Promise<ComponentGroup[]> {
    const groups: ComponentGroup[] = []
    const processedComponents = new Set<string>()

    // 1. Create separate documents for major classes
    const classes = components.filter(c => c.type === 'class' && !processedComponents.has(c.id))
    for (const classComponent of classes) {
      // Find related components (methods, nested classes, etc.)
      const relatedComponents = this.findRelatedComponents(classComponent, components)
      
      const docPath = this.generateLogicalDocPath(classComponent)
      const title = this.generateComponentTitle(classComponent)
      
      groups.push({
        id: classComponent.id,
        docPath,
        title,
        components: [classComponent, ...relatedComponents],
        documentType: 'class',
        metadata: {
          primaryComponent: classComponent.name,
          componentType: classComponent.type,
          groupingRule: 'class-based',
          sourceFile: classComponent.parentPath
        }
      })

      // Mark components as processed
      processedComponents.add(classComponent.id)
      relatedComponents.forEach(c => processedComponents.add(c.id))
    }

    // 2. Create documents for services and major standalone functions
    const services = components.filter(c => 
      (c.type === 'function' && this.isServiceFunction(c)) && 
      !processedComponents.has(c.id)
    )
    
    for (const service of services) {
      const relatedComponents = this.findRelatedComponents(service, components)
      
      const docPath = this.generateLogicalDocPath(service)
      const title = this.generateComponentTitle(service)
      
      groups.push({
        id: service.id,
        docPath,
        title,
        components: [service, ...relatedComponents],
        documentType: 'service',
        metadata: {
          primaryComponent: service.name,
          componentType: service.type,
          groupingRule: 'service-based',
          sourceFile: service.parentPath
        }
      })

      processedComponents.add(service.id)
      relatedComponents.forEach(c => processedComponents.add(c.id))
    }

    // 3. Group remaining components by file/module with logical naming
    const remainingComponents = components.filter(c => !processedComponents.has(c.id))
    const fileGroups = this.groupRemainingComponentsByFile(remainingComponents)
    
    for (const [filePath, fileComponents] of fileGroups) {
      if (fileComponents.length === 0) continue
      
      // Use the most significant component for naming
      const primaryComponent = this.findPrimaryComponent(fileComponents)
      const docPath = primaryComponent 
        ? this.generateLogicalDocPath(primaryComponent, filePath)
        : filePath.replace(/\//g, '.').replace(/\.[^.]+$/, '')
      const title = this.generateModuleTitle(fileComponents, filePath)
      
      groups.push({
        id: filePath,
        docPath,
        title,
        components: fileComponents,
        documentType: this.inferDocumentType(fileComponents),
        metadata: {
          primaryComponent: primaryComponent?.name,
          groupingRule: 'module-based',
          sourceFile: filePath,
          componentTypes: [...new Set(fileComponents.map(c => c.type))]
        }
      })
    }

    return groups
  }

  private groupComponentsByFile(
    components: Component[],
    strategy: PlanningStrategy
  ): Promise<ComponentGroup[]> {
    // Original file-based grouping logic
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

    return Promise.resolve(groups)
  }

  private findRelatedComponents(primaryComponent: Component, allComponents: Component[]): Component[] {
    const related: Component[] = []
    
    // Find components in the same file that might be related
    const sameFileComponents = allComponents.filter(c => 
      c.parentPath === primaryComponent.parentPath && 
      c.id !== primaryComponent.id
    )

    for (const component of sameFileComponents) {
      // Include methods that are likely part of this class (based on indentation or naming)
      if (component.type === 'function' && 
          component.metadata?.indentationLevel > 0 && 
          this.isComponentRelated(primaryComponent, component)) {
        related.push(component)
      }
      
      // Include constants/variables that might be related
      if (component.type === 'constant' && 
          this.isComponentRelated(primaryComponent, component)) {
        related.push(component)
      }
    }

    return related
  }

  private isComponentRelated(primary: Component, candidate: Component): boolean {
    // Check if components are related based on naming patterns, indentation, etc.
    const primaryName = primary.name.toLowerCase()
    const candidateName = candidate.name.toLowerCase()
    
    // Same naming prefix
    if (candidateName.includes(primaryName) || primaryName.includes(candidateName)) {
      return true
    }
    
    // For Python: check if method is indented (likely belongs to class)
    if (primary.type === 'class' && candidate.type === 'function') {
      const primaryLine = primary.startLine || 0
      const candidateLine = candidate.startLine || 0
      const candidateIndent = candidate.metadata?.indentationLevel || 0
      
      // If function comes after class and is indented, it's likely a method
      if (candidateLine > primaryLine && candidateIndent > 0) {
        return true
      }
    }
    
    return false
  }

  private isServiceFunction(component: Component): boolean {
    // Identify service-like functions based on naming patterns and complexity
    const name = component.name.toLowerCase()
    const servicePatterns = [
      'service', 'manager', 'handler', 'controller', 'client', 'api', 'generator', 
      'processor', 'validator', 'helper', 'utils', 'factory', 'builder'
    ]
    
    // Check if name contains service patterns
    if (servicePatterns.some(pattern => name.includes(pattern))) {
      return true
    }
    
    // Check if it's a substantial function (not a simple utility)
    const hasMultipleRelations = (component.relations?.length || 0) >= 3
    const isExported = component.metadata?.isExported || false
    const isLargeFunction = ((component.endLine || 0) - (component.startLine || 0)) > 10
    
    return (hasMultipleRelations || isLargeFunction) && isExported
  }

  private groupRemainingComponentsByFile(components: Component[]): Map<string, Component[]> {
    const fileMap = new Map<string, Component[]>()
    
    for (const component of components) {
      if (!fileMap.has(component.parentPath)) {
        fileMap.set(component.parentPath, [])
      }
      fileMap.get(component.parentPath)!.push(component)
    }
    
    return fileMap
  }

  private findPrimaryComponent(components: Component[]): Component | null {
    // Find the most significant component for naming purposes
    
    // Prefer classes
    const classes = components.filter(c => c.type === 'class')
    if (classes.length > 0) {
      return classes[0]
    }
    
    // Then services/major functions
    const services = components.filter(c => c.type === 'function' && this.isServiceFunction(c))
    if (services.length > 0) {
      return services[0]
    }
    
    // Then exported functions
    const exported = components.filter(c => c.metadata?.isExported)
    if (exported.length > 0) {
      return exported[0]
    }
    
    // Finally, just the first component
    return components[0] || null
  }

  private generateLogicalDocPath(component: Component, fallbackPath?: string): string {
    // Generate document path based on component name rather than file path
    let baseName = component.name
    
    // Remove special characters and convert to doc path format
    baseName = baseName.replace(/^[@_]+|[@_]+$/g, '') // Remove leading/trailing @ and _
    baseName = baseName.replace(/[^a-zA-Z0-9]/g, '_') // Replace special chars with _
    baseName = baseName.toLowerCase()
    
    // If it's too short or generic, use file context
    if (baseName.length < 3 || ['main', 'app', 'index', 'init'].includes(baseName)) {
      if (fallbackPath) {
        const fileName = fallbackPath.split('/').pop()?.replace(/\.[^.]+$/, '') || 'module'
        return `${fileName}_${baseName}`
      }
    }
    
    return baseName
  }

  private generateComponentTitle(component: Component): string {
    // Generate human-readable title based on component
    const name = component.name.replace(/^[@_]+|[@_]+$/g, '') // Remove decorators and underscores
    const type = component.type.charAt(0).toUpperCase() + component.type.slice(1)
    
    // Convert camelCase/snake_case to Title Case
    const titleName = name
      .replace(/([A-Z])/g, ' $1') // Add space before uppercase
      .replace(/[_-]/g, ' ') // Replace underscores and hyphens with spaces
      .replace(/\s+/g, ' ') // Normalize multiple spaces
      .trim()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ')
    
    return `${titleName} ${type}`
  }

  private generateModuleTitle(components: Component[], filePath: string): string {
    // Generate title for module-based documents
    const fileName = filePath.split('/').pop()?.replace(/\.[^.]+$/, '') || 'Module'
    
    // Check if there's a dominant component type
    const types = components.map(c => c.type)
    const typeCounts = types.reduce((acc, type) => {
      acc[type] = (acc[type] || 0) + 1
      return acc
    }, {} as Record<string, number>)
    
    const dominantType = Object.entries(typeCounts)
      .sort(([,a], [,b]) => b - a)[0]?.[0]
    
    const titleName = fileName
      .split(/[-_.]/)
      .map(part => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ')
    
    if (dominantType && dominantType !== 'function') {
      const typeLabel = dominantType.charAt(0).toUpperCase() + dominantType.slice(1)
      return `${titleName} ${typeLabel}s`
    }
    
    return `${titleName} Module`
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