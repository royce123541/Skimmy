/**
 * Failure categories shared by every RPC handler and LLM provider, so the UI can
 * map each one to a single, consistent message.
 */
export type RpcErrorCode =
  | 'invalid_input'
  | 'not_found'
  | 'auth'
  | 'rate_limited'
  | 'overloaded'
  | 'refused'
  | 'blocked_by_safety'
  | 'invalid_output'
  | 'network'
  | 'internal'

export interface RpcError {
  readonly code: RpcErrorCode
  readonly message: string
}

/** The `{ success, data, error }` envelope every RPC handler returns. */
export type RpcResult<T> =
  | { readonly success: true; readonly data: T }
  | { readonly success: false; readonly error: RpcError }
