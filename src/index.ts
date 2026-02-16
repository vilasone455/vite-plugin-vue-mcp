import type { Plugin, ResolvedConfig, ViteDevServer } from 'vite'
import type { RpcFunctions, VueMcpContext, VueMcpOptions } from './types'
import { existsSync } from 'node:fs'
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import c from 'ansis'
import { join } from 'pathe'
import { normalizePath, searchForWorkspaceRoot } from 'vite'
import { createRPCServer } from 'vite-dev-rpc'
import { setupRoutes } from './connect'
import { createVueMcpContext } from './context'
import { createServerRpc } from './rpc'

function getVueMcpPath(): string {
  const pluginPath = normalizePath(path.dirname(fileURLToPath(import.meta.url)))
  return pluginPath.replace(/\/dist$/, '/\/src')
}
const vueMcpResourceSymbol = '?__vue-mcp-resource'

export function VueMcp(options: VueMcpOptions = {}): Plugin {
  console.log('[VueMcp] Initializing plugin with options:', options)
  const {
    mcpPath = '/__mcp',
    updateCursorMcpJson = true,
    printUrl = true,
    mcpServer = (vite: ViteDevServer, ctx: VueMcpContext) => import('./server').then(m => m.createMcpServerDefault(options, vite, ctx)),
  } = options

  const cursorMcpOptions = typeof updateCursorMcpJson == 'boolean'
    ? { enabled: updateCursorMcpJson }
    : updateCursorMcpJson

  let config: ResolvedConfig
  const vueMcpPath = getVueMcpPath()
  const vueMcpOptionsImportee = 'virtual:vue-mcp-options'
  const resolvedVueMcpOptions = `\0${vueMcpOptionsImportee}`

  const ctx = createVueMcpContext()

  return {
    name: 'vite-plugin-mcp',
    enforce: 'pre',
    apply: 'serve',
    async configureServer(vite) {
      console.log('[VueMcp] Configuring server...')
      const rpc = createServerRpc(ctx)
      console.log('[VueMcp] RPC server created')

      const rpcServer = createRPCServer<RpcFunctions, any>(
        'vite-plugin-vue-mcp',
        vite.ws,
        rpc,
        {
          timeout: -1,
        },
      )
      ctx.rpcServer = rpcServer
      ctx.rpc = rpc
      console.log('[VueMcp] RPC server assigned to context')

      let mcp = await mcpServer(vite, ctx)
      console.log('[VueMcp] MCP server created')
      mcp = await options.mcpServerSetup?.(mcp, vite) || mcp
      console.log('[VueMcp] MCP server setup complete')
      await setupRoutes(mcpPath, mcp, vite)
      console.log('[VueMcp] Routes setup complete')

      const port = vite.config.server.port || 5173
      const root = searchForWorkspaceRoot(vite.config.root)
      console.log('[VueMcp] Server port:', port, 'Root:', root)

      const sseUrl = `http://${options.host || 'localhost'}:${port}${mcpPath}/sse`
      console.log('[VueMcp] SSE URL:', sseUrl)

      if (cursorMcpOptions.enabled) {
        console.log('[VueMcp] Updating Cursor MCP JSON...')
        if (existsSync(join(root, '.cursor'))) {
          const mcp = existsSync(join(root, '.cursor/mcp.json'))
            ? JSON.parse(await fs.readFile(join(root, '.cursor/mcp.json'), 'utf-8') || '{}')
            : {}
          mcp.mcpServers ||= {}
          mcp.mcpServers[cursorMcpOptions.serverName || 'vue-mcp'] = { url: sseUrl }
          await fs.writeFile(join(root, '.cursor/mcp.json'), `${JSON.stringify(mcp, null, 2)}\n`)
          console.log('[VueMcp] Cursor MCP JSON updated')
        } else {
          console.log('[VueMcp] .cursor folder does not exist, skipping Cursor MCP JSON update')
        }
      }

      if (printUrl) {
        setTimeout(() => {
          // eslint-disable-next-line no-console
          console.log(`${c.yellow.bold`  ➜  MCP:     `}Server is running at ${sseUrl}`)
        }, 300)
      }
    },
    async resolveId(importee: string) {
      if (importee === vueMcpOptionsImportee) {
        return resolvedVueMcpOptions
      }
      else if (importee.startsWith('virtual:vue-mcp-path:')) {
        const resolved = importee.replace('virtual:vue-mcp-path:', `${vueMcpPath}/`)
        return `${resolved}${vueMcpResourceSymbol}`
      }
    },
    configResolved(resolvedConfig) {
      console.log('[VueMcp] Config resolved:', resolvedConfig.root)
      config = resolvedConfig
    },
    transform(code, id, _options) {
      if (_options?.ssr)
        return

      const appendTo = options.appendTo
      const [filename] = id.split('?', 2)

      if (appendTo
        && (
          (typeof appendTo === 'string' && filename.endsWith(appendTo))
          || (appendTo instanceof RegExp && appendTo.test(filename)))) {
        console.log('[VueMcp] Transforming file (appendTo):', filename)
        code = `import 'virtual:vue-mcp-path:overlay.js';\n${code}`
      }

      return code
    },
    transformIndexHtml(html) {
      if (options.appendTo)
        return

      console.log('[VueMcp] Transforming index.html, injecting overlay script')
      return {
        html,
        tags: [
          {
            tag: 'script',
            injectTo: 'head-prepend',
            attrs: {
              type: 'module',
              src: `${config.base || '/'}@id/virtual:vue-mcp-path:overlay.js`,
            },
          },
        ],
      }
    },
  }
}
