import type { ContentScriptContext } from '#imports'
import { catchUp } from '@/lib/adapters/core/catchUp'
import type { CaptureSession } from '@/lib/adapters/core/captureEngine'
import { onMessage } from '@/lib/messaging/protocol'
import { fail, ok } from '@/lib/messaging/rpcResult'
import { StartCatchUpSchema } from '@/lib/messaging/schemas'
import type { PlatformAdapter } from '@/types/adapter.types'

/**
 * Lets the side panel start and cancel a catch-up in this tab. One runs at a time; a second
 * request while one is running reports `busy`.
 *
 * @param ctx - The content script context, for timers that stop when the extension reloads.
 * @param adapter - The platform's DOM reader.
 * @param session - The running capture session, flushed at every step.
 */
export function listenForCatchUp(
  ctx: ContentScriptContext,
  adapter: PlatformAdapter,
  session: CaptureSession,
): void {
  let running: AbortController | null = null
  const host = {
    wait: (ms: number) =>
      new Promise<void>(resolve => {
        ctx.setTimeout(resolve, ms)
      }),
    now: () => Date.now(),
    flush: () => {
      session.flushNow()
    },
  }

  onMessage('startCatchUp', async message => {
    const parsed = StartCatchUpSchema.safeParse(message.data)
    if (!parsed.success) {
      return fail('invalid_input', 'Choose between 10 and 300 messages.')
    }
    if (running !== null) {
      return ok({ collected: 0, reason: 'busy' as const })
    }
    const controller = new AbortController()
    running = controller
    try {
      return ok(await catchUp(adapter, host, parsed.data.target, controller.signal))
    } finally {
      running = null
    }
  })

  onMessage('cancelCatchUp', () => {
    running?.abort()
    return ok(null)
  })
}
