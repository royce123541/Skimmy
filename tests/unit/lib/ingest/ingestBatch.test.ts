import { afterEach, beforeEach, describe, expect, test } from 'vitest'
import { messagesInOrder } from '@/lib/db/queries'
import { createDb, type SkimmyDb } from '@/lib/db/schema'
import { ingestBatch } from '@/lib/ingest/ingestBatch'
import type { ConversationRef } from '@/types/platform.types'
import { message } from '../../helpers/messages'

const conversation: ConversationRef = {
  platform: 'messenger',
  workspaceId: '_',
  conversationId: '1234',
  title: 'Weekend Trip Crew',
  isGroup: true,
  url: 'https://www.facebook.com/messages/t/1234',
}

describe('ingestBatch', () => {
  let db: SkimmyDb

  beforeEach(() => {
    db = createDb(`test-${crypto.randomUUID()}`)
  })

  afterEach(async () => {
    await db.delete()
  })

  test('stores each visible message exactly once across repeated observations', async () => {
    // Arrange
    const window = [message('Who has the deposit?'), message('I can', 'You')]

    // Act
    await ingestBatch(db, conversation, window, 1000)
    const second = await ingestBatch(db, conversation, window, 2000)

    // Assert
    expect(second.added).toBe(0)
    const stored = await messagesInOrder(db, 'messenger:_:1234')
    expect(stored.map(row => row.text)).toEqual(['Who has the deposit?', 'I can'])
    expect(stored[1]?.senderIsSelf).toBe(true)
  })

  test('keeps chronological order when older history is captured later', async () => {
    // Arrange
    await ingestBatch(db, conversation, [message('c'), message('d')], 1000)

    // Act
    await ingestBatch(db, conversation, [message('a'), message('b'), message('c')], 2000)

    // Assert
    const stored = await messagesInOrder(db, 'messenger:_:1234')
    expect(stored.map(row => row.text)).toEqual(['a', 'b', 'c', 'd'])
  })

  test('creates the thread record and preserves its skim watermark on later captures', async () => {
    // Arrange
    await ingestBatch(db, conversation, [message('a')], 1000)
    await db.threads.update('messenger:_:1234', { skimWatermark: 1024 })

    // Act
    await ingestBatch(db, { ...conversation, title: 'Renamed' }, [message('a'), message('b')], 5000)

    // Assert
    const thread = await db.threads.get('messenger:_:1234')
    expect(thread).toMatchObject({ title: 'Renamed', skimWatermark: 1024, lastCapturedAt: 5000 })
  })
})
