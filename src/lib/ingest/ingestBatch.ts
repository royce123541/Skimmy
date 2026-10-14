import { messagesInOrder } from '@/lib/db/queries'
import type { SkimmyDb } from '@/lib/db/schema'
import { alignWindow, type PlacedMessage } from '@/lib/ingest/alignment'
import { toThreadKey } from '@/lib/threadKeys'
import type { StoredMessage, StoredThread } from '@/types/db.types'
import type { CapturedMessage, ConversationRef } from '@/types/platform.types'

export interface IngestOutcome {
  readonly threadKey: string
  readonly added: number
}

function toStoredMessage(
  threadKey: string,
  placed: PlacedMessage,
  capturedAt: number,
  startsSegment: boolean,
): StoredMessage {
  const { message } = placed
  const idPart = message.platformMessageId ?? crypto.randomUUID()
  return {
    messageKey: `${threadKey}:${idPart}`,
    threadKey,
    order: placed.order,
    fingerprint: placed.fingerprint,
    platformMessageId: message.platformMessageId,
    senderName: message.sender.name,
    senderIsSelf: message.sender.isSelf,
    text: message.text,
    sentAt: message.sentAt,
    timePrecision: message.timePrecision,
    replyToExcerpt: message.replyToExcerpt,
    attachments: message.attachments,
    isSystemEvent: message.isSystemEvent,
    capturedAt,
    startsSegment,
  }
}

function nextThread(
  existing: StoredThread | undefined,
  conversation: ConversationRef,
  now: number,
): StoredThread {
  return {
    threadKey: toThreadKey(conversation),
    platform: conversation.platform,
    workspaceId: conversation.workspaceId,
    conversationId: conversation.conversationId,
    title: conversation.title,
    isGroup: conversation.isGroup,
    url: conversation.url,
    lastCapturedAt: now,
    skimWatermark: existing?.skimWatermark ?? null,
  }
}

/**
 * Stores the new messages from one observed window. Reading, aligning and writing happen
 * in a single read-write transaction, so two tabs on the same chat can't double-store.
 *
 * @param db - The database.
 * @param conversation - The conversation the window belongs to.
 * @param window - Messages visible on screen, top to bottom.
 * @param now - Capture time in epoch ms.
 * @returns The thread key and how many messages were new.
 */
export function ingestBatch(
  db: SkimmyDb,
  conversation: ConversationRef,
  window: readonly CapturedMessage[],
  now: number,
): Promise<IngestOutcome> {
  const threadKey = toThreadKey(conversation)
  return db.transaction('rw', db.threads, db.messages, async () => {
    const existing = await db.threads.get(threadKey)
    await db.threads.put(nextThread(existing, conversation, now))
    const stored = await messagesInOrder(db, threadKey)
    const { placed, startsNewSegment } = alignWindow(stored, window)
    const rows = placed.map((item, index) =>
      toStoredMessage(threadKey, item, now, startsNewSegment && index === 0),
    )
    await db.messages.bulkPut(rows)
    return { threadKey, added: rows.length }
  })
}
