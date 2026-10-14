import { tabConversationsItem } from '@/lib/storage/items'
import { toThreadKey } from '@/lib/threadKeys'
import type { ConversationRef } from '@/types/platform.types'

/**
 * Records which conversation a tab shows, or clears it when the tab left a chat.
 *
 * @param tabId - The tab that reported.
 * @param conversation - The open conversation, or null.
 */
export async function rememberTab(
  tabId: number,
  conversation: ConversationRef | null,
): Promise<void> {
  const current = await tabConversationsItem.getValue()
  const { [String(tabId)]: _previous, ...others } = current
  const next =
    conversation === null
      ? others
      : {
          ...others,
          [String(tabId)]: {
            threadKey: toThreadKey(conversation),
            platform: conversation.platform,
            title: conversation.title,
          },
        }
  await tabConversationsItem.setValue(next)
}

/**
 * Drops a closed tab from the registry.
 *
 * @param tabId - The closed tab.
 */
export async function forgetTab(tabId: number): Promise<void> {
  await rememberTab(tabId, null)
}
