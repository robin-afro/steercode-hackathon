'use client'

import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { useEffect, useState, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { SearchBar } from '@/components/ui/search-bar'
import { ThemeToggle } from '@/components/theme-toggle'
import { 
  GitBranch, 
  Users, 
  BookOpen,
  TrendingUp,
  Clock,
  Zap,
  FileText,
  Home,
  Settings,
  LogOut,
  Plus,
  BarChart3,
  GitPullRequest,
  AlertCircle
} from 'lucide-react'
import Link from 'next/link'

export default function HomePage() {
  const [user, setUser] = useState<any>(null)
  const [repositories, setRepositories] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const checkUser = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        router.push('/login')
        return
      }
      
      setUser(user)

      // Ensure user record exists in database
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

      // Fetch user's repositories
      const { data: repositories } = await supabase
        .from('repositories')
        .select('*')
        .eq('user_id', user.id)

      setRepositories(repositories || [])
      setLoading(false)
    }

    checkUser()
  }, [router])

  // Keyboard shortcuts as per design principles
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl + K for global search (future implementation)
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        // TODO: Open global command bar
        console.log('Global search triggered')
      }
      // 's' for settings
      if (e.key === 's' && !e.target?.toString().includes('Input')) {
        e.preventDefault()
        router.push('/settings')
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [router])

  const handleGlobalSearch = useCallback((query: string) => {
    // TODO: Implement global search functionality
    console.log('Search query:', query)
  }, [])

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--color-canvas)' }}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 mx-auto" style={{ borderColor: 'var(--color-primary)' }}></div>
          <p className="mt-2 text-sm" style={{ color: 'var(--color-text-secondary)' }}>Loading...</p>
        </div>
      </div>
    )
  }

  const hasRepositories = repositories && repositories.length > 0
  
  // Calculate stats
  const stats = {
    totalRepositories: repositories.length,
    documented: repositories.filter(r => r.analysis_status === 'completed').length,
    analyzing: repositories.filter(r => r.analysis_status === 'analyzing').length,
    failed: repositories.filter(r => r.analysis_status === 'failed').length,
    pending: repositories.filter(r => r.analysis_status === 'pending').length
  }

  const navItems = [
    { href: '/', icon: Home, label: 'Dashboard', active: true },
    { href: '/settings', icon: Settings, label: 'Settings', active: false },
  ]

  return (
    <div className="flex h-screen" style={{ backgroundColor: 'var(--color-canvas)' }}>
      {/* Sidebar */}
      <aside className="w-64 border-r" style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)' }}>
        <div className="flex h-full flex-col">
          <div className="flex h-16 items-center justify-center border-b" style={{ borderColor: 'var(--color-border)' }}>
            <h1 className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>Lookas</h1>
          </div>
          
          <nav className="flex-1 space-y-1 p-4">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  item.active 
                    ? 'bg-primary/10 text-primary' 
                    : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-gray-50'
                }`}
                style={item.active ? { 
                  backgroundColor: 'var(--color-primary-bg)', 
                  color: 'var(--color-primary)' 
                } : {}}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="border-t p-4" style={{ borderColor: 'var(--color-border)' }}>
            <div className="flex items-center gap-3 mb-3">
              <div className="h-8 w-8 rounded-full" style={{ backgroundColor: 'var(--color-border)' }} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate" style={{ color: 'var(--color-text-primary)' }}>
                  {user?.email}
                </p>
              </div>
              <ThemeToggle />
            </div>
            <Button variant="outline" size="sm" className="w-full" onClick={handleLogout}>
              <LogOut className="mr-2 h-4 w-4" />
              Sign out
            </Button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        {!hasRepositories ? (
          // No repositories state
          <div className="p-8">
            <div className="mb-8">
              <h1 className="text-3xl font-bold tracking-tight" style={{ color: 'var(--color-text-primary)' }}>
                Welcome to Lookas
              </h1>
              <p className="mt-2" style={{ color: 'var(--color-text-secondary)' }}>
                Let's get started by connecting your GitHub repositories
              </p>
            </div>

            {/* Global Search */}
            <div className="mb-8 max-w-2xl">
              <SearchBar
                onSearch={handleGlobalSearch}
                placeholder="Search documentation, code, or ask questions... (Cmd+K)"
                defaultValue=""
              />
            </div>

            <Card className="max-w-2xl" style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
              <CardHeader>
                <CardTitle>Connect Your GitHub Repositories</CardTitle>
                <CardDescription>
                  Import individual repositories to generate comprehensive code documentation with AI
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Link href="/settings?step=connect-gh">
                  <Button size="lg" variant="primary">
                    <Plus className="mr-2 h-4 w-4" />
                    Connect Repositories
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        ) : (
          // Dashboard with repositories
          <div className="p-6">
            {/* Header */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h1 className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
                    Dashboard
                  </h1>
                  <p style={{ color: 'var(--color-text-secondary)' }}>
                    AI-powered living documentation for your repositories
                  </p>
                </div>
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                    <Zap className="h-4 w-4" />
                    <span>Auto-updated</span>
                    <Badge variant="default" size="sm" style={{ backgroundColor: 'var(--color-success)', color: 'white' }}>
                      Live
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Global Search */}
              <div className="max-w-2xl">
                <SearchBar
                  onSearch={handleGlobalSearch}
                  placeholder="Search documentation, code, or ask questions... (Cmd+K)"
                  defaultValue=""
                />
              </div>
            </div>

            {/* Quick Stats */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
              <Card style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Repositories</CardTitle>
                  <GitBranch className="h-4 w-4" style={{ color: 'var(--color-text-secondary)' }} />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.totalRepositories}</div>
                  <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                    Connected repositories
                  </p>
                </CardContent>
              </Card>

              <Card style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Documented</CardTitle>
                  <FileText className="h-4 w-4" style={{ color: 'var(--color-success)' }} />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.documented}</div>
                  <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                    Documentation complete
                  </p>
                </CardContent>
              </Card>

              <Card style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Analyzing</CardTitle>
                  <TrendingUp className="h-4 w-4" style={{ color: 'var(--color-warning)' }} />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.analyzing}</div>
                  <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                    Currently processing
                  </p>
                </CardContent>
              </Card>

              <Card style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Pending Analysis</CardTitle>
                  <Clock className="h-4 w-4" style={{ color: 'var(--color-text-secondary)' }} />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.pending}</div>
                  <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                    Awaiting analysis
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Repository List */}
            <div className="grid gap-4 mb-8">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                  Your Repositories
                </h2>
                <Link href="/settings?step=connect-gh">
                  <Button variant="outline" size="sm">
                    <Plus className="mr-2 h-4 w-4" />
                    Add Repository
                  </Button>
                </Link>
              </div>

              {repositories.map((repo) => (
                <Card key={repo.id} style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0">
                    <div className="flex-1">
                      <CardTitle className="text-lg">{repo.name}</CardTitle>
                      <CardDescription className="mt-1">
                        {repo.description || 'No description'}
                      </CardDescription>
                      <div className="flex items-center gap-2 mt-3">
                        <Badge 
                          variant={
                            repo.analysis_status === 'completed' 
                              ? 'default' 
                              : repo.analysis_status === 'analyzing'
                              ? 'secondary'
                              : repo.analysis_status === 'failed'
                              ? 'destructive'
                              : 'outline'
                          }
                          size="sm"
                        >
                          {repo.analysis_status === 'completed' && '✓ Documented'}
                          {repo.analysis_status === 'analyzing' && '⏳ Analyzing'}
                          {repo.analysis_status === 'failed' && '❌ Failed'}
                          {repo.analysis_status === 'pending' && '⏸️ Pending'}
                        </Badge>
                        {repo.private && (
                          <Badge variant="outline" size="sm">
                            🔒 Private
                          </Badge>
                        )}
                        {repo.language && (
                          <Badge variant="outline" size="sm">
                            {repo.language}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {repo.analysis_status === 'completed' && (
                        <Link href={`/repositories/${repo.id}/docs`}>
                          <Button variant="outline" size="sm">
                            <BookOpen className="mr-2 h-4 w-4" />
                            View Docs
                          </Button>
                        </Link>
                      )}
                      {repo.analysis_status === 'analyzing' ? (
                        <Button 
                          size="sm"
                          disabled={true}
                          variant="default"
                        >
                          <TrendingUp className="mr-2 h-4 w-4 animate-spin" />
                          Analyzing...
                        </Button>
                      ) : (
                        <Link href={`/repositories/${repo.id}/generate`}>
                          <Button 
                            size="sm"
                            variant="primary"
                          >
                            <Zap className="mr-2 h-4 w-4" />
                            Generate Docs
                          </Button>
                        </Link>
                      )}
                    </div>
                  </CardHeader>
                </Card>
              ))}
            </div>

            {/* Recent Activity & Quick Actions */}
            <div className="grid gap-6 md:grid-cols-2">
              <Card style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
                <CardHeader>
                  <CardTitle className="text-base">Recent Activity</CardTitle>
                  <CardDescription>Latest documentation updates and repository changes</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {repositories
                      .filter(r => r.last_analyzed_at)
                      .sort((a, b) => new Date(b.last_analyzed_at).getTime() - new Date(a.last_analyzed_at).getTime())
                      .slice(0, 4)
                      .map((repo, index) => (
                        <div key={index} className="flex items-center justify-between p-2 rounded transition-colors hover:bg-gray-50 dark:hover:bg-gray-800">
                          <div>
                            <p className="text-sm font-medium">{repo.name} documentation updated</p>
                            <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                              {repo.analysis_status === 'completed' ? 'Analysis completed' : 'Analysis in progress'}
                            </p>
                          </div>
                          <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                            {new Date(repo.last_analyzed_at).toLocaleDateString()}
                          </span>
                        </div>
                      ))}
                    {repositories.filter(r => r.last_analyzed_at).length === 0 && (
                      <p className="text-sm text-center py-4" style={{ color: 'var(--color-text-secondary)' }}>
                        No recent activity. Generate documentation to see updates here.
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
                <CardHeader>
                  <CardTitle className="text-base">Quick Actions</CardTitle>
                  <CardDescription>Common tasks and shortcuts</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                                         <Link href="/settings?step=connect-gh">
                       <Button variant="outline" className="w-full justify-start">
                         <Plus className="mr-2 h-4 w-4" />
                         Connect New Repository
                       </Button>
                     </Link>
                    
                    <Button variant="outline" className="w-full justify-start" disabled>
                      <BarChart3 className="mr-2 h-4 w-4" />
                      View Analytics
                      <Badge variant="secondary" size="sm" className="ml-auto">Soon</Badge>
                    </Button>
                    
                                         <Link href="/settings">
                       <Button variant="outline" className="w-full justify-start">
                         <Settings className="mr-2 h-4 w-4" />
                         Account Settings
                       </Button>
                     </Link>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
