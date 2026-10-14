import { afterEach, beforeEach, describe, expect, test } from 'vitest'
import { resolveProvider } from '@/lib/ai/gateway'
import { createDb, type SkimmyDb } from '@/lib/db/schema'
import { providersWithKeys, saveApiKey } from '@/lib/db/secrets'
import { modelFor, type AiSettings } from '@/lib/storage/aiSettings'

describe('resolveProvider', () => {
  let db: SkimmyDb

  beforeEach(async () => {
    db = createDb(`test-${crypto.randomUUID()}`)
    await saveApiKey(db, 'gemini', 'g-key', 0)
    await saveApiKey(db, 'claude', 'c-key', 0)
  })

  afterEach(async () => {
    await db.delete()
  })

  test('uses the default provider with the chosen model', async () => {
    // Arrange
    const settings: AiSettings = { provider: 'claude', models: { claude: 'claude-haiku-5-5' } }

    // Act
    const result = await resolveProvider(db, settings)

    // Assert
    expect(result.success && [result.data.id, result.data.model]).toEqual([
      'claude',
      'claude-haiku-5-5',
    ])
  })

  test('uses a one-off provider choice over the default', async () => {
    // Act
    const result = await resolveProvider(db, { provider: 'claude', models: {} }, 'gemini')

    // Assert
    expect(result.success && result.data.id).toBe('gemini')
  })

  test('fails with auth instead of falling back when the chosen provider has no key', async () => {
    // Act
    const result = await resolveProvider(db, { provider: 'openai', models: {} })

    // Assert
    expect(result.success ? null : result.error.code).toBe('auth')
  })

  test('lists only providers that have a saved key', async () => {
    // Act
    const providers = await providersWithKeys(db)

    // Assert
    expect(providers).toEqual(['gemini', 'claude'])
  })
})

describe('modelFor', () => {
  test('falls back to the default when a saved model is no longer offered', () => {
    // Act
    const model = modelFor(
      { provider: 'gemini', models: { gemini: 'gemini-1.0-retired' } },
      'gemini',
    )

    // Assert
    expect(model).toBe('gemini-3.5-flash-lite')
  })
})
