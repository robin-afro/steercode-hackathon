'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Github, Plus, Trash2, RefreshCw } from 'lucide-react'
import Link from 'next/link'

export default function SettingsPage() {
  const [organizations, setOrganizations] = useState<any[]>([])
  const [repositories, setRepositories] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    loadOrganizations()
  }, [])

  const loadOrganizations = async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    
    if (user) {
      const { data } = await supabase
        .from('user_organizations')
        .select('*, organizations(*)')
        .eq('user_id', user.id)
      
      if (data) {
        setOrganizations(data.map(d => d.organizations))
        
        // Load repositories for these organizations
        const orgIds = data.map(d => d.organization_id)
        const { data: repos } = await supabase
          .from('repositories')
          .select('*')
          .in('organization_id', orgIds)
        
        if (repos) {
          setRepositories(repos)
        }
      }
    }
    setLoading(false)
  }

  const syncRepository = async (repoId: string) => {
    try {
      const response = await fetch('/api/github/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repositoryId: repoId })
      })
      
      if (response.ok) {
        // Show success message
        console.log('Sync initiated successfully')
      }
    } catch (error) {
      console.error('Error syncing repository:', error)
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

          {/* Organizations */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>GitHub Organizations</CardTitle>
              <CardDescription>
                Connected organizations from your GitHub account
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <p className="text-sm text-gray-500">Loading...</p>
              ) : organizations.length > 0 ? (
                <div className="space-y-3">
                  {organizations.map((org) => (
                    <div key={org.id} className="flex items-center justify-between rounded-lg border p-3">
                      <div className="flex items-center gap-3">
                        {org.avatar_url && (
                          <img src={org.avatar_url} alt={org.name} className="h-8 w-8 rounded-full" />
                        )}
                        <div>
                          <p className="font-medium">{org.name || org.login}</p>
                          <p className="text-sm text-gray-500">@{org.login}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Github className="mx-auto h-12 w-12 text-gray-400" />
                  <p className="mt-2 text-sm text-gray-500">No organizations connected yet</p>
                  <Button className="mt-4" onClick={() => window.location.href = '/login'}>
                    <Plus className="mr-2 h-4 w-4" />
                    Connect GitHub Account
                  </Button>
                </div>
              )}
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
                        onClick={() => syncRepository(repo.id)}
                      >
                        <RefreshCw className="mr-2 h-4 w-4" />
                        Sync
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