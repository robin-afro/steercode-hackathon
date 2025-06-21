'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { ThemeToggle } from '@/components/theme-toggle'
import { 
  Home, 
  Settings, 
  LogOut, 
  ArrowLeft, 
  Search, 
  Book, 
  File, 
  Folder, 
  ChevronDown, 
  ChevronRight 
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

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

interface RepositorySidebarProps {
  user?: { email?: string }
  repository?: Repository
  documents: Document[]
  documentTree: DocumentNode[]
  selectedDocument?: Document
  searchQuery: string
  onDocumentSelect: (doc: Document) => void
  onSearchChange: (query: string) => void
  onNodeToggle: (path: string) => void
}

export function RepositorySidebar({
  user,
  repository,
  documents,
  documentTree,
  selectedDocument,
  searchQuery,
  onDocumentSelect,
  onSearchChange,
  onNodeToggle
}: RepositorySidebarProps) {
  const pathname = usePathname()
  const supabase = createClient()

  const navItems = [
    {
      href: '/',
      label: 'Dashboard',
      icon: Home,
      active: pathname === '/'
    },
    {
      href: '/settings',
      label: 'Settings',
      icon: Settings,
      active: pathname === '/settings'
    }
  ]

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut()
      window.location.href = '/login'
    } catch (error) {
      console.error('Error signing out:', error)
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
              onDocumentSelect(node.document)
            } else if (hasChildren) {
              onNodeToggle(node.path)
            }
          }}
          className="w-full text-left px-3 py-1.5 rounded-lg text-sm transition-colors flex items-center gap-2"
          style={{ 
            paddingLeft: `${level * 16 + 12}px`,
            ...(isSelected
              ? { backgroundColor: 'var(--color-primary)', color: 'white' }
              : { color: 'var(--color-text-primary)' }
            )
          }}
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

  return (
    <aside className="w-64 border-r" style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)' }}>
      <div className="flex h-full flex-col">
        {/* Logo */}
        <div className="flex h-16 items-center justify-center border-b" style={{ borderColor: 'var(--color-border)' }}>
          <Link href="/">
            <h1 className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>Lookas</h1>
          </Link>
        </div>

        {/* Back to Dashboard */}
        <div className="border-b px-4 py-3" style={{ borderColor: 'var(--color-border)' }}>
          <Link href="/" className="text-sm flex items-center gap-2 transition-colors" style={{ color: 'var(--color-text-secondary)' }}>
            <ArrowLeft className="h-3 w-3" />
            Back to Dashboard
          </Link>
        </div>

        {/* Repository Info */}
        {repository && (
          <div className="border-b p-4" style={{ borderColor: 'var(--color-border)' }}>
            <h2 className="font-semibold text-lg" style={{ color: 'var(--color-text-primary)' }}>{repository.name}</h2>
            <p className="text-sm mt-1" style={{ color: 'var(--color-text-secondary)' }}>{repository.description || 'No description'}</p>
            {repository.github_url && (
              <a 
                href={repository.github_url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-sm mt-2 inline-block transition-colors"
                style={{ color: 'var(--color-primary)' }}
              >
                View on GitHub →
              </a>
            )}
          </div>
        )}

        {/* Search */}
        <div className="border-b p-4" style={{ borderColor: 'var(--color-border)' }}>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4" style={{ color: 'var(--color-text-secondary)' }} />
            <input
              type="text"
              placeholder="Search documentation..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full pl-10 pr-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:border-transparent transition-colors"
              style={{ 
                borderColor: 'var(--color-border)', 
                backgroundColor: 'var(--color-canvas)', 
                color: 'var(--color-text-primary)'
              }}
            />
          </div>
        </div>

        {/* Document Navigation */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>Documentation</h3>
              <span className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>{documents.length} docs</span>
            </div>
            <div className="space-y-1">
              {searchQuery ? (
                // Show flat list when searching
                filteredDocuments.map((doc) => (
                  <button
                    key={doc.id}
                    onClick={() => onDocumentSelect(doc)}
                    className="w-full text-left px-3 py-2 rounded-lg text-sm transition-colors flex items-center gap-2"
                    style={selectedDocument?.id === doc.id 
                      ? { backgroundColor: 'var(--color-primary)', color: 'white' }
                      : { color: 'var(--color-text-primary)' }
                    }
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

        {/* Navigation & User section */}
        <div className="border-t p-4" style={{ borderColor: 'var(--color-border)' }}>
          {/* Navigation */}
          <nav className="space-y-1 mb-4">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors"
                style={item.active ? { 
                  backgroundColor: 'var(--overlay-10)', 
                  color: 'var(--color-text-primary)' 
                } : {
                  color: 'var(--color-text-secondary)'
                }}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            ))}
          </nav>

          {/* User section */}
          {user?.email && (
            <div className="flex items-center gap-3 mb-3">
              <div className="h-8 w-8 rounded-full" style={{ backgroundColor: 'var(--color-border)' }} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate" style={{ color: 'var(--color-text-primary)' }}>
                  {user.email}
                </p>
              </div>
              <ThemeToggle />
            </div>
          )}
          
          {!user?.email && (
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>Theme</span>
              <ThemeToggle />
            </div>
          )}
          
          {user?.email && (
            <Button variant="outline" size="sm" className="w-full" onClick={handleLogout}>
              <LogOut className="mr-2 h-4 w-4" />
              Sign out
            </Button>
          )}
        </div>
      </div>
    </aside>
  )
} 