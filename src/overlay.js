import { devtools, devtoolsRouterInfo, devtoolsState, getInspector, stringify, toggleHighPerfMode } from '@vue/devtools-kit'

import { createRPCClient } from 'vite-dev-rpc'
import { createHotContext } from 'vite-hot-client'

console.log('[Overlay] Overlay script starting...')

const base = import.meta.env.BASE_URL || '/'
console.log('[Overlay] Base URL:', base)
const hot = createHotContext('',base)
const PINIA_INSPECTOR_ID = 'pinia'
const COMPONENTS_INSPECTOR_ID = 'components'
console.log('[Overlay] Inspector IDs - Components:', COMPONENTS_INSPECTOR_ID, 'Pinia:', PINIA_INSPECTOR_ID)

console.log('[Overlay] Initializing devtools...')
devtools.init()
console.log('[Overlay] Devtools initialized')

let highlightComponentTimeout = null

function flattenChildren(node) {
  console.log('[Overlay] flattenChildren called, node:', node?.name || 'unknown')
  const result = []

  function traverse(node) {
    if (!node)
      return
    result.push(node)

    if (Array.isArray(node.children)) {
      node.children.forEach(child => traverse(child))
    }
  }

  traverse(node)
  console.log('[Overlay] flattenChildren result count:', result.length)
  return result
}

console.log('[Overlay] Creating RPC client...')
const rpc = createRPCClient(
  'vite-plugin-vue-mcp',
  hot,
  {
    // get component tree
    async getInspectorTree(query) {
      console.log('[Overlay] getInspectorTree called, event:', query.event)
      const inspectorTree = await devtools.api.getInspectorTree({
        inspectorId: COMPONENTS_INSPECTOR_ID,
        filter: '',
      })
      console.log('[Overlay] getInspectorTree result:', inspectorTree?.length, 'items')
      rpc.onInspectorTreeUpdated(query.event, inspectorTree[0])
      console.log('[Overlay] getInspectorTree response sent')
    },
    // get component state
    async getInspectorState(query) {
      console.log('[Overlay] getInspectorState called, event:', query.event, 'componentName:', query.componentName)
      const inspectorTree = await devtools.api.getInspectorTree({
        inspectorId: COMPONENTS_INSPECTOR_ID,
        filter: '',
      })
      const flattenedChildren = flattenChildren(inspectorTree[0])
      const targetNode = flattenedChildren.find(child => child.name === query.componentName)
      console.log('[Overlay] getInspectorState targetNode found:', !!targetNode, 'id:', targetNode?.id)
      const inspectorState = await devtools.api.getInspectorState({
        inspectorId: COMPONENTS_INSPECTOR_ID,
        nodeId: targetNode.id,
      })
      console.log('[Overlay] getInspectorState state retrieved, keys:', Object.keys(inspectorState || {}))
      rpc.onInspectorStateUpdated(query.event, stringify(inspectorState))
      console.log('[Overlay] getInspectorState response sent')
    },

    // edit component state
    async editComponentState(query) {
      console.log('[Overlay] editComponentState called, componentName:', query.componentName, 'path:', query.path, 'value:', query.value)
      const inspectorTree = await devtools.api.getInspectorTree({
        inspectorId: COMPONENTS_INSPECTOR_ID,
        filter: '',
      })
      const flattenedChildren = flattenChildren(inspectorTree[0])
      const targetNode = flattenedChildren.find(child => child.name === query.componentName)
      console.log('[Overlay] editComponentState targetNode found:', !!targetNode, 'id:', targetNode?.id)
      const payload = {
        inspectorId: COMPONENTS_INSPECTOR_ID,
        nodeId: targetNode.id,
        path: query.path,
        state: {
          new: null,
          remove: false,
          type: query.valueType,
          value: query.value,
        },
        type: undefined,
      }
      await devtools.ctx.api.editInspectorState(payload)
      console.log('[Overlay] editComponentState executed')
    },

    // highlight component
    async highlightComponent(query) {
      console.log('[Overlay] highlightComponent called, componentName:', query.componentName)
      clearTimeout(highlightComponentTimeout)
      const inspectorTree = await devtools.api.getInspectorTree({
        inspectorId: COMPONENTS_INSPECTOR_ID,
        filter: '',
      })
      const flattenedChildren = flattenChildren(inspectorTree[0])
      const targetNode = flattenedChildren.find(child => child.name === query.componentName)
      console.log('[Overlay] highlightComponent targetNode found:', !!targetNode, 'id:', targetNode?.id)
      devtools.ctx.hooks.callHook('componentHighlight', { uid: targetNode.id })
      highlightComponentTimeout = setTimeout(() => {
        devtools.ctx.hooks.callHook('componentUnhighlight')
      }, 5000)
      console.log('[Overlay] highlightComponent executed')
    },
    // get router info
    async getRouterInfo(query) {
      console.log('[Overlay] getRouterInfo called, event:', query.event)
      console.log('[Overlay] devtoolsRouterInfo:', devtoolsRouterInfo)
      rpc.onRouterInfoUpdated(query.event, JSON.stringify(devtoolsRouterInfo, null, 2))
      console.log('[Overlay] getRouterInfo response sent')
    },
    // get pinia tree
    async getPiniaTree(query) {
      console.log('[Overlay] getPiniaTree called, event:', query.event)
      const highPerfModeEnabled = devtoolsState.highPerfModeEnabled
      console.log('[Overlay] getPiniaTree highPerfModeEnabled:', highPerfModeEnabled)
      if (highPerfModeEnabled) {
        toggleHighPerfMode(false)
      }
      const inspectorTree = await devtools.api.getInspectorTree({
        inspectorId: PINIA_INSPECTOR_ID,
        filter: '',
      })
      console.log('[Overlay] getPiniaTree result:', inspectorTree?.length, 'items')
      if (highPerfModeEnabled) {
        toggleHighPerfMode(true)
      }
      rpc.onPiniaTreeUpdated(query.event, inspectorTree)
      console.log('[Overlay] getPiniaTree response sent')
    },
    // get pinia state
    async getPiniaState(query) {
      console.log('[Overlay] getPiniaState called, event:', query.event, 'storeName:', query.storeName)
      const highPerfModeEnabled = devtoolsState.highPerfModeEnabled
      console.log('[Overlay] getPiniaState highPerfModeEnabled:', highPerfModeEnabled)
      if (highPerfModeEnabled) {
        toggleHighPerfMode(false)
      }
      const payload = {
        inspectorId: PINIA_INSPECTOR_ID,
        nodeId: query.storeName,
      }
      const inspector = getInspector(payload.inspectorId)

      if (inspector) {
        inspector.selectedNodeId = payload.nodeId
        console.log('[Overlay] getPiniaState inspector found, selectedNodeId set to:', payload.nodeId)
      } else {
        console.log('[Overlay] getPiniaState inspector not found')
      }

      const res = await devtools.ctx.api.getInspectorState(payload)
      console.log('[Overlay] getPiniaState state retrieved, keys:', Object.keys(res || {}))
      if (highPerfModeEnabled) {
        toggleHighPerfMode(true)
      }
      rpc.onPiniaInfoUpdated(query.event, stringify(res))
      console.log('[Overlay] getPiniaState response sent')
    },
  },
  {
    timeout: -1,
  },
)
console.log('[Overlay] RPC client created')
