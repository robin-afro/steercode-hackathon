'use client'

import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Book, File, Folder, Home, Settings, Search, ChevronRight, ChevronDown } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'

interface Repository {
  id: string
  name: string
  full_name: string
  description: string | null
  github_url: string | null
}

interface Document {
  id: string
  repository_id: string
  document_path: string
  title: string
  content: string
  document_type: 'file' | 'class' | 'function' | 'module' | 'overview'
  file_path: string | null
  metadata: any
  created_at: string
  updated_at: string
}

interface DocumentNode {
  name: string
  path: string
  type: 'folder' | 'document'
  document?: Document
  children: DocumentNode[]
  expanded: boolean
}

export default function RepositoryDocsPage() {
  const params = useParams()
  const repositoryId = params.id as string
  const [repository, setRepository] = useState<Repository | null>(null)
  const [documents, setDocuments] = useState<Document[]>([])
  const [documentTree, setDocumentTree] = useState<DocumentNode[]>([])
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const supabase = createClient()

  useEffect(() => {
    loadRepositoryData()
  }, [repositoryId])

  const buildDocumentTree = (documents: Document[]): DocumentNode[] => {
    const tree: DocumentNode[] = []
    const nodeMap = new Map<string, DocumentNode>()

    // Sort documents by path for consistent ordering
    const sortedDocs = [...documents].sort((a, b) => a.document_path.localeCompare(b.document_path))

    sortedDocs.forEach(doc => {
      const pathParts = doc.document_path.split('.')
      let currentPath = ''
      
      pathParts.forEach((part, index) => {
        const parentPath = currentPath
        currentPath = currentPath ? `${currentPath}.${part}` : part
        
        if (!nodeMap.has(currentPath)) {
          const isLeaf = index === pathParts.length - 1
          const node: DocumentNode = {
            name: part,
            path: currentPath,
            type: isLeaf ? 'document' : 'folder',
            document: isLeaf ? doc : undefined,
            children: [],
            expanded: true
          }
          
          nodeMap.set(currentPath, node)
          
          if (parentPath) {
            const parent = nodeMap.get(parentPath)
            if (parent) {
              parent.children.push(node)
            }
          } else {
            tree.push(node)
          }
        }
      })
    })

    return tree
  }

  const toggleNodeExpansion = (path: string) => {
    const updateNode = (nodes: DocumentNode[]): DocumentNode[] => {
      return nodes.map(node => {
        if (node.path === path) {
          return { ...node, expanded: !node.expanded }
        }
        if (node.children.length > 0) {
          return { ...node, children: updateNode(node.children) }
        }
        return node
      })
    }
    setDocumentTree(prev => updateNode(prev))
  }

  const loadRepositoryData = async () => {
    try {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        setError('You must be logged in to view this page')
        return
      }

      // Fetch repository details
      const { data: repo, error: repoError } = await supabase
        .from('repositories')
        .select('*')
        .eq('id', repositoryId)
        .eq('user_id', user.id)
        .single()

      if (repoError || !repo) {
        setError('Repository not found or you do not have access to it')
        return
      }

      setRepository(repo)

      // Fetch documents for this repository
      const { data: docs, error: docsError } = await supabase
        .from('documents')
        .select('*')
        .eq('repository_id', repositoryId)
        .order('document_path', { ascending: true })

      if (docsError) {
        console.error('Error fetching documents:', docsError)
        setError('Failed to load documentation')
        return
      }

      setDocuments(docs || [])
      
      // Build document tree
      const tree = buildDocumentTree(docs || [])
      setDocumentTree(tree)
      
      // Select the overview document by default, or the first document
      const overviewDoc = docs?.find(doc => doc.document_type === 'overview')
      const defaultDoc = overviewDoc || docs?.[0]
      if (defaultDoc) {
        setSelectedDocument(defaultDoc)
      }

    } catch (err) {
      console.error('Error loading repository data:', err)
      setError('An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  const getDocumentIcon = (docType: string) => {
    switch (docType) {
      case 'overview':
        return <Book className="h-4 w-4" />
      case 'file':
        return <File className="h-4 w-4" />
      case 'module':
        return <Folder className="h-4 w-4" />
      default:
        return <File className="h-4 w-4" />
    }
  }

  const filteredDocuments = documents.filter(doc => 
    searchQuery === '' || 
    doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    doc.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
    doc.document_path.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const renderTreeNode = (node: DocumentNode, level = 0): React.ReactNode => {
    const isDocument = node.type === 'document'
    const hasChildren = node.children.length > 0
    const isSelected = selectedDocument?.id === node.document?.id
    
    // Filter out nodes that don't match search if searching
    if (searchQuery && isDocument) {
      const matchesSearch = filteredDocuments.some(doc => doc.id === node.document?.id)
      if (!matchesSearch) return null
    }

    return (
      <div key={node.path}>
        <button
          onClick={() => {
            if (isDocument && node.document) {
              setSelectedDocument(node.document)
            } else if (hasChildren) {
              toggleNodeExpansion(node.path)
            }
          }}
          className={`w-full text-left px-3 py-1.5 rounded-lg text-sm transition-colors flex items-center gap-2 ${
            isSelected
              ? 'bg-blue-100 text-blue-900 dark:bg-blue-900 dark:text-blue-100'
              : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800'
          }`}
          style={{ paddingLeft: `${level * 16 + 12}px` }}
        >
          {hasChildren && (
            node.expanded ? (
              <ChevronDown className="h-3 w-3 flex-shrink-0" />
            ) : (
              <ChevronRight className="h-3 w-3 flex-shrink-0" />
            )
          )}
          {!hasChildren && <div className="w-3" />}
          
          {isDocument ? (
            getDocumentIcon(node.document?.document_type || 'file')
          ) : (
            <Folder className="h-4 w-4" />
          )}
          
          <span className="truncate">{node.name}</span>
        </button>
        
        {hasChildren && node.expanded && (
          <div>
            {node.children.map(child => renderTreeNode(child, level + 1))}
          </div>
        )}
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading documentation...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
        <div className="flex-1 flex items-center justify-center">
          <Card className="max-w-md">
            <CardHeader>
              <CardTitle>Error</CardTitle>
              <CardDescription>{error}</CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/">
                <Button>
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Dashboard
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
      {/* Sidebar */}
      <aside className="w-64 border-r border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-950">
        <div className="flex h-full flex-col">
          {/* Header */}
          <div className="border-b border-gray-200 dark:border-gray-800 p-4">
            <Link href="/">
              <h1 className="text-xl font-bold">Lookas</h1>
            </Link>
            <div className="mt-2">
              <Link href="/" className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1">
                <ArrowLeft className="h-3 w-3" />
                Back to Dashboard
              </Link>
            </div>
          </div>

          {/* Repository Info */}
          <div className="border-b border-gray-200 dark:border-gray-800 p-4">
            <h2 className="font-semibold text-lg">{repository?.name}</h2>
            <p className="text-sm text-gray-500 mt-1">{repository?.description || 'No description'}</p>
            {repository?.github_url && (
              <a 
                href={repository.github_url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-sm text-blue-600 hover:text-blue-800 mt-2 inline-block"
              >
                View on GitHub →
              </a>
            )}
          </div>

          {/* Search */}
          <div className="border-b border-gray-200 dark:border-gray-800 p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search documentation..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200"
              />
            </div>
          </div>

          {/* Document Navigation */}
          <div className="flex-1 overflow-y-auto">
            <div className="p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-gray-700">Documentation</h3>
                <span className="text-xs text-gray-500">{documents.length} docs</span>
              </div>
              <div className="space-y-1">
                {searchQuery ? (
                  // Show flat list when searching
                  filteredDocuments.map((doc) => (
                    <button
                      key={doc.id}
                      onClick={() => setSelectedDocument(doc)}
                      className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors flex items-center gap-2 ${
                        selectedDocument?.id === doc.id
                          ? 'bg-blue-100 text-blue-900 dark:bg-blue-900 dark:text-blue-100'
                          : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800'
                      }`}
                    >
                      {getDocumentIcon(doc.document_type)}
                      <span className="truncate">{doc.title}</span>
                    </button>
                  ))
                ) : (
                  // Show tree structure when not searching
                  documentTree.map(node => renderTreeNode(node))
                )}
              </div>
            </div>
          </div>

          {/* Navigation Links */}
          <div className="border-t border-gray-200 p-4 dark:border-gray-800">
            <div className="space-y-1">
              <Link href="/" className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-gray-50">
                <Home className="h-4 w-4" />
                Dashboard
              </Link>
              <Link href="/settings" className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-gray-50">
                <Settings className="h-4 w-4" />
                Settings
              </Link>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-hidden">
        {selectedDocument ? (
          <div className="h-full flex flex-col">
            {/* Document Header */}
            <div className="border-b border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-950">
              <div className="flex items-center gap-2 mb-2">
                {getDocumentIcon(selectedDocument.document_type)}
                <span className="text-sm text-gray-500 capitalize">{selectedDocument.document_type}</span>
              </div>
              <h1 className="text-2xl font-bold">{selectedDocument.title}</h1>
              {selectedDocument.file_path && (
                <p className="text-sm text-gray-500 mt-1">{selectedDocument.file_path}</p>
              )}
            </div>

            {/* Document Content */}
            <div className="flex-1 overflow-y-auto bg-white dark:bg-gray-950">
              <div className="max-w-4xl mx-auto p-6">
                <div className="prose prose-gray dark:prose-invert max-w-none">
                  <div className="whitespace-pre-wrap">{selectedDocument.content}</div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex h-full items-center justify-center">
            <div className="text-center">
              <Book className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-gray-700 mb-2">No Documentation Available</h2>
              <p className="text-gray-500 mb-4">
                This repository hasn't been analyzed yet.
              </p>
              <Link href="/settings">
                <Button>
                  Analyze Repository
                </Button>
              </Link>
            </div>
          </div>
        )}
      </main>
    </div>
  )
} 