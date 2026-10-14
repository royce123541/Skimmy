import Dexie from 'dexie'
import { useLiveQuery } from 'dexie-react-hooks'
import { latestSkim } from '@/lib/db/queries'
import { getDb } from '@/lib/db/schema'
import { providersWithKeys } from '@/lib/db/secrets'
import type { CloudProviderId } from '@/types/ai.types'
import type { StoredSkim, StoredThread } from '@/types/db.types'

export interface ThreadView {
  readonly thread: StoredThread | null
  readonly messageCount: number
  readonly unskimmedCount: number
  readonly skim: StoredSkim | null
}

async function loadThreadView(threadKey: string): Promise<ThreadView> {
  const db = getDb()
  const thread = (await db.threads.get(threadKey)) ?? null
  const range = db.messages
    .where('[threadKey+order]')
    .between([threadKey, Dexie.minKey], [threadKey, Dexie.maxKey])
  const watermark = thread?.skimWatermark ?? null
  const [messageCount, unskimmedCount, skim] = await Promise.all([
    range.count(),
    watermark === null
      ? range.count()
      : db.messages
          .where('[threadKey+order]')
          .between([threadKey, watermark], [threadKey, Dexie.maxKey], false, true)
          .count(),
    latestSkim(db, threadKey),
  ])
  return { thread, messageCount, unskimmedCount, skim: skim ?? null }
}

/**
 * Live view of one thread: its record, how much is captured and unskimmed, and the latest
 * skim. Re-renders whenever the service worker writes to these tables.
 *
 * @param threadKey - The thread to watch.
 * @returns The view, or undefined while the first query runs.
 */
export function useThreadView(threadKey: string): ThreadView | undefined {
  return useLiveQuery(() => loadThreadView(threadKey), [threadKey])
}

/**
 * Which providers have a saved key. Only existence is read here; keys themselves never leave
 * the service worker's code paths.
 *
 * @returns Provider ids with keys, or undefined while loading.
 */
export function useProvidersWithKeys(): CloudProviderId[] | undefined {
  return useLiveQuery(() => providersWithKeys(getDb()))
}
