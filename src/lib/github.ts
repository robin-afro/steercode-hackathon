import { Octokit } from '@octokit/rest'

export class GitHubService {
  private octokit: Octokit

  constructor(accessToken: string) {
    this.octokit = new Octokit({
      auth: accessToken,
      userAgent: 'Lookas-App'
    })
  }

  async getRepositoryContents(owner: string, repo: string, path = '') {
    try {
      const { data } = await this.octokit.rest.repos.getContent({
        owner,
        repo,
        path
      })
      return data
    } catch (error) {
      console.error('Error getting repository contents:', error)
      throw error
    }
  }

  async getFileContent(owner: string, repo: string, path: string) {
    try {
      const { data } = await this.octokit.rest.repos.getContent({
        owner,
        repo,
        path
      })
      
      if (Array.isArray(data)) {
        throw new Error('Path is a directory, not a file')
      }
      
      if (data.type === 'file' && data.content) {
        // Decode base64 content
        const content = Buffer.from(data.content, 'base64').toString('utf-8')
        return {
          content,
          sha: data.sha,
          size: data.size,
          name: data.name,
          path: data.path
        }
      }
      
      throw new Error('File content not available')
    } catch (error) {
      console.error('Error getting file content:', error)
      throw error
    }
  }

  async getRepositoryTree(owner: string, repo: string, branch = 'main') {
    try {
      const { data } = await this.octokit.rest.git.getTree({
        owner,
        repo,
        tree_sha: branch,
        recursive: 'true'
      })
      return data.tree
    } catch (error) {
      console.error('Error getting repository tree:', error)
      throw error
    }
  }

  async getRepositoryInfo(owner: string, repo: string) {
    try {
      const { data } = await this.octokit.rest.repos.get({
        owner,
        repo
      })
      return data
    } catch (error) {
      console.error('Error getting repository info:', error)
      throw error
    }
  }

  // Get all code files from a repository
  async getCodeFiles(owner: string, repo: string, branch = 'main') {
    try {
      const tree = await this.getRepositoryTree(owner, repo, branch)
      
      // Filter for code files
      const codeExtensions = [
        '.js', '.jsx', '.ts', '.tsx', '.py', '.java', '.cpp', '.c', '.cs',
        '.php', '.rb', '.go', '.rs', '.kt', '.swift', '.scala', '.clj',
        '.html', '.css', '.scss', '.sass', '.vue', '.svelte', '.md', '.json',
        '.yaml', '.yml', '.xml', '.sql', '.sh', '.bash', '.dockerfile'
      ]
      
      const codeFiles = tree.filter(item => 
        item.type === 'blob' && 
        item.path && 
        codeExtensions.some(ext => item.path!.toLowerCase().endsWith(ext)) &&
        !item.path.includes('node_modules/') &&
        !item.path.includes('.git/') &&
        !item.path.includes('dist/') &&
        !item.path.includes('build/')
      )
      
      return codeFiles
    } catch (error) {
      console.error('Error getting code files:', error)
      throw error
    }
  }
} 