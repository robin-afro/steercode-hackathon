'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Sidebar } from '@/components/sidebar'
import { Github, Plus, Trash2, RefreshCw } from 'lucide-react'
import Link from 'next/link'

export default function SettingsPage() {
  const [user, setUser] = useState<any>(null)
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
      setUser(user)
      
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
        const errorData = await response.json()
        console.error('Failed to load repositories from GitHub')
        
        // Handle scope issues specifically
        if (errorData.code === 'INSUFFICIENT_SCOPE') {
          alert('Your GitHub authentication doesn\'t include access to private repositories. Please sign out and sign back in to grant the required permissions.')
        } else {
          alert(`Error: ${errorData.error || 'Failed to load repositories'}`)
        }
      }
    } catch (error) {
      console.error('Error loading GitHub repositories:', error)
      alert('Error loading repositories. Please try again.')
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
    <div className="flex h-screen" style={{ backgroundColor: 'var(--color-canvas)' }}>
      {/* Sidebar */}
      <Sidebar user={user} />

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        <div className="p-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold tracking-tight" style={{ color: 'var(--color-text-primary)' }}>Settings</h1>
            <p className="mt-2" style={{ color: 'var(--color-text-secondary)' }}>
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
                  variant="primary"
                >
                  <Github className="mr-2 h-4 w-4" />
                  {loadingGithub ? 'Loading...' : 'Load My GitHub Repositories'}
                </Button>
                
                {availableRepos.length > 0 && (
                  <div className="border rounded-lg p-4 max-h-64 overflow-y-auto" style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-canvas)' }}>
                    <h4 className="font-medium mb-3" style={{ color: 'var(--color-text-primary)' }}>Available Repositories:</h4>
                    <div className="space-y-2">
                      {availableRepos
                        .filter(repo => !repositories.some(r => r.github_id === repo.github_id))
                        .map((repo) => (
                        <div key={repo.github_id} className="flex items-center justify-between p-2 border rounded" style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)' }}>
                          <div className="flex-1">
                            <p className="font-medium text-sm" style={{ color: 'var(--color-text-primary)' }}>{repo.name}</p>
                            <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>{repo.description || 'No description'}</p>
                            <div className="flex gap-2 mt-1">
                              {repo.language && (
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs" style={{ backgroundColor: 'var(--color-primary)', color: 'white' }}>
                                  {repo.language}
                                </span>
                              )}
                              {repo.private && (
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs" style={{ backgroundColor: 'var(--overlay-10)', color: 'var(--color-text-primary)' }}>
                                  🔒 Private
                                </span>
                              )}
                            </div>
                          </div>
                          <Button
                            size="sm"
                            onClick={() => importRepository(repo)}
                            variant="primary"
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
                    <div key={repo.id} className="flex items-center justify-between rounded-lg border p-3" style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-canvas)' }}>
                      <div>
                        <p className="font-medium" style={{ color: 'var(--color-text-primary)' }}>{repo.name}</p>
                        <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>{repo.full_name}</p>
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
                <p className="text-sm text-center py-8" style={{ color: 'var(--color-text-secondary)' }}>
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