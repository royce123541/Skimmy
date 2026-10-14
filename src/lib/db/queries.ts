import Dexie from 'dexie'
import type { SkimmyDb } from '@/lib/db/schema'
import type { StoredMessage, StoredSkim } from '@/types/db.types'

/**
 * All messages of a thread, oldest first.
 *
 * @param db - The database.
 * @param threadKey - The thread to read.
 * @returns Messages sorted by order.
 */
export function messagesInOrder(db: SkimmyDb, threadKey: string): Promise<StoredMessage[]> {
  return db.messages
    .where('[threadKey+order]')
    .between([threadKey, Dexie.minKey], [threadKey, Dexie.maxKey])
    .toArray()
}

/**
 * The most recent skim of a thread.
 *
 * @param db - The database.
 * @param threadKey - The thread to read.
 * @returns The latest skim, or undefined if the thread was never skimmed.
 */
export function latestSkim(db: SkimmyDb, threadKey: string): Promise<StoredSkim | undefined> {
  return db.skims
    .where('[threadKey+createdAt]')
    .between([threadKey, Dexie.minKey], [threadKey, Dexie.maxKey])
    .last()
}
