import type { VueMcpContext } from './types'
import { createHooks } from 'hookable'

export function createVueMcpContext(): VueMcpContext {
  console.log('[Context] Creating VueMcp context')
  return {
    hooks: createHooks(),
    rpc: null!,
    rpcServer: null!,
  }
}
