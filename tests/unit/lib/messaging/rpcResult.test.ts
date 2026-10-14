import { describe, expect, test } from 'vitest'
import { fail, fromError, ok } from '@/lib/messaging/rpcResult'

describe('rpcResult', () => {
  test('ok wraps the payload in a successful envelope', () => {
    // Arrange
    const payload = { threadKey: 'messenger:_:1234' }

    // Act
    const result = ok(payload)

    // Assert
    expect(result).toEqual({ success: true, data: payload })
  })

  test('fail builds an envelope carrying the error code and message', () => {
    // Arrange
    const message = 'threadKey is required'

    // Act
    const result = fail('invalid_input', message)

    // Assert
    expect(result).toEqual({ success: false, error: { code: 'invalid_input', message } })
  })

  test('fromError keeps the message of a thrown Error and defaults to internal', () => {
    // Arrange
    const thrown = new Error('IndexedDB is unavailable')

    // Act
    const result = fromError(thrown)

    // Assert
    expect(result).toEqual({
      success: false,
      error: { code: 'internal', message: 'IndexedDB is unavailable' },
    })
  })

  test('fromError describes thrown non-Error values instead of failing', () => {
    // Arrange
    const thrown = 'socket closed'

    // Act
    const result = fromError(thrown, 'network')

    // Assert
    expect(result).toEqual({ success: false, error: { code: 'network', message: 'socket closed' } })
  })
})
