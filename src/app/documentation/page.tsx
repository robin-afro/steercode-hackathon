'use client'

import { createClient } from '@/lib/supabase/client'
import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useState, useCallback } from 'react'
import { DocumentationBrowser } from '@/components/documentation-browser'
import { CodebaseGraph } from '@/components/codebase-graph'
import { OnboardingPaths } from '@/components/onboarding-paths'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { SearchBar } from '@/components/ui/search-bar'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  BookOpen, 
  GitBranch, 
  Users, 
  Search, 
  TrendingUp, 
  Clock,
  Zap,
  FileText
} from 'lucide-react'

export default function DocumentationPage() {
  const [, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const searchParams = useSearchParams()
  
  // URL state management as per docs/05-pages-and-flows.md section 2.5
  const activeTab = searchParams.get('tab') || 'overview'
  const selectedDocId = searchParams.get('id')
  const selectedNode = searchParams.get('node')
  const searchQuery = searchParams.get('q') || ''

  useEffect(() => {
    const checkUser = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        router.push('/login')
        return
      }
      
      setUser(user)
      setLoading(false)
    }

    checkUser()
  }, [router])

  // Keyboard shortcuts as per docs/04-design-principles-and-userflows.md section 6
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl + K for global search
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        updateUrl({ tab: 'search' })
      }
      // Number keys for tab navigation
      if (e.key >= '1' && e.key <= '5' && !e.target?.toString().includes('Input')) {
        e.preventDefault()
        const tabs = ['overview', 'documentation', 'codebase', 'onboarding', 'search']
        updateUrl({ tab: tabs[parseInt(e.key) - 1] })
      }
      // '/' for search focus
      if (e.key === '/' && !e.target?.toString().includes('Input')) {
        e.preventDefault()
        updateUrl({ tab: 'search' })
      }
      // 'g' then 'c' for graph shortcut
      if (e.key === 'g') {
        setTimeout(() => {
          const handleSecondKey = (e2: KeyboardEvent) => {
            if (e2.key === 'c') {
              updateUrl({ tab: 'codebase' })
            }
            document.removeEventListener('keydown', handleSecondKey)
          }
          document.addEventListener('keydown', handleSecondKey)
        }, 100)
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  const updateUrl = useCallback((params: Record<string, string | undefined>) => {
    const url = new URL(window.location.href)
    Object.entries(params).forEach(([key, value]) => {
      if (value) {
        url.searchParams.set(key, value)
      } else {
        url.searchParams.delete(key)
      }
    })
    router.push(url.pathname + url.search)
  }, [router])

  const handleTabChange = useCallback((tab: string) => {
    updateUrl({ tab })
  }, [updateUrl])

  const handleGlobalSearch = useCallback((query: string) => {
    updateUrl({ tab: 'search', q: query })
  }, [updateUrl])

  // Single-step explanation generation as per docs/04-design-principles-and-userflows.md section 8.4
  const handleGenerateExplanation = useCallback(async (documentId: string) => {
    // Optimistic UI - immediately show loading state
    console.log('Generating explanation for:', documentId)
    // TODO: Implement actual API call to /api/ai/generate-suggestions
  }, [])

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

  // Dummy stats for the overview
  const stats = {
    totalDocuments: 156,
    documentsUpdatedToday: 12,
    crossReferences: 89,
    learningPaths: 8,
    avgOnboardingTime: '3.2 hours',
    codebaseComplexity: 'Medium'
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--color-canvas)' }}>
      {/* Header */}
      <div className="border-b" style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)' }}>
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>Lookas Documentation</h1>
              <p style={{ color: 'var(--color-text-secondary)' }}>
                AI-powered living documentation for your codebase
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                <Zap className="h-4 w-4" />
                <span>Auto-updated</span>
                <Badge variant="success" size="sm">Live</Badge>
              </div>
            </div>
          </div>
          
          {/* Global Search */}
          <div className="mt-4 max-w-2xl">
            <SearchBar
              onSearch={handleGlobalSearch}
              placeholder="Search documentation, code, or ask questions... (e.g., 'How does authentication work?')"
              defaultValue={searchQuery}
            />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-6">
        <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
          <TabsList className="grid w-full grid-cols-5 lg:w-auto lg:grid-cols-5 rounded-lg p-1 border" style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
            <TabsTrigger value="overview" className="flex items-center space-x-2">
              <TrendingUp className="h-4 w-4" />
              <span>Overview</span>
            </TabsTrigger>
            <TabsTrigger value="documentation" className="flex items-center space-x-2">
              <BookOpen className="h-4 w-4" />
              <span>Documentation</span>
            </TabsTrigger>
            <TabsTrigger value="codebase" className="flex items-center space-x-2">
              <GitBranch className="h-4 w-4" />
              <span>Codebase Graph</span>
            </TabsTrigger>
            <TabsTrigger value="onboarding" className="flex items-center space-x-2">
              <Users className="h-4 w-4" />
              <span>Onboarding</span>
            </TabsTrigger>
            <TabsTrigger value="search" className="flex items-center space-x-2">
              <Search className="h-4 w-4" />
              <span>AI Search</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* Quick Stats */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Documents</CardTitle>
                  <FileText className="h-4 w-4" style={{ color: 'var(--color-text-secondary)' }} />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.totalDocuments}</div>
                  <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                    +{stats.documentsUpdatedToday} updated today
                  </p>
                </CardContent>
              </Card>

              <Card style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Cross References</CardTitle>
                  <GitBranch className="h-4 w-4" style={{ color: 'var(--color-text-secondary)' }} />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.crossReferences}</div>
                  <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                    Intelligent connections
                  </p>
                </CardContent>
              </Card>

              <Card style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Learning Paths</CardTitle>
                  <Users className="h-4 w-4" style={{ color: 'var(--color-text-secondary)' }} />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.learningPaths}</div>
                  <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                    Active onboarding paths
                  </p>
                </CardContent>
              </Card>

              <Card style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Avg Onboarding</CardTitle>
                  <Clock className="h-4 w-4" style={{ color: 'var(--color-text-secondary)' }} />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.avgOnboardingTime}</div>
                  <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                    Time to first contribution
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Recent Activity */}
            <div className="grid gap-6 md:grid-cols-2">
              <Card style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
                <CardHeader>
                  <CardTitle className="text-base">Recent Documentation Updates</CardTitle>
                  <CardDescription>AI-generated updates from recent code changes</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {[
                      { title: 'Authentication Flow Updated', time: '2 hours ago', type: 'backend.auth.overview' },
                      { title: 'New UI Components Added', time: '5 hours ago', type: 'frontend.components.ui' },
                      { title: 'Database Schema Changes', time: '1 day ago', type: 'backend.database.schema' },
                      { title: 'API Endpoints Documentation', time: '2 days ago', type: 'backend.api.routes' }
                    ].map((update, index) => (
                      <div key={index} className="flex items-center justify-between p-2 rounded transition-colors hover:bg-gray-50 dark:hover:bg-gray-800">
                        <div>
                          <p className="text-sm font-medium">{update.title}</p>
                          <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>{update.type}</p>
                        </div>
                        <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{update.time}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
                <CardHeader>
                  <CardTitle className="text-base">Popular Learning Paths</CardTitle>
                  <CardDescription>Most accessed onboarding paths</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {[
                      { title: 'Frontend Development Basics', users: 12, completion: 75 },
                      { title: 'Backend Architecture Deep Dive', users: 8, completion: 60 },
                      { title: 'Database Management Guide', users: 6, completion: 90 },
                      { title: 'API Integration Patterns', users: 4, completion: 45 }
                    ].map((path, index) => (
                      <div key={index} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium">{path.title}</p>
                          <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{path.users} users</span>
                        </div>
                        <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--color-border)' }}>
                          <div 
                            className="h-full rounded-full" 
                            style={{ 
                              backgroundColor: 'var(--color-primary)',
                              width: `${path.completion}%` 
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="documentation">
            <DocumentationBrowser 
              selectedDocId={selectedDocId}
              onDocumentSelect={(doc) => updateUrl({ tab: 'documentation', id: doc.id })}
              onGenerateExplanation={handleGenerateExplanation}
            />
          </TabsContent>

          <TabsContent value="codebase">
            <CodebaseGraph 
              selectedNode={selectedNode}
              onNodeSelect={(nodeId) => updateUrl({ tab: 'codebase', node: nodeId })}
            />
          </TabsContent>

          <TabsContent value="onboarding">
            <OnboardingPaths />
          </TabsContent>

          <TabsContent value="search" className="space-y-6">
            <Card style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
              <CardHeader>
                <CardTitle>AI-Powered Search</CardTitle>
                <CardDescription>
                  Ask questions about your codebase in natural language
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <SearchBar 
                    placeholder="Try asking: 'How do I add a new API endpoint?' or 'What authentication methods are used?'"
                    onSearch={handleGlobalSearch}
                    defaultValue={searchQuery}
                  />
                  
                  <div className="grid gap-4 mt-6">
                    <div>
                      <h4 className="text-sm font-medium mb-2">Popular Questions</h4>
                      <div className="grid gap-2">
                        {[
                          "How does user authentication work?",
                          "Where are database models defined?",
                          "How to add a new React component?",
                          "What's the deployment process?"
                        ].map((question, index) => (
                          <Button
                            key={index}
                            variant="outline"
                            size="sm"
                            className="justify-start h-auto p-3 text-left"
                            onClick={() => handleGlobalSearch(question)}
                          >
                            {question}
                          </Button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
} 