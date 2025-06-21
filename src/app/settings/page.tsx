'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Github, Plus, Trash2, RefreshCw } from 'lucide-react'
import Link from 'next/link'

export default function SettingsPage() {
  const [repositories, setRepositories] = useState<any[]>([])
  const [availableRepos, setAvailableRepos] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingGithub, setLoadingGithub] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    loadRepositories()
  }, [])

  const loadRepositories = async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    
    if (user) {
      // Ensure user record exists
      await supabase
        .from('users')
        .upsert({
          id: user.id,
          email: user.email || '',
          github_username: user.user_metadata?.user_name || user.user_metadata?.preferred_username,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'id'
        })

      const { data: repos } = await supabase
        .from('repositories')
        .select('*')
        .eq('user_id', user.id)
      
      if (repos) {
        setRepositories(repos)
      }
    }
    setLoading(false)
  }

  const loadAvailableRepositories = async () => {
    setLoadingGithub(true)
    try {
      const response = await fetch('/api/github/repositories')
      if (response.ok) {
        const data = await response.json()
        setAvailableRepos(data.repositories || [])
      } else {
        console.error('Failed to load repositories from GitHub')
      }
    } catch (error) {
      console.error('Error loading GitHub repositories:', error)
    }
    setLoadingGithub(false)
  }

  const importRepository = async (repoData: any) => {
    try {
      const response = await fetch('/api/github/import-repository', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repositoryData: repoData })
      })
      
      if (response.ok) {
        await loadRepositories()
        await loadAvailableRepositories() // Refresh to remove imported repo
        console.log('Repository imported successfully')
      } else {
        const error = await response.json()
        alert(`Error: ${error.error}`)
      }
    } catch (error) {
      console.error('Error importing repository:', error)
    }
  }

  const analyzeRepository = async (repoId: string) => {
    try {
      const response = await fetch('/api/analyze/repository', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repositoryId: repoId })
      })
      
      if (response.ok) {
        // Refresh the repository list
        await loadRepositories()
        console.log('Analysis initiated successfully')
      }
    } catch (error) {
      console.error('Error analyzing repository:', error)
    }
  }

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
      {/* Sidebar - same as dashboard */}
      <aside className="w-64 border-r border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-950">
        <div className="flex h-full flex-col">
          <div className="flex h-16 items-center justify-center border-b border-gray-200 dark:border-gray-800">
            <Link href="/">
              <h1 className="text-2xl font-bold">Lookas</h1>
            </Link>
          </div>
          
          <nav className="flex-1 space-y-1 p-4">
            <Link href="/" className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-gray-50">
              Dashboard
            </Link>
            <Link href="/settings" className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-gray-50">
              Settings
            </Link>
          </nav>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        <div className="p-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-2">
              Manage your GitHub organizations and repositories
            </p>
          </div>

          {/* Add Repository */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Add Repository</CardTitle>
              <CardDescription>
                Connect individual repositories from your GitHub account
              </CardDescription>

            </CardHeader>
                          <CardContent>
                <div className="space-y-4">
                  <Button 
                    onClick={loadAvailableRepositories}
                    disabled={loadingGithub}
                    className="w-full"
                  >
                    <Github className="mr-2 h-4 w-4" />
                    {loadingGithub ? 'Loading...' : 'Load My GitHub Repositories'}
                  </Button>
                  
                  {availableRepos.length > 0 && (
                    <div className="border rounded-lg p-4 max-h-64 overflow-y-auto">
                      <h4 className="font-medium mb-3">Available Repositories:</h4>
                      <div className="space-y-2">
                        {availableRepos
                          .filter(repo => !repositories.some(r => r.github_id === repo.github_id))
                          .map((repo) => (
                          <div key={repo.github_id} className="flex items-center justify-between p-2 border rounded">
                            <div className="flex-1">
                              <p className="font-medium text-sm">{repo.name}</p>
                              <p className="text-xs text-gray-500">{repo.description || 'No description'}</p>
                              <div className="flex gap-2 mt-1">
                                {repo.language && (
                                  <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs bg-blue-100 text-blue-800">
                                    {repo.language}
                                  </span>
                                )}
                                {repo.private && (
                                  <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs bg-gray-100 text-gray-800">
                                    🔒 Private
                                  </span>
                                )}
                              </div>
                            </div>
                            <Button
                              size="sm"
                              onClick={() => importRepository(repo)}
                            >
                              Import
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
          </Card>

          {/* Repositories */}
          <Card>
            <CardHeader>
              <CardTitle>Repositories</CardTitle>
              <CardDescription>
                Tracked repositories from your organizations
              </CardDescription>
            </CardHeader>
            <CardContent>
              {repositories.length > 0 ? (
                <div className="space-y-3">
                  {repositories.map((repo) => (
                    <div key={repo.id} className="flex items-center justify-between rounded-lg border p-3">
                      <div>
                        <p className="font-medium">{repo.name}</p>
                        <p className="text-sm text-gray-500">{repo.full_name}</p>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => analyzeRepository(repo.id)}
                        disabled={repo.analysis_status === 'analyzing'}
                      >
                        <RefreshCw className="mr-2 h-4 w-4" />
                        {repo.analysis_status === 'analyzing' ? 'Analyzing...' : 'EXPLAIN'}
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500 text-center py-8">
                  No repositories found. Connect a GitHub organization to get started.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
} 