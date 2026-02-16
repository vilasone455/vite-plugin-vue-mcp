import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import type { ViteDevServer } from 'vite'
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js'
import DEBUG from 'debug'

const debug = DEBUG('vite:mcp:server')

export async function setupRoutes(base: string, server: McpServer, vite: ViteDevServer): Promise<void> {
  const transports = new Map<string, SSEServerTransport>()
  let isConnected = false
  let activeSessionId: string | null = null

  vite.middlewares.use(`${base}/sse`, async (req, res) => {
    const transport = new SSEServerTransport(`${base}/messages`, res)
    
    // Close existing connection if there is one
    if (isConnected && activeSessionId) {
      debug('Closing existing connection %s before new connection', activeSessionId)
      try {
        await server.close()
        const oldTransport = transports.get(activeSessionId)
        if (oldTransport) {
          transports.delete(activeSessionId)
        }
        isConnected = false
        activeSessionId = null
      } catch (e) {
        debug('Error closing existing connection:', e)
        // Continue anyway
      }
    }

    transports.set(transport.sessionId, transport)
    activeSessionId = transport.sessionId
    debug('SSE Connected %s', transport.sessionId)
    
    res.on('close', () => {
      debug('SSE Closed %s', transport.sessionId)
      transports.delete(transport.sessionId)
      if (activeSessionId === transport.sessionId) {
        isConnected = false
        activeSessionId = null
      }
    })
    
    await server.connect(transport)
    isConnected = true
  })

  vite.middlewares.use(`${base}/messages`, async (req, res) => {
    if (req.method !== 'POST') {
      res.statusCode = 405
      res.end('Method Not Allowed')
      return
    }

    const query = new URLSearchParams(req.url?.split('?').pop() || '')
    const clientId = query.get('sessionId')

    if (!clientId || typeof clientId !== 'string') {
      res.statusCode = 400
      res.end('Bad Request')
      return
    }

    const transport = transports.get(clientId)
    if (!transport) {
      res.statusCode = 404
      res.end('Not Found')
      return
    }

    debug('Message from %s', clientId)
    await transport.handlePostMessage(req, res)
  })
}