import type { RpcErrorCode, RpcResult } from '@/types/rpc.types'

/**
 * Wraps a handler's payload in a successful RPC envelope.
 *
 * @param data - The payload to return to the caller.
 * @returns A result with `success: true` and the payload.
 * @example
 * return ok({ threadKey: 'messenger:_:1234' })
 */
export function ok<T>(data: T): RpcResult<T> {
  return { success: true, data }
}

/**
 * Builds a failed RPC envelope.
 *
 * @param code - The failure category the UI switches on.
 * @param message - A human-readable explanation, safe to show to the user.
 * @returns A result with `success: false` and the error.
 * @example
 * return fail('invalid_input', 'threadKey is required')
 */
export function fail<T = never>(code: RpcErrorCode, message: string): RpcResult<T> {
  return { success: false, error: { code, message } }
}

/**
 * Converts anything a handler caught into a failed RPC envelope, so handlers
 * never let raw exceptions cross a messaging boundary.
 *
 * @param error - The caught value; it may not be an `Error` instance.
 * @param code - The failure category; defaults to `internal`.
 * @returns A result with `success: false` describing the error.
 * @example
 * try {
 *   return ok(await loadThread(threadKey))
 * } catch (error) {
 *   return fromError(error)
 * }
 */
export function fromError<T = never>(
  error: unknown,
  code: RpcErrorCode = 'internal',
): RpcResult<T> {
  const message = error instanceof Error ? error.message : String(error)
  return fail(code, message)
}
