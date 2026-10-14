import { describe, expect, test } from 'vitest'
import { mapProviderError } from '@/lib/ai/providerErrors'

function httpError(status: number, message: string): Error & { status: number } {
  return Object.assign(new Error(message), { status })
}

describe('mapProviderError', () => {
  test.each([
    [httpError(401, 'unauthorized'), 'auth'],
    [httpError(403, 'forbidden'), 'auth'],
    [httpError(400, 'API key not valid. Please pass a valid API key.'), 'auth'],
    [httpError(429, 'quota'), 'rate_limited'],
    [httpError(503, 'unavailable'), 'overloaded'],
    [new TypeError('Failed to fetch'), 'network'],
    [httpError(400, 'invalid schema'), 'internal'],
  ])('maps %s to %s', (error, code) => {
    // Act
    const result = mapProviderError(error, 'Gemini')

    // Assert
    expect(result.success ? null : result.error.code).toBe(code)
  })
})
