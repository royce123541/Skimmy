import type { ConversationRef } from '@/types/platform.types'

/**
 * Builds the stable key for a conversation: `platform:workspace:conversation`.
 *
 * @param conversation - The conversation reported by an adapter.
 * @returns The thread key used across storage and messaging.
 * @example
 * toThreadKey({ platform: 'messenger', workspaceId: '_', conversationId: '123', ... })
 * // 'messenger:_:123'
 */
export function toThreadKey(
  conversation: Pick<ConversationRef, 'platform' | 'workspaceId' | 'conversationId'>,
): string {
  return `${conversation.platform}:${conversation.workspaceId}:${conversation.conversationId}`
}
