import { createClient } from '@/lib/supabase/server'
import { NextRequest } from 'next/server'
import { AdvancedGenerator, Logger } from '@/services/advanced-generator'

export async function POST(request: NextRequest) {
  const { repositoryId, pruneOutdated = true } = await request.json()

  if (!repositoryId) {
    return new Response('Repository ID is required', { status: 400 })
  }

  // Set up Server-Sent Events
  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    start(controller) {
      // Function to send events to the client
      const sendEvent = (event: string, data: any) => {
        const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`
        controller.enqueue(encoder.encode(message))
      }

      // Start the generation process
      const generateDocs = async () => {
        try {
          const supabase = await createClient()
          const { data: { user } } = await supabase.auth.getUser()

          if (!user) {
            sendEvent('error', { message: 'Unauthorized' })
            controller.close()
            return
          }

          // Get the user's GitHub access token
          const { data: { session } } = await supabase.auth.getSession()
          const provider_token = session?.provider_token

          if (!provider_token) {
            sendEvent('error', { message: 'No GitHub access token found' })
            controller.close()
            return
          }

          // Get repository info
          const { data: repository } = await supabase
            .from('repositories')
            .select('*')
            .eq('id', repositoryId)
            .eq('user_id', user.id)
            .single()

          if (!repository) {
            sendEvent('error', { message: 'Repository not found' })
            controller.close()
            return
          }

          sendEvent('start', { 
            repositoryName: repository.full_name,
            sessionId: null // Will be set when generation starts
          })

          // Create a streaming logger that sends events instead of console override
          const streamLogger: Logger = {
            log: (...args: any[]) => {
              const message = args.join(' ')
              sendEvent('log', { 
                level: 'info', 
                message,
                timestamp: new Date().toISOString()
              })
            },
            error: (...args: any[]) => {
              const message = args.join(' ')
              sendEvent('log', { 
                level: 'error', 
                message,
                timestamp: new Date().toISOString()
              })
            }
          }

          // Create generator and run with dedicated logger
          const generator = new AdvancedGenerator()
          const result = await generator.generateDocumentation(
            repositoryId,
            provider_token,
            'full',
            pruneOutdated,
            streamLogger
          )

          if (result.success) {
            sendEvent('complete', {
              success: true,
              documentsGenerated: result.documentsGenerated,
              metrics: result.metrics,
              sessionId: result.sessionId
            })
          } else {
            sendEvent('error', { 
              message: result.error || 'Generation failed',
              sessionId: result.sessionId
            })
          }

        } catch (error) {
          sendEvent('error', { 
            message: error instanceof Error ? error.message : 'Unknown error occurred'
          })
        } finally {
          controller.close()
        }
      }

      generateDocs()
    }
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
} 