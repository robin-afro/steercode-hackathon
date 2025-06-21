'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { SearchBar } from '@/components/ui/search-bar'
import { ChevronRight, ChevronDown, FileText, Folder, Clock, Link as LinkIcon, Star } from 'lucide-react'

interface DocumentNode {
  id: string
  title: string
  type: 'folder' | 'document'
  children?: DocumentNode[]
  content?: string
  lastUpdated?: string
  crossReferences?: string[]
  importance?: 'high' | 'medium' | 'low'
}

// Dummy documentation data with hierarchical structure
const dummyDocs: DocumentNode[] = [
  {
    id: 'backend',
    title: 'Backend',
    type: 'folder',
    children: [
      {
        id: 'backend.auth',
        title: 'Authentication',
        type: 'folder',
        children: [
          {
            id: 'backend.auth.overview',
            title: 'Authentication Overview',
            type: 'document',
            content: 'Comprehensive guide to the authentication system including JWT tokens, session management, and security best practices.',
            lastUpdated: '2 hours ago',
            crossReferences: ['backend.database.users', 'frontend.components.auth'],
            importance: 'high'
          },
          {
            id: 'backend.auth.middleware',
            title: 'Auth Middleware',
            type: 'document',
            content: 'Middleware functions for protecting routes and validating user permissions.',
            lastUpdated: '1 day ago',
            crossReferences: ['backend.api.routes'],
            importance: 'medium'
          }
        ]
      },
      {
        id: 'backend.database',
        title: 'Database',
        type: 'folder',
        children: [
          {
            id: 'backend.database.schema',
            title: 'Database Schema',
            type: 'document',
            content: 'Complete database schema documentation including table relationships, indexes, and migration patterns.',
            lastUpdated: '5 hours ago',
            crossReferences: ['backend.migrations'],
            importance: 'high'
          },
          {
            id: 'backend.database.users',
            title: 'User Management',
            type: 'document',
            content: 'User table structure, relationships, and data access patterns.',
            lastUpdated: '3 days ago',
            crossReferences: ['backend.auth.overview'],
            importance: 'high'
          }
        ]
      }
    ]
  },
  {
    id: 'frontend',
    title: 'Frontend',
    type: 'folder',
    children: [
      {
        id: 'frontend.components',
        title: 'Components',
        type: 'folder',
        children: [
          {
            id: 'frontend.components.auth',
            title: 'Auth Components',
            type: 'document',
            content: 'Reusable authentication components including login forms, signup flows, and protected routes.',
            lastUpdated: '6 hours ago',
            crossReferences: ['backend.auth.overview', 'frontend.utils.validation'],
            importance: 'high'
          },
          {
            id: 'frontend.components.ui',
            title: 'UI Components',
            type: 'document',
            content: 'Design system components including buttons, cards, modals, and form elements.',
            lastUpdated: '1 day ago',
            crossReferences: [],
            importance: 'medium'
          }
        ]
      },
      {
        id: 'frontend.utils',
        title: 'Utilities',
        type: 'folder',
        children: [
          {
            id: 'frontend.utils.validation',
            title: 'Validation Utils',
            type: 'document',
            content: 'Client-side validation functions for forms, inputs, and data processing.',
            lastUpdated: '2 days ago',
            crossReferences: ['frontend.components.auth'],
            importance: 'medium'
          }
        ]
      }
    ]
  }
]

interface DocumentationBrowserProps {
  selectedDocId?: string | null
  onDocumentSelect?: (document: DocumentNode) => void
  onGenerateExplanation?: (documentId: string) => void
}

export function DocumentationBrowser({ selectedDocId, onDocumentSelect, onGenerateExplanation }: DocumentationBrowserProps) {
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set(['backend', 'frontend']))
  const [selectedDocument, setSelectedDocument] = useState<DocumentNode | null>(null)
  const [, setSearchQuery] = useState('')
  const [isSearching, setIsSearching] = useState(false)

  const toggleNode = (nodeId: string) => {
    const newExpanded = new Set(expandedNodes)
    if (newExpanded.has(nodeId)) {
      newExpanded.delete(nodeId)
    } else {
      newExpanded.add(nodeId)
    }
    setExpandedNodes(newExpanded)
  }

  const selectDocument = (doc: DocumentNode) => {
    if (doc.type === 'document') {
      setSelectedDocument(doc)
      onDocumentSelect?.(doc)
    }
  }

  const handleSearch = (query: string) => {
    setIsSearching(true)
    setSearchQuery(query)
    // Simulate search delay
    setTimeout(() => {
      setIsSearching(false)
    }, 1000)
  }

  const renderNode = (node: DocumentNode, level: number = 0) => {
    const isExpanded = expandedNodes.has(node.id)
    const isSelected = selectedDocument?.id === node.id
    const indent = level * 16

    return (
      <div key={node.id}>
        <div
          className={`flex items-center py-1 px-2 hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer rounded ${
            isSelected ? 'bg-gray-100 dark:bg-gray-800' : ''
          }`}
          style={{ paddingLeft: `${indent + 8}px` }}
          onClick={() => {
            if (node.type === 'folder') {
              toggleNode(node.id)
            } else {
              selectDocument(node)
            }
          }}
        >
          {node.type === 'folder' ? (
            <>
              {isExpanded ? (
                <ChevronDown className="h-4 w-4 mr-1 text-gray-400" />
              ) : (
                <ChevronRight className="h-4 w-4 mr-1 text-gray-400" />
              )}
              <Folder className="h-4 w-4 mr-2 text-blue-500" />
            </>
          ) : (
            <>
              <div className="w-5" />
              <FileText className="h-4 w-4 mr-2 text-gray-500" />
            </>
          )}
          <span className="text-sm flex-1">{node.title}</span>
          {node.type === 'document' && node.importance === 'high' && (
            <Star className="h-3 w-3 text-yellow-500 ml-1" />
          )}
        </div>
        
        {node.type === 'folder' && isExpanded && node.children && (
          <div>
            {node.children.map(child => renderNode(child, level + 1))}
          </div>
        )}
      </div>
    )
  }

  const getImportanceColor = (importance?: string) => {
    switch (importance) {
      case 'high':
        return 'destructive'
      case 'medium':
        return 'secondary'
      case 'low':
        return 'outline'
      default:
        return 'default'
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 h-full">
      {/* Navigation Tree */}
      <div className="lg:col-span-1">
        <Card className="h-full">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Documentation</CardTitle>
            <CardDescription>Browse the living documentation</CardDescription>
            <SearchBar
              onSearch={handleSearch}
              isLoading={isSearching}
              className="mt-2"
            />
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-1 max-h-96 overflow-y-auto">
              {dummyDocs.map(node => renderNode(node))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Content View */}
      <div className="lg:col-span-2">
        <Card className="h-full">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <CardTitle className="text-base">
                  {selectedDocument ? selectedDocument.title : 'Select Documentation'}
                </CardTitle>
                {selectedDocument && (
                  <div className="flex items-center space-x-2 mt-2">
                    <div className="text-xs text-gray-500 dark:text-gray-400 font-mono">
                      {selectedDocument.id}
                    </div>
                    {selectedDocument.importance && (
                                             <Badge variant={getImportanceColor(selectedDocument.importance) as 'default' | 'secondary' | 'outline' | 'destructive' | 'success'} size="sm">
                        {selectedDocument.importance} priority
                      </Badge>
                    )}
                  </div>
                )}
              </div>
              {selectedDocument?.lastUpdated && (
                <div className="flex items-center text-xs text-gray-500 dark:text-gray-400">
                  <Clock className="h-3 w-3 mr-1" />
                  {selectedDocument.lastUpdated}
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {selectedDocument ? (
              <div className="space-y-4">
                <div className="prose dark:prose-invert max-w-none">
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    {selectedDocument.content}
                  </p>
                </div>

                {selectedDocument.crossReferences && selectedDocument.crossReferences.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium mb-2 flex items-center">
                      <LinkIcon className="h-3 w-3 mr-1" />
                      Cross References ({selectedDocument.crossReferences.length})
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {selectedDocument.crossReferences.map((ref) => (
                        <Button
                          key={ref}
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs"
                          onClick={() => {
                            // In a real implementation, this would navigate to the referenced document
                            console.log('Navigate to:', ref)
                          }}
                        >
                          {ref}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="pt-4 border-t">
                  <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                    <span>This documentation is automatically generated and updated with code changes</span>
                    <Button variant="ghost" size="sm" className="h-6 text-xs">
                      View Source
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <FileText className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Select a document from the navigation tree to view its content and cross-references.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
} 