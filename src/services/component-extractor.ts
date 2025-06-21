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

// Python Component Extractor
export class PythonExtractor extends ComponentExtractor {
  language = 'python'
  supportedExtensions = ['.py', '.pyw']
  
  async extractComponents(artifact: Artifact): Promise<Component[]> {
    if (!artifact.content) return []
    
    const components: Component[] = []
    const content = artifact.content
    const lines = content.split('\n')
    
    // Extract imports
    const imports = this.detectImports(content)
    
    // Extract classes
    components.push(...this.extractClasses(content, artifact.path, lines))
    
    // Extract functions (including methods)
    components.push(...this.extractFunctions(content, artifact.path, lines))
    
    // Extract decorators
    components.push(...this.extractDecorators(content, artifact.path, lines))
    
    // Extract variables and constants
    components.push(...this.extractVariables(content, artifact.path, lines))
    
    // Add import relations to all components
    components.forEach(component => {
      component.relations.push(...imports)
    })
    
    return components
  }
  
  private extractClasses(content: string, filePath: string, lines: string[]): Component[] {
    const components: Component[] = []
    const classRegex = /^(\s*)class\s+(\w+)(?:\(([^)]+)\))?:/gm
    
    let match
    while ((match = classRegex.exec(content)) !== null) {
      const [fullMatch, indentation, className, parentClasses] = match
      const startLine = content.substring(0, match.index).split('\n').length
      
      const relations: ComponentRelation[] = []
      
      if (parentClasses) {
        parentClasses.split(',').forEach(parent => {
          const parentName = parent.trim()
          if (parentName) {
            relations.push({
              type: 'extends',
              target: parentName,
              confidence: 0.9
            })
          }
        })
      }
      
      // Find decorators for this class
      const decorators = this.findDecoratorsBeforeLine(content, match.index)
      
      components.push({
        id: this.generateComponentId(className, 'class', filePath),
        name: className,
        type: 'class',
        parentPath: filePath,
        startLine,
        endLine: this.findClassEndLine(content, match.index, indentation.length),
        relations,
        metadata: {
          parentClasses: parentClasses?.split(',').map(s => s.trim()).filter(Boolean),
          decorators,
          indentationLevel: indentation.length
        }
              })
      }
      
      return components
  }
  
  private extractFunctions(content: string, filePath: string, lines: string[]): Component[] {
    const components: Component[] = []
    const functionRegex = /^(\s*)(?:async\s+)?def\s+(\w+)\s*\([^)]*\):/gm
    
    let match
    while ((match = functionRegex.exec(content)) !== null) {
      const [fullMatch, indentation, functionName] = match
      const startLine = content.substring(0, match.index).split('\n').length
      
      // Determine if it's a method (inside a class) or standalone function
      const isMethod = indentation.length > 0
      const isPrivate = functionName.startsWith('_')
      const isSpecial = functionName.startsWith('__') && functionName.endsWith('__')
      
      // Find decorators for this function
      const decorators = this.findDecoratorsBeforeLine(content, match.index)
      
      const componentType = isMethod ? 'function' : 'function'
      
      components.push({
        id: this.generateComponentId(functionName, componentType, filePath),
        name: functionName,
        type: componentType,
        parentPath: filePath,
        startLine,
        endLine: this.findFunctionEndLine(content, match.index, indentation.length),
        relations: this.findFunctionCalls(content, match.index),
        metadata: {
          isMethod,
          isPrivate,
          isSpecial,
          isAsync: fullMatch.includes('async'),
          decorators,
          indentationLevel: indentation.length
        }
      })
    }
    
    return components
  }
  
  private extractDecorators(content: string, filePath: string, lines: string[]): Component[] {
    const components: Component[] = []
    const decoratorRegex = /^(\s*)@(\w+)(?:\([^)]*\))?$/gm
    
    let match
    while ((match = decoratorRegex.exec(content)) !== null) {
      const [fullMatch, indentation, decoratorName] = match
      const startLine = content.substring(0, match.index).split('\n').length
      
      components.push({
        id: this.generateComponentId(decoratorName, 'constant', filePath),
        name: `@${decoratorName}`,
        type: 'constant',
        parentPath: filePath,
        startLine,
        endLine: startLine,
        relations: [],
        metadata: {
          isDecorator: true,
          decoratorName,
          indentationLevel: indentation.length
        }
      })
    }
    
    return components
  }
  
  private extractVariables(content: string, filePath: string, lines: string[]): Component[] {
    const components: Component[] = []
    // Match variable assignments at module level (no indentation) or class level
    const variableRegex = /^(\s*)([A-Z_][A-Z0-9_]*)\s*[:=]/gm
    
    let match
    while ((match = variableRegex.exec(content)) !== null) {
      const [fullMatch, indentation, variableName] = match
      const startLine = content.substring(0, match.index).split('\n').length
      
      // Only capture constants (all caps) or class attributes
      if (variableName === variableName.toUpperCase()) {
        components.push({
          id: this.generateComponentId(variableName, 'constant', filePath),
          name: variableName,
          type: 'constant',
          parentPath: filePath,
          startLine,
          endLine: startLine,
          relations: [],
          metadata: {
            isConstant: true,
            indentationLevel: indentation.length
          }
        })
      }
    }
    
    return components
  }
  
  protected detectImports(content: string): ComponentRelation[] {
    const relations: ComponentRelation[] = []
    
    // Standard imports: import module
    const standardImportRegex = /^import\s+(\w+(?:\.\w+)*)(?:\s+as\s+(\w+))?$/gm
    let match
    while ((match = standardImportRegex.exec(content)) !== null) {
      const [, modulePath, alias] = match
      relations.push({
        type: 'imports',
        target: alias || modulePath,
        confidence: 0.95
      })
    }
    
    // From imports: from module import name1, name2
    const fromImportRegex = /^from\s+([\w.]+)\s+import\s+(.+)$/gm
    while ((match = fromImportRegex.exec(content)) !== null) {
      const [, modulePath, imports] = match
      
      // Handle different import formats
      if (imports.includes('(')) {
        // Multi-line imports with parentheses
        const multiLineMatch = content.match(new RegExp(`from\\s+${modulePath.replace('.', '\\.')}\\s+import\\s+\\([^)]+\\)`, 's'))
        if (multiLineMatch) {
          const importList = multiLineMatch[0].replace(/from\s+[\w.]+\s+import\s+\(|\)/g, '')
          this.parseImportList(importList, modulePath, relations)
        }
      } else {
        this.parseImportList(imports, modulePath, relations)
      }
    }
    
    return relations
  }
  
  private parseImportList(imports: string, modulePath: string, relations: ComponentRelation[]): void {
    imports.split(',').forEach(imp => {
      const trimmed = imp.trim()
      if (trimmed) {
        const asMatch = trimmed.match(/(\w+)(?:\s+as\s+(\w+))?/)
        if (asMatch) {
          const [, importName, alias] = asMatch
          relations.push({
            type: 'imports',
            target: `${modulePath}.${alias || importName}`,
            confidence: 0.95
          })
        }
      }
    })
  }
  
  private findDecoratorsBeforeLine(content: string, startIndex: number): string[] {
    const decorators: string[] = []
    const beforeContent = content.substring(0, startIndex)
    const lines = beforeContent.split('\n')
    
    // Look backwards for decorators
    for (let i = lines.length - 1; i >= 0; i--) {
      const line = lines[i].trim()
      if (line.startsWith('@')) {
        decorators.unshift(line)
      } else if (line && !line.startsWith('#')) {
        // Stop if we hit a non-decorator, non-comment line
        break
      }
    }
    
    return decorators
  }
  
  private findClassEndLine(content: string, startIndex: number, indentationLevel: number): number {
    const lines = content.substring(startIndex).split('\n')
    
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i]
      if (line.trim() === '') continue // Skip empty lines
      
      const currentIndentation = line.length - line.trimStart().length
      if (currentIndentation <= indentationLevel && line.trim()) {
        return content.substring(0, startIndex).split('\n').length + i - 1
      }
    }
    
    return content.split('\n').length
  }
  
  private findFunctionEndLine(content: string, startIndex: number, indentationLevel: number): number {
    const lines = content.substring(startIndex).split('\n')
    
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i]
      if (line.trim() === '') continue // Skip empty lines
      
      const currentIndentation = line.length - line.trimStart().length
      if (currentIndentation <= indentationLevel && line.trim()) {
        return content.substring(0, startIndex).split('\n').length + i - 1
      }
    }
    
    return content.split('\n').length
  }
  
  private findFunctionCalls(content: string, startIndex: number): ComponentRelation[] {
    const relations: ComponentRelation[] = []
    const functionContent = this.extractFunctionContent(content, startIndex)
    
    // Find function calls: function_name(
    const functionCallRegex = /(\w+)\s*\(/g
    let match
    while ((match = functionCallRegex.exec(functionContent)) !== null) {
      const [, functionName] = match
      // Skip common Python keywords and built-ins
      if (!['if', 'for', 'while', 'with', 'try', 'except', 'print', 'len', 'str', 'int', 'float', 'bool', 'list', 'dict', 'tuple', 'set'].includes(functionName)) {
        relations.push({
          type: 'calls',
          target: functionName,
          confidence: 0.8
        })
      }
    }
    
    // Find method calls: object.method(
    const methodCallRegex = /(\w+)\.(\w+)\s*\(/g
    while ((match = methodCallRegex.exec(functionContent)) !== null) {
      const [, objectName, methodName] = match
      relations.push({
        type: 'uses',
        target: `${objectName}.${methodName}`,
        confidence: 0.8
      })
    }
    
    return relations
  }
  
  private extractFunctionContent(content: string, startIndex: number): string {
    const lines = content.substring(startIndex).split('\n')
    if (lines.length === 0) return ''
    
    const firstLine = lines[0]
    const baseIndentation = firstLine.length - firstLine.trimStart().length
    
    let functionContent = firstLine + '\n'
    
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i]
      if (line.trim() === '') {
        functionContent += line + '\n'
        continue
      }
      
      const currentIndentation = line.length - line.trimStart().length
      if (currentIndentation <= baseIndentation && line.trim()) {
        break
      }
      
      functionContent += line + '\n'
    }
    
    return functionContent
  }
}

// Factory for creating language-specific extractors
export class ComponentExtractorFactory {
  private static extractors = new Map<string, ComponentExtractor>([
    ['typescript', new TypeScriptExtractor()],
    ['javascript', new TypeScriptExtractor()], // TypeScript extractor handles JS too
    ['python', new PythonExtractor()],
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