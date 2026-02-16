import type { RpcFunctions, VueMcpContext } from './types'

export function createServerRpc(ctx: VueMcpContext): RpcFunctions {
  console.log('[RPC] Creating server RPC functions')
  return {
    // component tree
    getInspectorTree: (_: { event: string, componentName?: string }) => {
      console.log('[RPC] getInspectorTree called, event:', _.event)
      return {}
    },
    onInspectorTreeUpdated: (event: string, data: string) => {
      console.log('[RPC] onInspectorTreeUpdated called, event:', event, 'data length:', JSON.stringify(data).length)
      ctx.hooks.callHook(event, data)
    },
    // component state
    getInspectorState: (_: { event: string, componentName: string }) => {
      console.log('[RPC] getInspectorState called, event:', _.event, 'componentName:', _.componentName)
      return {}
    },
    onInspectorStateUpdated: (event: string, data: string) => {
      console.log('[RPC] onInspectorStateUpdated called, event:', event, 'data length:', JSON.stringify(data).length)
      ctx.hooks.callHook(event, data)
    },
    // router info
    getRouterInfo: (_: { event: string }) => {
      console.log('[RPC] getRouterInfo called, event:', _.event)
      return {}
    },
    onRouterInfoUpdated: (event: string, data: string) => {
      console.log('[RPC] onRouterInfoUpdated called, event:', event, 'data length:', JSON.stringify(data).length)
      ctx.hooks.callHook(event, data)
    },
    // pinia tree
    getPiniaTree: (_: { event: string }) => {
      console.log('[RPC] getPiniaTree called, event:', _.event)
      return {}
    },
    onPiniaTreeUpdated: (event: string, data: string) => {
      console.log('[RPC] onPiniaTreeUpdated called, event:', event, 'data length:', JSON.stringify(data).length)
      ctx.hooks.callHook(event, data)
    },
    // pinia state
    getPiniaState: (_: { event: string, storeName: string }) => {
      console.log('[RPC] getPiniaState called, event:', _.event, 'storeName:', _.storeName)
      return {}
    },
    onPiniaInfoUpdated: (event: string, data: string) => {
      console.log('[RPC] onPiniaInfoUpdated called, event:', event, 'data length:', JSON.stringify(data).length)
      ctx.hooks.callHook(event, data)
    },
  }
}
