import type { ViteDevServer } from 'vite'
import type { VueMcpContext, VueMcpOptions } from './types'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { nanoid } from 'nanoid'
import { z } from 'zod'
import { version } from '../package.json'

export function createMcpServerDefault(
  options: VueMcpOptions,
  vite: ViteDevServer,
  ctx: VueMcpContext,
): McpServer {
  console.log('[McpServer] Creating MCP server...')
  const server = new McpServer(
    {
      name: 'vite',
      version,
      ...options.mcpServerInfo,
    },
  )
  console.log('[McpServer] MCP server instance created')

  server.tool(
    'get-component-tree',
    'Get the Vue component tree in markdown tree syntax format.',
    {
    },
    async () => {
      console.log('[McpServer] Tool called: get-component-tree')
      return new Promise((resolve) => {
        const eventName = nanoid()
        console.log('[McpServer] get-component-tree event:', eventName)
        ctx.hooks.hookOnce(eventName, (res) => {
          console.log('[McpServer] get-component-tree response received')
          resolve({
            content: [{
              type: 'text',
              text: JSON.stringify(res),
            }],
          })
        })
        ctx.rpcServer.getInspectorTree({ event: eventName })
      })
    },
  )

  server.tool(
    'get-component-state',
    'Get the Vue component state in JSON structure format.',
    {
      componentName: z.string(),
    },
    async ({ componentName }) => {
      console.log('[McpServer] Tool called: get-component-state, component:', componentName)
      return new Promise((resolve) => {
        const eventName = nanoid()
        console.log('[McpServer] get-component-state event:', eventName)
        ctx.hooks.hookOnce(eventName, (res) => {
          console.log('[McpServer] get-component-state response received')
          resolve({
            content: [{
              type: 'text',
              text: JSON.stringify(res),
            }],
          })
        })
        ctx.rpcServer.getInspectorState({ event: eventName, componentName })
      })
    },
  )

  server.tool(
    'edit-component-state',
    'Edit the Vue component state.',
    {
      componentName: z.string(),
      path: z.array(z.string()),
      value: z.string(),
      valueType: z.enum(['string', 'number', 'boolean', 'object', 'array']),
    },
    async ({ componentName, path, value, valueType }) => {
      console.log('[McpServer] Tool called: edit-component-state, component:', componentName, 'path:', path, 'value:', value, 'type:', valueType)
      return new Promise((resolve) => {
        ctx.rpcServer.editComponentState({ componentName, path, value, valueType })
        console.log('[McpServer] edit-component-state executed')
        resolve({
          content: [{
            type: 'text',
            text: 'ok',
          }],
        })
      })
    },
  )

  server.tool(
    'highlight-component',
    'Highlight the Vue component.',
    {
      componentName: z.string(),
    },
    async ({ componentName }) => {
      console.log('[McpServer] Tool called: highlight-component, component:', componentName)
      return new Promise((resolve) => {
        ctx.rpcServer.highlightComponent({ componentName })
        console.log('[McpServer] highlight-component executed')
        resolve({
          content: [{
            type: 'text',
            text: 'ok',
          }],
        })
      })
    },
  )

  server.tool(
    'get-router-info',
    'Get the Vue router info in JSON structure format.',
    {
    },
    async () => {
      console.log('[McpServer] Tool called: get-router-info')
      return new Promise((resolve) => {
        const eventName = nanoid()
        console.log('[McpServer] get-router-info event:', eventName)
        ctx.hooks.hookOnce(eventName, (res) => {
          console.log('[McpServer] get-router-info response received')
          resolve({
            content: [{
              type: 'text',
              text: JSON.stringify(res),
            }],
          })
        })
        ctx.rpcServer.getRouterInfo({ event: eventName })
      })
    },
  )

  server.tool(
    'get-pinia-state',
    'Get the Pinia state in JSON structure format.',
    {
      storeName: z.string(),
    },
    async ({ storeName }) => {
      console.log('[McpServer] Tool called: get-pinia-state, store:', storeName)
      return new Promise((resolve) => {
        const eventName = nanoid()
        console.log('[McpServer] get-pinia-state event:', eventName)
        ctx.hooks.hookOnce(eventName, (res) => {
          console.log('[McpServer] get-pinia-state response received')
          resolve({
            content: [{
              type: 'text',
              text: JSON.stringify(res),
            }],
          })
        })
        ctx.rpcServer.getPiniaState({ event: eventName, storeName })
      })
    },
  )

  server.tool(
    'get-pinia-tree',
    'Get the Pinia tree in JSON structure format.',
    {
    },
    async () => {
      console.log('[McpServer] Tool called: get-pinia-tree')
      return new Promise((resolve) => {
        const eventName = nanoid()
        console.log('[McpServer] get-pinia-tree event:', eventName)
        ctx.hooks.hookOnce(eventName, (res) => {
          console.log('[McpServer] get-pinia-tree response received')
          resolve({
            content: [{
              type: 'text',
              text: JSON.stringify(res),
            }],
          })
        })
        ctx.rpcServer.getPiniaTree({ event: eventName })
      })
    },
  )

  console.log('[McpServer] All tools registered, returning server')
  return server
}
