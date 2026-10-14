import Dexie from 'dexie'
import { useLiveQuery } from 'dexie-react-hooks'
import { latestSkim } from '@/lib/db/queries'
import { getDb } from '@/lib/db/schema'
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
 * Whether a Gemini key is saved. Only existence is read here; the key itself never leaves
 * the service worker's code paths.
 *
 * @returns True or false, or undefined while loading.
 */
export function useHasGeminiKey(): boolean | undefined {
  return useLiveQuery(
    async () => (await getDb().secrets.where('name').equals('gemini').count()) > 0,
  )
}
