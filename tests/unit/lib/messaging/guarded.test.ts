import { describe, expect, test } from 'vitest'
import { z } from 'zod'
import { guarded } from '@/lib/messaging/guarded'
import { ok } from '@/lib/messaging/rpcResult'

const sender: chrome.runtime.MessageSender = {}
const Schema = z.strictObject({ threadKey: z.string().min(1) })

describe('guarded', () => {
  test('passes validated data to the handler', async () => {
    // Arrange
    const handler = guarded(Schema, data => Promise.resolve(ok(data.threadKey.toUpperCase())))

    // Act
    const result = await handler({ data: { threadKey: 'abc' }, sender })

    // Assert
    expect(result).toEqual(ok('ABC'))
  })

  test('rejects invalid payloads without calling the handler', async () => {
    // Arrange
    let called = false
    const handler = guarded(Schema, () => {
      called = true
      return Promise.resolve(ok(null))
    })

    // Act
    const result = await handler({ data: { threadKey: '', extra: true }, sender })

    // Assert
    expect(result.success).toBe(false)
    expect(result.success ? null : result.error.code).toBe('invalid_input')
    expect(called).toBe(false)
  })

  test('turns a thrown error into a failed envelope', async () => {
    // Arrange
    const handler = guarded(Schema, () => Promise.reject(new Error('disk full')))

    // Act
    const result = await handler({ data: { threadKey: 'abc' }, sender })

    // Assert
    expect(result).toEqual({ success: false, error: { code: 'internal', message: 'disk full' } })
  })
})
