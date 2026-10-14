import type { ContentScriptContext } from '#imports'
import type { CaptureHost } from '@/lib/adapters/core/captureEngine'
import { sendMessage } from '@/lib/messaging/protocol'
import type { RpcResult } from '@/types/rpc.types'

function warnOnFailure<T>(action: string): (result: RpcResult<T>) => void {
  return result => {
    if (!result.success) {
      console.warn(`Skimmy: ${action} was rejected`, result.error)
    }
  }
}

/**
 * Adapts WXT's content-script context to the CaptureEngine. Timers and listeners created
 * through `ctx` stop automatically when the extension reloads or updates.
 *
 * @param ctx - The content script context.
 * @returns A host for `startCapture`.
 */
export function createContextHost(ctx: ContentScriptContext): CaptureHost {
  return {
    currentUrl: () => new URL(window.location.href),
    onUrlChange: listener => {
      ctx.addEventListener(window, 'wxt:locationchange', listener)
    },
    setInterval: (callback, ms) => {
      ctx.setInterval(callback, ms)
    },
    setTimeout: (callback, ms) => ctx.setTimeout(callback, ms),
    clearTimeout: id => {
      window.clearTimeout(id)
    },
    sendIngest: async (conversation, messages) => {
      const result = await sendMessage('ingestBatch', { conversation, messages })
      warnOnFailure('capture batch')(result)
    },
    sendConversationChanged: async conversation => {
      const result = await sendMessage('conversationChanged', { conversation })
      warnOnFailure('conversation change')(result)
    },
    reportDegraded: reason => {
      console.warn(`Skimmy: capture degraded. ${reason}`)
    },
  }
}
