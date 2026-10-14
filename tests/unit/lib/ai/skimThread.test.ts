import { afterEach, beforeEach, describe, expect, test } from 'vitest'
import { skimThread, type SkimDependencies } from '@/lib/ai/skimThread'
import { createDb, type SkimmyDb } from '@/lib/db/schema'
import { ingestBatch } from '@/lib/ingest/ingestBatch'
import { fail, ok } from '@/lib/messaging/rpcResult'
import type { LlmProvider, SkimRequest } from '@/types/ai.types'
import type { ConversationRef } from '@/types/platform.types'
import { message } from '../../helpers/messages'

const conversation: ConversationRef = {
  platform: 'messenger',
  workspaceId: '_',
  conversationId: '7',
  title: 'Trip',
  isGroup: true,
  url: 'https://www.facebook.com/messages/t/7',
}
const threadKey = 'messenger:_:7'

function fakeProvider(json: unknown, requests: SkimRequest[] = []): LlmProvider {
  return {
    id: 'gemini',
    model: 'test-model',
    generateSkim: request => {
      requests.push(request)
      return Promise.resolve(
        ok({ json, model: 'test-model', usage: { inputTokens: 10, outputTokens: 5 } }),
      )
    },
  }
}

const validOutput = {
  tldr: 'You offered to pay the deposit.',
  highlights: [{ text: 'Deposit due Friday', refs: ['m1', 'm9'] }],
  actionItems: [{ task: 'Pay deposit', owner: 'You', ownerIsMe: true, due: null, refs: ['m2'] }],
  questionsForMe: [{ text: 'Invented question', refs: ['m42'] }],
  decisions: [{ text: 'You pay the deposit', refs: ['m2'] }],
  events: [
    {
      title: 'Planning call',
      start: '1970-01-01T20:00:00Z',
      end: null,
      allDay: false,
      location: null,
      certainty: 'proposed',
      refs: ['m1'],
    },
    {
      title: 'Misread date',
      start: '1990-05-01',
      end: null,
      allDay: true,
      location: null,
      certainty: 'confirmed',
      refs: ['m1'],
    },
  ],
}

describe('skimThread', () => {
  let db: SkimmyDb
  let deps: SkimDependencies

  beforeEach(async () => {
    db = createDb(`test-${crypto.randomUUID()}`)
    deps = {
      db,
      provider: fakeProvider(validOutput),
      now: new Date(0),
      timeZone: 'UTC',
      outputLanguage: 'en',
    }
    await ingestBatch(
      db,
      conversation,
      [message('Deposit due Friday'), message('I can pay', 'You')],
      1,
    )
  })

  afterEach(async () => {
    await db.delete()
  })

  test('stores a grounded skim and drops items that cite unknown messages', async () => {
    // Act
    const result = await skimThread(deps, threadKey)

    // Assert
    expect(result.success).toBe(true)
    const skim = await db.skims.toCollection().first()
    expect(skim?.result.highlights[0]?.sourceKeys).toHaveLength(1)
    expect(skim?.result.actionItems[0]?.ownerIsMe).toBe(true)
    expect(skim?.result.questionsForMe).toEqual([])
    expect(skim?.result.decisions).toHaveLength(1)
  })

  test('flags events dated implausibly far from the message that mentions them', async () => {
    // Act
    await skimThread(deps, threadKey)

    // Assert
    const events = (await db.skims.toCollection().first())?.result.events
    expect(events?.map(event => [event.title, event.needsReview])).toEqual([
      ['Planning call', false],
      ['Misread date', true],
    ])
  })

  test('advances the watermark so the next skim only sees newer messages', async () => {
    // Arrange
    const requests: SkimRequest[] = []
    await skimThread(deps, threadKey)
    await ingestBatch(db, conversation, [message('I can pay', 'You'), message('Thanks!')], 2)

    // Act
    await skimThread({ ...deps, provider: fakeProvider(validOutput, requests) }, threadKey)

    // Assert
    expect(requests[0]?.userPrompt).toContain('Mia: Thanks!')
    expect(requests[0]?.userPrompt).not.toContain('Deposit due Friday')
  })

  test('reports nothing to do when no messages arrived since the last skim', async () => {
    // Arrange
    await skimThread(deps, threadKey)

    // Act
    const result = await skimThread(deps, threadKey)

    // Assert
    expect(result).toEqual(fail('not_found', 'No new messages since the last skim.'))
  })

  test('skims the newest N messages on request, even if they were already skimmed', async () => {
    // Arrange
    const requests: SkimRequest[] = []
    await skimThread(deps, threadKey)

    // Act
    const result = await skimThread(
      { ...deps, provider: fakeProvider(validOutput, requests) },
      threadKey,
      1,
    )

    // Assert
    expect(result.success).toBe(true)
    expect(requests[0]?.userPrompt).toContain('You: I can pay')
    expect(requests[0]?.userPrompt).not.toContain('Deposit due Friday')
  })

  test('rejects output that does not match the schema without moving the watermark', async () => {
    // Arrange
    const broken = { ...deps, provider: fakeProvider({ tldr: 42 }) }

    // Act
    const result = await skimThread(broken, threadKey)

    // Assert
    expect(result.success).toBe(false)
    expect((await db.threads.get(threadKey))?.skimWatermark).toBeNull()
  })
})
