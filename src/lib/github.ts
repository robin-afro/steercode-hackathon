import { Octokit } from '@octokit/rest'
import { createIgnoreChecker } from './ignore-patterns'

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
    } catch (error: any) {
      if (error.status === 404) {
        throw new Error(`Repository ${owner}/${repo} not found or not accessible. This may be a private repository that requires additional permissions.`)
      } else if (error.status === 403) {
        throw new Error(`Access denied to ${owner}/${repo}. Your GitHub token may lack the required 'repo' scope for private repositories.`)
      }
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
    } catch (error: any) {
      // Handle 404 errors gracefully - file doesn't exist
      if (error.status === 404) {
        return null
      }
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
    } catch (error: any) {
      if (error.status === 404) {
        throw new Error(`Repository ${owner}/${repo} or branch '${branch}' not found. This may be a private repository that requires additional permissions.`)
      } else if (error.status === 403) {
        throw new Error(`Access denied to ${owner}/${repo}. Your GitHub token may lack the required 'repo' scope for private repositories.`)
      }
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
      
      // Create ignore checker by reading .gitignore from the repository
      const ignoreChecker = await createIgnoreChecker(async (path: string) => {
        try {
          const fileContent = await this.getFileContent(owner, repo, path)
          return fileContent ? fileContent.content : null
        } catch (error) {
          return null // File doesn't exist
        }
      })
      
      // Filter out files using ignore patterns
      const codeFiles = tree.filter(item => 
        item.type === 'blob' && 
        item.path && 
        !ignoreChecker.isIgnored(item.path)
      )
      
      return codeFiles
    } catch (error) {
      console.error('Error getting code files:', error)
      throw error
    }
  }
} 