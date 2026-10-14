import { z } from 'zod'
import { fail, fromError } from '@/lib/messaging/rpcResult'
import type { RpcResult } from '@/types/rpc.types'

export interface IncomingMessage {
  readonly data: unknown
  readonly sender: chrome.runtime.MessageSender
}

/**
 * Wraps an RPC handler so its payload is validated with Zod first and any thrown error
 * becomes a failed envelope. Data from content scripts comes from web pages, so it is never
 * trusted unchecked (plan §1.4).
 *
 * @param schema - Validates the incoming payload.
 * @param handler - Runs with the validated payload.
 * @returns A listener for `onMessage`.
 * @example
 * onMessage('requestSkim', guarded(RequestSkimSchema, data => skim(data.threadKey)))
 */
export function guarded<TSchema extends z.ZodType, TResult>(
  schema: TSchema,
  handler: (
    data: z.output<TSchema>,
    sender: chrome.runtime.MessageSender,
  ) => Promise<RpcResult<TResult>>,
): (message: IncomingMessage) => Promise<RpcResult<TResult>> {
  return async message => {
    const parsed = schema.safeParse(message.data)
    if (!parsed.success) {
      return fail('invalid_input', z.prettifyError(parsed.error))
    }
    try {
      return await handler(parsed.data, message.sender)
    } catch (error) {
      console.error('Skimmy: message handler failed', error)
      return fromError(error)
    }
  }
}
