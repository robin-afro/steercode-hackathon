'use client'

import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
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
  const [user, setUser] = useState<any>(null)
  const [repositories, setRepositories] = useState<any[]>([])
  const [documents, setDocuments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        router.push('/login')
        return
      }
      
      setUser(user)

      // Load user's repositories
      const { data: repos } = await supabase
        .from('repositories')
        .select('*')
        .eq('user_id', user.id)

      setRepositories(repos || [])

      // Load all documents for user's repositories
      if (repos && repos.length > 0) {
        const repoIds = repos.map(repo => repo.id)
        const { data: docs } = await supabase
          .from('documents')
          .select('*, repositories!inner(name, full_name)')
          .in('repository_id', repoIds)
          .order('updated_at', { ascending: false })

        setDocuments(docs || [])
      }

    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-gray-50 mx-auto"></div>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    )
  }

  // Real stats from user's data
  const stats = {
    totalDocuments: documents.length,
    totalRepositories: repositories.length,
    documentedRepositories: repositories.filter(r => r.analysis_status === 'completed').length,
    pendingAnalysis: repositories.filter(r => r.analysis_status === 'pending').length,
    recentUpdates: documents.filter(doc => {
      const dayAgo = new Date()
      dayAgo.setDate(dayAgo.getDate() - 1)
      return new Date(doc.updated_at) > dayAgo
    }).length
  }

  const handleGlobalSearch = (query: string) => {
    console.log('Global search:', query)
    // In a real implementation, this would trigger a global search across all documentation
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="border-b border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-950">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Lookas Documentation</h1>
              <p className="text-gray-500 dark:text-gray-400">
                AI-powered living documentation for your codebase
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400">
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
            />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-6">
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5 lg:w-auto lg:grid-cols-5 bg-white dark:bg-gray-950 rounded-lg p-1 border">
            <TabsTrigger 
              value="overview" 
              className="flex items-center space-x-2 data-[state=active]:bg-gray-100 dark:data-[state=active]:bg-gray-800 rounded-md px-3 py-2"
            >
              <TrendingUp className="h-4 w-4" />
              <span>Overview</span>
            </TabsTrigger>
            <TabsTrigger 
              value="documentation" 
              className="flex items-center space-x-2 data-[state=active]:bg-gray-100 dark:data-[state=active]:bg-gray-800 rounded-md px-3 py-2"
            >
              <BookOpen className="h-4 w-4" />
              <span>Documentation</span>
            </TabsTrigger>
            <TabsTrigger 
              value="codebase" 
              className="flex items-center space-x-2 data-[state=active]:bg-gray-100 dark:data-[state=active]:bg-gray-800 rounded-md px-3 py-2"
            >
              <GitBranch className="h-4 w-4" />
              <span>Codebase Graph</span>
            </TabsTrigger>
            <TabsTrigger 
              value="onboarding" 
              className="flex items-center space-x-2 data-[state=active]:bg-gray-100 dark:data-[state=active]:bg-gray-800 rounded-md px-3 py-2"
            >
              <Users className="h-4 w-4" />
              <span>Onboarding</span>
            </TabsTrigger>
            <TabsTrigger 
              value="search" 
              className="flex items-center space-x-2 data-[state=active]:bg-gray-100 dark:data-[state=active]:bg-gray-800 rounded-md px-3 py-2"
            >
              <Search className="h-4 w-4" />
              <span>AI Search</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* Quick Stats */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Documents</CardTitle>
                  <FileText className="h-4 w-4 text-gray-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.totalDocuments}</div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    +{stats.recentUpdates} updated recently
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Repositories</CardTitle>
                  <GitBranch className="h-4 w-4 text-gray-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.totalRepositories}</div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Connected repositories
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Documented</CardTitle>
                  <Users className="h-4 w-4 text-green-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.documentedRepositories}</div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Fully analyzed repos
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Pending Analysis</CardTitle>
                  <Clock className="h-4 w-4 text-yellow-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.pendingAnalysis}</div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Awaiting documentation
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Recent Activity */}
            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Recent Documentation Updates</CardTitle>
                  <CardDescription>AI-generated updates from recent code changes</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {documents.length > 0 ? documents.slice(0, 4).map((doc, index) => (
                      <div key={index} className="flex items-center justify-between p-2 rounded hover:bg-gray-50 dark:hover:bg-gray-800">
                        <div>
                          <p className="text-sm font-medium">{doc.title}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {doc.repositories?.name} • {doc.document_type}
                          </p>
                        </div>
                        <span className="text-xs text-gray-500">
                          {new Date(doc.updated_at).toLocaleDateString()}
                        </span>
                      </div>
                    )) : (
                      <div className="text-center py-4">
                        <p className="text-sm text-gray-500">No documentation updates yet</p>
                        <p className="text-xs text-gray-400 mt-1">Import and analyze repositories to see updates here</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Your Repositories</CardTitle>
                  <CardDescription>Documentation status overview</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {repositories.length > 0 ? repositories.slice(0, 4).map((repo, index) => (
                      <div key={index} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium">{repo.name}</p>
                          <span className={`text-xs px-2 py-1 rounded-full ${
                            repo.analysis_status === 'completed' 
                              ? 'bg-green-100 text-green-800' 
                              : repo.analysis_status === 'analyzing'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {repo.analysis_status === 'completed' && '✓ Documented'}
                            {repo.analysis_status === 'analyzing' && '⏳ Analyzing'}
                            {repo.analysis_status === 'pending' && '⏸️ Pending'}
                            {repo.analysis_status === 'failed' && '❌ Failed'}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                          {repo.description || 'No description'}
                        </p>
                      </div>
                    )) : (
                      <div className="text-center py-4">
                        <p className="text-sm text-gray-500">No repositories connected</p>
                        <p className="text-xs text-gray-400 mt-1">Go to Settings to import repositories</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="documentation">
            <DocumentationBrowser />
          </TabsContent>

          <TabsContent value="codebase">
            <CodebaseGraph />
          </TabsContent>

          <TabsContent value="onboarding">
            <OnboardingPaths />
          </TabsContent>

          <TabsContent value="search" className="space-y-6">
            <Card>
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