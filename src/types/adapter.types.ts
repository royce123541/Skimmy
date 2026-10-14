import type { CapturedMessage, ConversationRef, PlatformId } from '@/types/platform.types'

/**
 * Platform-specific DOM reader (ADR 0005). Adapters never observe, batch or send; the
 * CaptureEngine does. Sidebar and jump-to-message methods arrive in later phases.
 */
export interface PlatformAdapter {
  readonly platform: PlatformId
  readonly selectorPackVersion: string
  getActiveConversation(url: URL): ConversationRef | null
  getMessageListRoot(): Element | null
  readVisibleMessages(): readonly CapturedMessage[]
  /**
   * Asks the page for one step of older history, the way a user scrolling up would.
   * Returns false when there's no message list to scroll.
   */
  loadOlder(): boolean
}
