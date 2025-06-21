'use client'

import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { RepositorySidebar } from '@/components/repository-sidebar'
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
  const [user, setUser] = useState<any>(null)
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

  // Client-side markdown parsing effect
  useEffect(() => {
    if (selectedDocument?.content) {
      const parseMarkdown = async () => {
        try {
          // Import marked and highlight.js dynamically
          const { marked } = await import('marked')
          const hljs = await import('highlight.js')
          
          // Configure marked options
          marked.setOptions({
            breaks: true,
            gfm: true,
          })

          // Get the raw markdown content
          const rawMarkdown = selectedDocument.content
          
          // Parse markdown to HTML
          const html = await marked.parse(rawMarkdown)
          
          // Update the content div
          const contentDiv = document.getElementById('markdown-content')
          if (contentDiv) {
            contentDiv.innerHTML = html
            
            // Apply syntax highlighting to code blocks
            const codeBlocks = contentDiv.querySelectorAll('pre code')
            codeBlocks.forEach((block) => {
              hljs.default.highlightElement(block as HTMLElement)
            })
          }
        } catch (error) {
          console.error('Error parsing markdown:', error)
          // Fallback to plain text
          const contentDiv = document.getElementById('markdown-content')
          if (contentDiv) {
            contentDiv.innerHTML = `<pre>${selectedDocument.content}</pre>`
          }
        }
      }

      parseMarkdown()
    }
  }, [selectedDocument?.content])

  // Smooth scroll to top when document changes
  useEffect(() => {
    if (selectedDocument) {
      // Find the main content area and scroll it to top smoothly
      const mainContent = document.querySelector('main .overflow-y-auto')
      if (mainContent) {
        mainContent.scrollTo({
          top: 0,
          behavior: 'smooth'
        })
      }
    }
  }, [selectedDocument?.id])

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

      setUser(user)

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

  if (loading) {
    return (
      <div className="flex h-screen" style={{ backgroundColor: 'var(--color-canvas)' }}>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto" style={{ borderColor: 'var(--color-primary)' }}></div>
            <p className="mt-4" style={{ color: 'var(--color-text-secondary)' }}>Loading documentation...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex h-screen" style={{ backgroundColor: 'var(--color-canvas)' }}>
        <div className="flex-1 flex items-center justify-center">
          <Card className="max-w-md" style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
            <CardHeader>
              <CardTitle style={{ color: 'var(--color-text-primary)' }}>Error</CardTitle>
              <CardDescription style={{ color: 'var(--color-text-secondary)' }}>{error}</CardDescription>
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
    <div className="flex h-screen" style={{ backgroundColor: 'var(--color-canvas)' }}>
      {/* Sidebar */}
      <RepositorySidebar
        user={user}
        repository={repository || undefined}
        documents={documents}
        documentTree={documentTree}
        selectedDocument={selectedDocument || undefined}
        searchQuery={searchQuery}
        onDocumentSelect={setSelectedDocument}
        onSearchChange={setSearchQuery}
        onNodeToggle={toggleNodeExpansion}
      />

      {/* Main Content */}
      <main className="flex-1 overflow-hidden">
        {selectedDocument ? (
          <div className="h-full flex flex-col">
            {/* Document Header */}
            <div className="border-b p-6" style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)' }}>
              <div className="flex items-center gap-2 mb-2">
                {getDocumentIcon(selectedDocument.document_type)}
                <span className="text-sm capitalize" style={{ color: 'var(--color-text-secondary)' }}>{selectedDocument.document_type}</span>
              </div>
              <h1 className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>{selectedDocument.title}</h1>
              {selectedDocument.file_path && (
                <p className="text-sm mt-1" style={{ color: 'var(--color-text-secondary)' }}>{selectedDocument.file_path}</p>
              )}
            </div>

            {/* Document Content */}
            <div className="flex-1 overflow-y-auto" style={{ backgroundColor: 'var(--color-surface)' }}>
              <div className="max-w-4xl mx-auto p-6">
                {/* Hidden script tag for raw markdown content */}
                <script type="text/plain" id="raw-markdown">
                  {selectedDocument.content}
                </script>
                
                {/* Container for rendered markdown */}
                <div id="markdown-content" className="markdown-content">
                  {/* Content will be rendered here by client-side JavaScript */}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex h-full items-center justify-center">
            <div className="text-center">
              <Book className="h-12 w-12 mx-auto mb-4" style={{ color: 'var(--color-text-muted)' }} />
              <h2 className="text-xl font-semibold mb-2" style={{ color: 'var(--color-text-primary)' }}>No Documentation Available</h2>
              <p className="mb-4" style={{ color: 'var(--color-text-secondary)' }}>
                This repository hasn't been analyzed yet.
              </p>
              <Link href="/settings">
                <Button variant="primary">
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