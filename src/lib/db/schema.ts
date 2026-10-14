import Dexie, { type EntityTable } from 'dexie'
import type { StoredMessage, StoredSecret, StoredSkim, StoredThread } from '@/types/db.types'

/** IndexedDB in the extension origin; never opened from content scripts (ADR 0004). */
export type SkimmyDb = Dexie & {
  threads: EntityTable<StoredThread, 'threadKey'>
  messages: EntityTable<StoredMessage, 'messageKey'>
  skims: EntityTable<StoredSkim, 'id'>
  secrets: EntityTable<StoredSecret, 'name'>
}

/**
 * Opens (or creates) the Skimmy database.
 *
 * @param name - Database name; tests pass a unique one.
 * @returns The typed Dexie instance.
 */
export function createDb(name = 'skimmy'): SkimmyDb {
  const db = new Dexie(name) as SkimmyDb
  db.version(1).stores({
    threads: 'threadKey, platform, lastCapturedAt',
    messages: 'messageKey, [threadKey+order], capturedAt',
    skims: 'id, [threadKey+createdAt]',
    secrets: 'name',
  })
  return db
}

let sharedDb: SkimmyDb | null = null

/**
 * The database shared by every context in the extension origin.
 *
 * @returns The lazily opened database.
 */
export function getDb(): SkimmyDb {
  sharedDb ??= createDb()
  return sharedDb
}
