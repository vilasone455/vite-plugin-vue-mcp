import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import type { ViteDevServer } from 'vite'
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js'
import DEBUG from 'debug'

const debug = DEBUG('vite:mcp:server')

export async function setupRoutes(base: string, server: McpServer, vite: ViteDevServer): Promise<void> {
  console.log('[Connect] Setting up routes, base:', base)
  const transports = new Map<string, SSEServerTransport>()
  let isConnected = false
  let activeSessionId: string | null = null
  console.log('[Connect] Routes initialized, transports map created')

  vite.middlewares.use(`${base}/sse`, async (req, res) => {
    console.log('[Connect] SSE connection request received from:', req.socket.remoteAddress)
    const transport = new SSEServerTransport(`${base}/messages`, res)
    
    // Close existing connection if there is one
    if (isConnected && activeSessionId) {
      debug('Closing existing connection %s before new connection', activeSessionId)
      console.log('[Connect] Closing existing connection:', activeSessionId)
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
        console.log('[Connect] Error closing existing connection:', e)
        // Continue anyway
      }
    }

    transports.set(transport.sessionId, transport)
    activeSessionId = transport.sessionId
    debug('SSE Connected %s', transport.sessionId)
    console.log('[Connect] SSE Connected, sessionId:', transport.sessionId, 'Total transports:', transports.size)

    res.on('close', () => {
      debug('SSE Closed %s', transport.sessionId)
      console.log('[Connect] SSE Closed, sessionId:', transport.sessionId)
      transports.delete(transport.sessionId)
      if (activeSessionId === transport.sessionId) {
        isConnected = false
        activeSessionId = null
      }
    })
    
    await server.connect(transport)
    isConnected = true
    console.log('[Connect] Server connected to transport, sessionId:', transport.sessionId)
  })

  vite.middlewares.use(`${base}/messages`, async (req, res) => {
    console.log('[Connect] Message received, method:', req.method, 'url:', req.url)
    if (req.method !== 'POST') {
      res.statusCode = 405
      res.end('Method Not Allowed')
      console.log('[Connect] Method not allowed:', req.method)
      return
    }

    const query = new URLSearchParams(req.url?.split('?').pop() || '')
    const clientId = query.get('sessionId')
    console.log('[Connect] Message clientId:', clientId)

    if (!clientId || typeof clientId !== 'string') {
      res.statusCode = 400
      res.end('Bad Request')
      console.log('[Connect] Bad request - no clientId')
      return
    }

    const transport = transports.get(clientId)
    if (!transport) {
      res.statusCode = 404
      res.end('Not Found')
      console.log('[Connect] Transport not found for clientId:', clientId, 'Available transports:', Array.from(transports.keys()))
      return
    }

    debug('Message from %s', clientId)
    console.log('[Connect] Handling message from:', clientId)
    await transport.handlePostMessage(req, res)
    console.log('[Connect] Message handled for:', clientId)
  })

  console.log('[Connect] Routes setup complete')
}