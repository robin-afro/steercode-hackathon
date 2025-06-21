'use client'

import { useEffect, useState, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, CheckCircle, XCircle, Clock, Zap, FileText, Link, DollarSign } from 'lucide-react'

interface LogEntry {
  level: 'info' | 'error' | 'success'
  message: string
  timestamp: string
}

interface GenerationMetrics {
  discoveryTimeMs: number
  extractionTimeMs: number
  planningTimeMs: number
  generationTimeMs: number
  totalTimeMs: number
  componentsExtracted: number
  artifactsDiscovered: number
}

interface GenerationState {
  status: 'connecting' | 'running' | 'completed' | 'error'
  repositoryName?: string
  sessionId?: string
  logs: LogEntry[]
  metrics?: GenerationMetrics
  documentsGenerated?: number
  error?: string
}

export default function GeneratePage() {
  const params = useParams()
  const router = useRouter()
  const repositoryId = params.id as string
  
  const [state, setState] = useState<GenerationState>({
    status: 'connecting',
    logs: []
  })
  
  const eventSourceRef = useRef<EventSource | null>(null)
  const logsEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [state.logs])

  useEffect(() => {
    const startGeneration = async () => {
      try {
        // Start the streaming generation
        const response = await fetch('/api/analyze/repository/stream', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ repositoryId }),
        })

        if (!response.ok) {
          throw new Error('Failed to start generation')
        }

        if (!response.body) {
          throw new Error('No response body')
        }

        const reader = response.body.getReader()
        const decoder = new TextDecoder()
        let buffer = ''
        let currentEvent = ''

        setState(prev => ({ ...prev, status: 'running' }))

        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split('\n')
          
          // Keep the last incomplete line in the buffer
          buffer = lines.pop() || ''

          for (const line of lines) {
            if (line.trim() === '') {
              // Empty line indicates end of event
              currentEvent = ''
              continue
            }
            
            if (line.startsWith('event: ')) {
              currentEvent = line.substring(7).trim()
              continue
            }
            
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.substring(6))
                
                switch (currentEvent) {
                  case 'start':
                    setState(prev => ({
                      ...prev,
                      repositoryName: data.repositoryName,
                      sessionId: data.sessionId
                    }))
                    break
                    
                  case 'log':
                    setState(prev => ({
                      ...prev,
                      logs: [...prev.logs, {
                        level: data.level === 'error' ? 'error' : 'info',
                        message: data.message,
                        timestamp: data.timestamp
                      }]
                    }))
                    break
                    
                  case 'complete':
                    setState(prev => ({
                      ...prev,
                      status: 'completed',
                      metrics: data.metrics,
                      documentsGenerated: data.documentsGenerated,
                      sessionId: data.sessionId
                    }))
                    break
                    
                  case 'error':
                    setState(prev => ({
                      ...prev,
                      status: 'error',
                      error: data.message
                    }))
                    break
                }
              } catch (e) {
                console.error('Failed to parse SSE data:', e, line)
              }
            }
          }
        }
      } catch (error) {
        setState(prev => ({
          ...prev,
          status: 'error',
          error: error instanceof Error ? error.message : 'Unknown error'
        }))
      }
    }

    startGeneration()

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close()
      }
    }
  }, [repositoryId])

  const getStatusIcon = () => {
    switch (state.status) {
      case 'connecting':
        return <Clock className="h-5 w-5 text-blue-500 animate-spin" />
      case 'running':
        return <Zap className="h-5 w-5 text-yellow-500 animate-pulse" />
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-500" />
      case 'error':
        return <XCircle className="h-5 w-5 text-red-500" />
    }
  }

  const getStatusText = () => {
    switch (state.status) {
      case 'connecting':
        return 'Connecting...'
      case 'running':
        return 'Generating Documentation...'
      case 'completed':
        return 'Generation Complete!'
      case 'error':
        return 'Generation Failed'
    }
  }

  const formatTime = (ms: number) => {
    return `${(ms / 1000).toFixed(1)}s`
  }

  const formatCost = (cost: number) => {
    return `$${cost.toFixed(4)}`
  }

  return (
    <div className="min-h-screen bg-canvas p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.back()}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-semibold text-foreground">
              Documentation Generation
            </h1>
            {state.repositoryName && (
              <p className="text-sm text-muted-foreground">
                {state.repositoryName}
              </p>
            )}
          </div>
        </div>

        {/* Status Card */}
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-4">
            {getStatusIcon()}
            <h2 className="text-lg font-medium">{getStatusText()}</h2>
            <Badge variant={state.status === 'completed' ? 'default' : state.status === 'error' ? 'destructive' : 'secondary'}>
              {state.status}
            </Badge>
          </div>

          {state.status === 'running' && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Processing...</span>
                <span>{state.logs.length} log entries</span>
              </div>
              <Progress value={undefined} className="w-full" />
            </div>
          )}

          {state.error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
              <p className="text-red-700 dark:text-red-300">{state.error}</p>
            </div>
          )}
        </Card>

        {/* Metrics Card */}
        {state.metrics && (
          <Card className="p-6">
            <h3 className="text-lg font-medium mb-4 flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Generation Results
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">{state.documentsGenerated}</div>
                <div className="text-sm text-muted-foreground">Documents</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">{state.metrics.componentsExtracted}</div>
                <div className="text-sm text-muted-foreground">Components</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">{state.metrics.artifactsDiscovered}</div>
                <div className="text-sm text-muted-foreground">Files</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">{formatTime(state.metrics.totalTimeMs)}</div>
                <div className="text-sm text-muted-foreground">Total Time</div>
              </div>
            </div>
            
            <div className="mt-4 pt-4 border-t border-border">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Discovery:</span>
                  <span className="ml-2 font-medium">{formatTime(state.metrics.discoveryTimeMs)}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Extraction:</span>
                  <span className="ml-2 font-medium">{formatTime(state.metrics.extractionTimeMs)}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Planning:</span>
                  <span className="ml-2 font-medium">{formatTime(state.metrics.planningTimeMs)}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Generation:</span>
                  <span className="ml-2 font-medium">{formatTime(state.metrics.generationTimeMs)}</span>
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* Logs Card */}
        <Card className="p-6">
          <h3 className="text-lg font-medium mb-4">Generation Logs</h3>
          <div className="bg-black rounded-lg p-4 max-h-96 overflow-y-auto font-mono text-sm">
            {state.logs.length === 0 ? (
              <div className="text-gray-500">Waiting for logs...</div>
            ) : (
              state.logs.map((log, index) => (
                <div key={index} className="mb-1">
                  <span className="text-gray-400 text-xs">
                    {new Date(log.timestamp).toLocaleTimeString()}
                  </span>
                  <span 
                    className={`ml-2 ${
                      log.level === 'error' 
                        ? 'text-red-400' 
                        : log.message.includes('✅') || log.message.includes('✨')
                        ? 'text-green-400'
                        : log.message.includes('📄') || log.message.includes('🧩')
                        ? 'text-blue-400'
                        : log.message.includes('🔄')
                        ? 'text-yellow-400'
                        : 'text-gray-200'
                    }`}
                  >
                    {log.message}
                  </span>
                </div>
              ))
            )}
            <div ref={logsEndRef} />
          </div>
        </Card>

        {/* Action Buttons */}
        {state.status === 'completed' && (
          <div className="flex gap-4">
            <Button
              onClick={() => router.push(`/repositories/${repositoryId}/docs`)}
              className="flex items-center gap-2"
            >
              <FileText className="h-4 w-4" />
              View Documentation
            </Button>
            <Button
              variant="outline"
              onClick={() => router.push('/')}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Dashboard
            </Button>
          </div>
        )}
      </div>
    </div>
  )
} 