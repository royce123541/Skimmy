import { fail } from '@/lib/messaging/rpcResult'
import type { RpcResult } from '@/types/rpc.types'

const HTTP_BAD_REQUEST = 400
const HTTP_UNAUTHORIZED = 401
const HTTP_FORBIDDEN = 403
const HTTP_TOO_MANY_REQUESTS = 429
const HTTP_SERVER_ERROR = 500

function statusOf(error: unknown): number | null {
  if (typeof error === 'object' && error !== null && 'status' in error) {
    const { status } = error
    return typeof status === 'number' ? status : null
  }
  return null
}

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

/**
 * Normalizes an SDK or network error from any provider into one RPC error code, so the UI
 * shows the same message for the same kind of failure (plan §2.8).
 *
 * @param error - Whatever the provider SDK threw.
 * @param providerName - Human-readable provider name for messages.
 * @returns A failed RPC result.
 */
export function mapProviderError<T>(error: unknown, providerName: string): RpcResult<T> {
  const status = statusOf(error)
  const message = messageOf(error)
  if (
    status === HTTP_UNAUTHORIZED ||
    status === HTTP_FORBIDDEN ||
    (status === HTTP_BAD_REQUEST && /api[ _-]?key/i.test(message))
  ) {
    return fail('auth', `${providerName} rejected the API key. Check it in Skimmy settings.`)
  }
  if (status === HTTP_TOO_MANY_REQUESTS) {
    return fail('rate_limited', `${providerName} is rate limiting requests. Try again shortly.`)
  }
  if (status !== null && status >= HTTP_SERVER_ERROR) {
    return fail('overloaded', `${providerName} is unavailable right now. Try again shortly.`)
  }
  if (status === null && error instanceof TypeError) {
    return fail('network', `Couldn't reach ${providerName}. Check your connection.`)
  }
  return fail('internal', `${providerName} request failed: ${message}`)
}
