'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { GitBranch, FileCode, Database, Zap, ArrowRight, Eye, EyeOff } from 'lucide-react'

interface GraphNode {
  id: string
  name: string
  type: 'component' | 'service' | 'database' | 'api'
  dependencies: string[]
  dependents: string[]
  description: string
}

// Dummy data for the codebase graph
const dummyNodes: GraphNode[] = [
  {
    id: 'frontend.components.auth',
    name: 'Auth Components',
    type: 'component',
    dependencies: ['backend.auth.service', 'frontend.utils.validation'],
    dependents: ['frontend.pages.login', 'frontend.components.navbar'],
    description: 'Authentication UI components including login, signup, and password reset forms'
  },
  {
    id: 'backend.auth.service',
    name: 'Auth Service',
    type: 'service',
    dependencies: ['backend.database.users', 'backend.utils.jwt'],
    dependents: ['frontend.components.auth', 'backend.api.auth'],
    description: 'Core authentication service handling user login, registration, and session management'
  },
  {
    id: 'backend.database.users',
    name: 'Users Database',
    type: 'database',
    dependencies: [],
    dependents: ['backend.auth.service', 'backend.api.users'],
    description: 'User data storage and management including profiles, permissions, and settings'
  },
  {
    id: 'backend.api.auth',
    name: 'Auth API',
    type: 'api',
    dependencies: ['backend.auth.service'],
    dependents: ['frontend.components.auth'],
    description: 'REST API endpoints for authentication operations'
  },
  {
    id: 'frontend.utils.validation',
    name: 'Validation Utils',
    type: 'component',
    dependencies: [],
    dependents: ['frontend.components.auth', 'frontend.components.forms'],
    description: 'Client-side validation utilities for forms and user input'
  }
]

const getIcon = (type: string) => {
  switch (type) {
    case 'component':
      return <FileCode className="h-4 w-4" />
    case 'service':
      return <Zap className="h-4 w-4" />
    case 'database':
      return <Database className="h-4 w-4" />
    case 'api':
      return <GitBranch className="h-4 w-4" />
    default:
      return <FileCode className="h-4 w-4" />
  }
}

const getTypeColor = (type: string) => {
  switch (type) {
    case 'component':
      return 'default'
    case 'service':
      return 'success'
    case 'database':
      return 'destructive'
    case 'api':
      return 'secondary'
    default:
      return 'default'
  }
}

export function CodebaseGraph() {
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null)
  const [showDependencies, setShowDependencies] = useState(true)
  const [showDependents, setShowDependents] = useState(true)

  const handleNodeClick = (node: GraphNode) => {
    setSelectedNode(node)
  }

  const getRelatedNodes = (nodeId: string) => {
    const node = dummyNodes.find(n => n.id === nodeId)
    if (!node) return []
    
    const related = new Set<string>()
    if (showDependencies) {
      node.dependencies.forEach(dep => related.add(dep))
    }
    if (showDependents) {
      node.dependents.forEach(dep => related.add(dep))
    }
    
    return Array.from(related)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Interactive Codebase Graph</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Explore dependencies and relationships between system components
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant={showDependencies ? "default" : "outline"}
            size="sm"
            onClick={() => setShowDependencies(!showDependencies)}
          >
            {showDependencies ? <Eye className="h-4 w-4 mr-1" /> : <EyeOff className="h-4 w-4 mr-1" />}
            Dependencies
          </Button>
          <Button
            variant={showDependents ? "default" : "outline"}
            size="sm"
            onClick={() => setShowDependents(!showDependents)}
          >
            {showDependents ? <Eye className="h-4 w-4 mr-1" /> : <EyeOff className="h-4 w-4 mr-1" />}
            Dependents
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Graph visualization */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">System Architecture</CardTitle>
              <CardDescription>Click on any component to explore its relationships</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                {dummyNodes.map((node) => {
                  const isSelected = selectedNode?.id === node.id
                  const isRelated = selectedNode ? getRelatedNodes(selectedNode.id).includes(node.id) : false
                  
                  return (
                    <Button
                      key={node.id}
                      variant={isSelected ? "default" : isRelated ? "outline" : "ghost"}
                      className={`h-auto p-4 flex flex-col items-start space-y-2 ${
                        isSelected ? 'ring-2 ring-gray-400' : ''
                      }`}
                      onClick={() => handleNodeClick(node)}
                    >
                      <div className="flex items-center space-x-2">
                        {getIcon(node.type)}
                        <span className="text-sm font-medium truncate">{node.name}</span>
                      </div>
                      <Badge variant={getTypeColor(node.type) as 'default' | 'secondary' | 'outline' | 'destructive' | 'success'} size="sm">
                        {node.type}
                      </Badge>
                      <div className="text-xs text-left text-gray-500 dark:text-gray-400 line-clamp-2">
                        {node.id}
                      </div>
                    </Button>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Details panel */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                {selectedNode ? 'Component Details' : 'Select a Component'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {selectedNode ? (
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center space-x-2 mb-2">
                      {getIcon(selectedNode.type)}
                      <span className="font-medium">{selectedNode.name}</span>
                    </div>
                    <Badge variant={getTypeColor(selectedNode.type) as 'default' | 'secondary' | 'outline' | 'destructive' | 'success'} size="sm" className="mb-2">
                      {selectedNode.type}
                    </Badge>
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      {selectedNode.description}
                    </p>
                  </div>

                  <div className="text-xs text-gray-500 dark:text-gray-400 font-mono">
                    {selectedNode.id}
                  </div>

                  {selectedNode.dependencies.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium mb-2 flex items-center">
                        <ArrowRight className="h-3 w-3 mr-1" />
                        Dependencies ({selectedNode.dependencies.length})
                      </h4>
                      <div className="space-y-1">
                        {selectedNode.dependencies.map((dep) => (
                          <div key={dep} className="text-xs text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-800 p-2 rounded">
                            {dep}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {selectedNode.dependents.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium mb-2 flex items-center">
                        <ArrowRight className="h-3 w-3 mr-1 rotate-180" />
                        Used by ({selectedNode.dependents.length})
                      </h4>
                      <div className="space-y-1">
                        {selectedNode.dependents.map((dep) => (
                          <div key={dep} className="text-xs text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-800 p-2 rounded">
                            {dep}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Click on any component in the graph to view its dependencies, relationships, and detailed information.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
} 