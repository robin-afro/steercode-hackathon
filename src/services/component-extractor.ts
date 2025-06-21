// Component Extractor Service
// Analyzes code files and extracts logical components (classes, functions, etc.)

export interface Component {
  id: string
  name: string
  type: ComponentType
  parentPath: string
  startLine?: number
  endLine?: number
  relations: ComponentRelation[]
  metadata: Record<string, any>
}

export interface ComponentRelation {
  type: RelationType
  target: string
  confidence: number
}

export type ComponentType = 
  | 'class' 
  | 'function' 
  | 'hook' 
  | 'component' 
  | 'service' 
  | 'type' 
  | 'interface'
  | 'constant'
  | 'variable'
  | 'export'

export type RelationType = 
  | 'imports' 
  | 'uses' 
  | 'extends' 
  | 'implements' 
  | 'calls' 
  | 'composes'
  | 'exposes'
  | 'depends_on'

export interface Artifact {
  id: string
  path: string
  language: string
  size: number
  hash: string
  type: string
  content?: string
}

export abstract class ComponentExtractor {
  abstract language: string
  abstract supportedExtensions: string[]
  
  abstract extractComponents(artifact: Artifact): Promise<Component[]>
  
  protected generateComponentId(name: string, type: ComponentType, parentPath: string): string {
    return `${parentPath}.${type}.${name}`.toLowerCase()
  }
  
  protected detectImports(content: string): ComponentRelation[] {
    // Default implementation - override in language-specific extractors
    return []
  }
  
  protected detectExports(content: string): Component[] {
    // Default implementation - override in language-specific extractors
    return []
  }
}

// TypeScript/JavaScript Component Extractor
export class TypeScriptExtractor extends ComponentExtractor {
  language = 'typescript'
  supportedExtensions = ['.ts', '.tsx', '.js', '.jsx']
  
  async extractComponents(artifact: Artifact): Promise<Component[]> {
    if (!artifact.content) return []
    
    const components: Component[] = []
    const content = artifact.content
    const lines = content.split('\n')
    
    // Extract imports
    const imports = this.detectImports(content)
    
    // Extract classes
    components.push(...this.extractClasses(content, artifact.path, lines))
    
    // Extract functions
    components.push(...this.extractFunctions(content, artifact.path, lines))
    
    // Extract React components
    components.push(...this.extractReactComponents(content, artifact.path, lines))
    
    // Extract hooks
    components.push(...this.extractHooks(content, artifact.path, lines))
    
    // Extract types and interfaces
    components.push(...this.extractTypes(content, artifact.path, lines))
    
    // Extract exports
    components.push(...this.extractExports(content, artifact.path, lines))
    
    // Add import relations to all components
    components.forEach(component => {
      component.relations.push(...imports)
    })
    
    return components
  }
  
  private extractClasses(content: string, filePath: string, lines: string[]): Component[] {
    const components: Component[] = []
    const classRegex = /(?:export\s+)?(?:abstract\s+)?class\s+(\w+)(?:\s+extends\s+(\w+))?(?:\s+implements\s+([\w,\s]+))?/g
    
    let match
    while ((match = classRegex.exec(content)) !== null) {
      const [fullMatch, className, extendsClass, implementsClasses] = match
      const startLine = content.substring(0, match.index).split('\n').length
      
      const relations: ComponentRelation[] = []
      
      if (extendsClass) {
        relations.push({
          type: 'extends',
          target: extendsClass,
          confidence: 0.9
        })
      }
      
      if (implementsClasses) {
        implementsClasses.split(',').forEach(impl => {
          relations.push({
            type: 'implements',
            target: impl.trim(),
            confidence: 0.9
          })
        })
      }
      
      components.push({
        id: this.generateComponentId(className, 'class', filePath),
        name: className,
        type: 'class',
        parentPath: filePath,
        startLine,
        endLine: this.findClassEndLine(content, match.index),
        relations,
        metadata: {
          isExported: fullMatch.includes('export'),
          isAbstract: fullMatch.includes('abstract'),
          extendsClass,
          implementsClasses: implementsClasses?.split(',').map(s => s.trim())
        }
      })
    }
    
    return components
  }
  
  private extractFunctions(content: string, filePath: string, lines: string[]): Component[] {
    const components: Component[] = []
    const functionRegex = /(?:export\s+)?(?:async\s+)?function\s+(\w+)\s*\(/g
    const arrowFunctionRegex = /(?:export\s+)?(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s+)?\([^)]*\)\s*=>/g
    
    // Regular functions
    let match
    while ((match = functionRegex.exec(content)) !== null) {
      const [fullMatch, functionName] = match
      const startLine = content.substring(0, match.index).split('\n').length
      
      components.push({
        id: this.generateComponentId(functionName, 'function', filePath),
        name: functionName,
        type: 'function',
        parentPath: filePath,
        startLine,
        endLine: this.findFunctionEndLine(content, match.index),
        relations: this.findFunctionCalls(content, match.index),
        metadata: {
          isExported: fullMatch.includes('export'),
          isAsync: fullMatch.includes('async')
        }
      })
    }
    
    // Arrow functions
    while ((match = arrowFunctionRegex.exec(content)) !== null) {
      const [fullMatch, functionName] = match
      const startLine = content.substring(0, match.index).split('\n').length
      
      components.push({
        id: this.generateComponentId(functionName, 'function', filePath),
        name: functionName,
        type: 'function',
        parentPath: filePath,
        startLine,
        endLine: this.findFunctionEndLine(content, match.index),
        relations: this.findFunctionCalls(content, match.index),
        metadata: {
          isExported: fullMatch.includes('export'),
          isAsync: fullMatch.includes('async'),
          isArrowFunction: true
        }
      })
    }
    
    return components
  }
  
  private extractReactComponents(content: string, filePath: string, lines: string[]): Component[] {
    const components: Component[] = []
    
    // React function components
    const componentRegex = /(?:export\s+)?(?:const|function)\s+([A-Z]\w+)\s*[=:]\s*(?:\([^)]*\)\s*)?(?:=>\s*)?{/g
    
    let match
    while ((match = componentRegex.exec(content)) !== null) {
      const [fullMatch, componentName] = match
      const startLine = content.substring(0, match.index).split('\n').length
      
      // Check if it looks like a React component (starts with capital letter, uses JSX)
      if (componentName[0] === componentName[0].toUpperCase()) {
        const componentContent = this.extractComponentContent(content, match.index)
        const usesJSX = /<[A-Z]/.test(componentContent) || /return\s*\(/.test(componentContent)
        
        if (usesJSX) {
          components.push({
            id: this.generateComponentId(componentName, 'component', filePath),
            name: componentName,
            type: 'component',
            parentPath: filePath,
            startLine,
            endLine: this.findFunctionEndLine(content, match.index),
            relations: this.findHookUsage(componentContent),
            metadata: {
              isExported: fullMatch.includes('export'),
              framework: 'react'
            }
          })
        }
      }
    }
    
    return components
  }
  
  private extractHooks(content: string, filePath: string, lines: string[]): Component[] {
    const components: Component[] = []
    const hookRegex = /(?:export\s+)?(?:const|function)\s+(use[A-Z]\w+)/g
    
    let match
    while ((match = hookRegex.exec(content)) !== null) {
      const [fullMatch, hookName] = match
      const startLine = content.substring(0, match.index).split('\n').length
      
      components.push({
        id: this.generateComponentId(hookName, 'hook', filePath),
        name: hookName,
        type: 'hook',
        parentPath: filePath,
        startLine,
        endLine: this.findFunctionEndLine(content, match.index),
        relations: this.findHookUsage(content.substring(match.index)),
        metadata: {
          isExported: fullMatch.includes('export'),
          framework: 'react'
        }
      })
    }
    
    return components
  }
  
  private extractTypes(content: string, filePath: string, lines: string[]): Component[] {
    const components: Component[] = []
    
    // Interfaces
    const interfaceRegex = /(?:export\s+)?interface\s+(\w+)(?:\s+extends\s+([\w,\s]+))?/g
    let match
    while ((match = interfaceRegex.exec(content)) !== null) {
      const [fullMatch, interfaceName, extendsInterfaces] = match
      const startLine = content.substring(0, match.index).split('\n').length
      
      const relations: ComponentRelation[] = []
      if (extendsInterfaces) {
        extendsInterfaces.split(',').forEach(ext => {
          relations.push({
            type: 'extends',
            target: ext.trim(),
            confidence: 0.9
          })
        })
      }
      
      components.push({
        id: this.generateComponentId(interfaceName, 'interface', filePath),
        name: interfaceName,
        type: 'interface',
        parentPath: filePath,
        startLine,
        endLine: this.findBlockEndLine(content, match.index),
        relations,
        metadata: {
          isExported: fullMatch.includes('export'),
          extendsInterfaces: extendsInterfaces?.split(',').map(s => s.trim())
        }
      })
    }
    
    // Type aliases
    const typeRegex = /(?:export\s+)?type\s+(\w+)\s*=/g
    while ((match = typeRegex.exec(content)) !== null) {
      const [fullMatch, typeName] = match
      const startLine = content.substring(0, match.index).split('\n').length
      
      components.push({
        id: this.generateComponentId(typeName, 'type', filePath),
        name: typeName,
        type: 'type',
        parentPath: filePath,
        startLine,
        endLine: startLine,
        relations: [],
        metadata: {
          isExported: fullMatch.includes('export')
        }
      })
    }
    
    return components
  }
  
  private extractExports(content: string, filePath: string, lines: string[]): Component[] {
    const components: Component[] = []
    
    // Named exports
    const namedExportRegex = /export\s*{\s*([^}]+)\s*}/g
    let match
    while ((match = namedExportRegex.exec(content)) !== null) {
      const exports = match[1].split(',').map(exp => exp.trim())
      const startLine = content.substring(0, match.index).split('\n').length
      
      exports.forEach(exportName => {
        const cleanName = exportName.replace(/\s+as\s+\w+/, '').trim()
        components.push({
          id: this.generateComponentId(cleanName, 'export', filePath),
          name: cleanName,
          type: 'export',
          parentPath: filePath,
          startLine,
          endLine: startLine,
          relations: [],
          metadata: {
            exportType: 'named',
            alias: exportName.includes(' as ') ? exportName.split(' as ')[1].trim() : undefined
          }
        })
      })
    }
    
    // Default exports
    const defaultExportRegex = /export\s+default\s+(\w+)/g
    while ((match = defaultExportRegex.exec(content)) !== null) {
      const [, exportName] = match
      const startLine = content.substring(0, match.index).split('\n').length
      
      components.push({
        id: this.generateComponentId(exportName, 'export', filePath),
        name: exportName,
        type: 'export',
        parentPath: filePath,
        startLine,
        endLine: startLine,
        relations: [],
        metadata: {
          exportType: 'default'
        }
      })
    }
    
    return components
  }
  
  protected detectImports(content: string): ComponentRelation[] {
    const relations: ComponentRelation[] = []
    const importRegex = /import\s+(?:{([^}]+)}|(\w+))\s+from\s+['"]([^'"]+)['"]/g
    
    let match
    while ((match = importRegex.exec(content)) !== null) {
      const [, namedImports, defaultImport, modulePath] = match
      
      if (namedImports) {
        namedImports.split(',').forEach(imp => {
          const importName = imp.trim().replace(/\s+as\s+\w+/, '')
          relations.push({
            type: 'imports',
            target: `${modulePath}.${importName}`,
            confidence: 0.95
          })
        })
      }
      
      if (defaultImport) {
        relations.push({
          type: 'imports',
          target: `${modulePath}.${defaultImport}`,
          confidence: 0.95
        })
      }
    }
    
    return relations
  }
  
  private findClassEndLine(content: string, startIndex: number): number {
    return this.findBlockEndLine(content, startIndex)
  }
  
  private findFunctionEndLine(content: string, startIndex: number): number {
    return this.findBlockEndLine(content, startIndex)
  }
  
  private findBlockEndLine(content: string, startIndex: number): number {
    let braceCount = 0
    let inBlock = false
    
    for (let i = startIndex; i < content.length; i++) {
      const char = content[i]
      
      if (char === '{') {
        braceCount++
        inBlock = true
      } else if (char === '}') {
        braceCount--
        if (inBlock && braceCount === 0) {
          return content.substring(0, i).split('\n').length
        }
      }
    }
    
    return content.substring(0, startIndex).split('\n').length
  }
  
  private findFunctionCalls(content: string, startIndex: number): ComponentRelation[] {
    const relations: ComponentRelation[] = []
    const functionCallRegex = /(\w+)\s*\(/g
    const blockContent = this.extractComponentContent(content, startIndex)
    
    let match
    while ((match = functionCallRegex.exec(blockContent)) !== null) {
      const [, functionName] = match
      if (functionName && !['if', 'for', 'while', 'switch', 'catch'].includes(functionName)) {
        relations.push({
          type: 'calls',
          target: functionName,
          confidence: 0.8
        })
      }
    }
    
    return relations
  }
  
  private findHookUsage(content: string): ComponentRelation[] {
    const relations: ComponentRelation[] = []
    const hookRegex = /(use[A-Z]\w*)\s*\(/g
    
    let match
    while ((match = hookRegex.exec(content)) !== null) {
      const [, hookName] = match
      relations.push({
        type: 'uses',
        target: hookName,
        confidence: 0.9
      })
    }
    
    return relations
  }
  
  private extractComponentContent(content: string, startIndex: number): string {
    let braceCount = 0
    let start = -1
    let end = content.length
    
    for (let i = startIndex; i < content.length; i++) {
      const char = content[i]
      
      if (char === '{') {
        if (start === -1) start = i
        braceCount++
      } else if (char === '}') {
        braceCount--
        if (braceCount === 0) {
          end = i
          break
        }
      }
    }
    
    return start !== -1 ? content.substring(start, end + 1) : ''
  }
}

// Factory for creating language-specific extractors
export class ComponentExtractorFactory {
  private static extractors = new Map<string, ComponentExtractor>([
    ['typescript', new TypeScriptExtractor()],
    ['javascript', new TypeScriptExtractor()], // TypeScript extractor handles JS too
  ])
  
  static getExtractor(language: string): ComponentExtractor | null {
    return this.extractors.get(language) || null
  }
  
  static getSupportedLanguages(): string[] {
    return Array.from(this.extractors.keys())
  }
  
  static registerExtractor(language: string, extractor: ComponentExtractor): void {
    this.extractors.set(language, extractor)
  }
} 