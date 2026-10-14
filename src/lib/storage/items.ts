import { storage } from '#imports'
import type { PlatformId } from '@/types/platform.types'

/** What the side panel needs to show "Current chat" for a tab. */
export interface TabConversation {
  readonly threadKey: string
  readonly platform: PlatformId
  readonly title: string
}

/**
 * Which conversation each tab shows, keyed by tab id. Session storage survives service
 * worker restarts, clears on browser restart, and is hidden from content scripts.
 */
export const tabConversationsItem = storage.defineItem<Record<string, TabConversation>>(
  'session:tabConversations',
  { fallback: {} },
)
