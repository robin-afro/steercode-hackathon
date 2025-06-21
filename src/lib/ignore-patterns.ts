// Utility for handling file ignore patterns
// Reads .gitignore and provides fallback patterns

export interface IgnoreChecker {
  isIgnored(filePath: string): boolean
}

export class GitIgnoreChecker implements IgnoreChecker {
  private patterns: string[] = []
  private ignoredExtensions = new Set([
    // Binary files that should never be analyzed
    'png', 'jpg', 'jpeg', 'gif', 'bmp', 'svg', 'ico', 'webp', 'tiff', 'tif',
    'mp4', 'avi', 'mov', 'wmv', 'flv', 'webm', 'mkv', '3gp',
    'mp3', 'wav', 'flac', 'aac', 'ogg', 'wma', 'm4a',
    'zip', 'rar', '7z', 'tar', 'gz', 'bz2', 'xz', 'dmg', 'iso',
    'exe', 'dll', 'so', 'dylib', 'app', 'deb', 'rpm', 'msi',
    'ttf', 'otf', 'woff', 'woff2', 'eot',
    'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'pdf',
    'class', 'jar', 'war', 'ear', 'pyc', 'pyo', 'o', 'obj', 'lib', 'a',
    'tmp', 'temp', 'bak', 'swp', 'swo', '~',
    'iml', 'ipr', 'iws',
    'bin', 'dat', 'db', 'sqlite', 'sqlite3'
  ])

  constructor(gitignoreContent?: string) {
    if (gitignoreContent) {
      this.parseGitignore(gitignoreContent)
    } else {
      this.loadFallbackPatterns()
    }
  }

  private parseGitignore(content: string): void {
    const lines = content.split('\n')
    this.patterns = lines
      .map(line => line.trim())
      .filter(line => line && !line.startsWith('#'))
      .map(line => {
        // Convert gitignore patterns to our format
        if (line.startsWith('/')) {
          return line.slice(1) // Remove leading slash
        }
        return line
      })
  }

  private loadFallbackPatterns(): void {
    // Minimal fallback patterns for essential ignores
    this.patterns = [
      'node_modules/',
      '.git/',
      'dist/',
      'build/',
      '__pycache__/',
      '.DS_Store',
      'Thumbs.db'
    ]
  }

  isIgnored(filePath: string): boolean {
    // Always ignore binary file extensions
    const ext = filePath.split('.').pop()?.toLowerCase() || ''
    if (this.ignoredExtensions.has(ext)) {
      return true
    }

    // Check against gitignore patterns
    return this.patterns.some(pattern => this.matchesPattern(filePath, pattern))
  }

  private matchesPattern(filePath: string, pattern: string): boolean {
    // Handle directory patterns
    if (pattern.endsWith('/')) {
      return filePath.includes(pattern) || filePath.startsWith(pattern.slice(0, -1) + '/')
    }

    // Handle glob patterns
    if (pattern.includes('*')) {
      const regex = new RegExp(
        '^' + pattern.replace(/\*/g, '.*').replace(/\?/g, '.') + '$'
      )
      return regex.test(filePath) || regex.test(filePath.split('/').pop() || '')
    }

    // Handle negation patterns (!)
    if (pattern.startsWith('!')) {
      // This is a negation pattern - would need more complex logic
      // For now, we'll skip these
      return false
    }

    // Exact match or contains
    return filePath === pattern || 
           filePath.includes(pattern) || 
           filePath.endsWith('/' + pattern) ||
           filePath.split('/').pop() === pattern
  }
}

export async function createIgnoreChecker(
  getFileContent: (path: string) => Promise<string | null>
): Promise<IgnoreChecker> {
  try {
    const gitignoreContent = await getFileContent('.gitignore')
    return new GitIgnoreChecker(gitignoreContent || undefined)
  } catch {
    console.log('No .gitignore found, using fallback patterns')
    return new GitIgnoreChecker()
  }
} 