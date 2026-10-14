import { readText } from '@/lib/adapters/core/domText'
import { readMessages } from '@/lib/adapters/core/packReader'
import { queryFirst, type SelectorPack } from '@/lib/adapters/core/selectorPack'
import type { PlatformAdapter } from '@/types/adapter.types'
import type { CapturedMessage, ConversationRef } from '@/types/platform.types'

/** `/messages/t/<id>` on facebook.com, `/t/<id>` on messenger.com; E2EE chats add `/e2ee`. */
const THREAD_PATH = /^\/(?:messages\/)?(?:e2ee\/)?t\/([^/?#]+)/
const TITLE_SUFFIX = /\s*[|•-]\s*(Messenger|Facebook)\s*$/i

/**
 * Extracts the Messenger thread id from a URL.
 *
 * @param url - The page URL.
 * @returns The thread id, or null when the page isn't a conversation.
 */
export function threadIdFromUrl(url: URL): string | null {
  return THREAD_PATH.exec(url.pathname)?.[1] ?? null
}

function conversationTitle(document: Document, pack: SelectorPack): string {
  const heading = queryFirst(document, pack.conversationTitle)
  const fromHeading = heading ? readText(heading) : ''
  return fromHeading || document.title.replace(TITLE_SUFFIX, '').trim() || 'Messenger chat'
}

/** Wheel distance per catch-up step; about one screen of messages. */
const OLDER_WHEEL_DELTA = -500
const SCROLLABLE = /(auto|scroll)/

function scrollContainer(from: Element, list: Element): Element | null {
  for (let element: Element | null = from; element !== null; element = element.parentElement) {
    const scrollable = SCROLLABLE.test(getComputedStyle(element).overflowY)
    if (scrollable && element.scrollHeight > element.clientHeight) {
      return element
    }
    if (element === list) {
      return null
    }
  }
  return null
}

// Messenger loads older history on wheel input at the top; setting scrollTop alone doesn't
// trigger it (recon, 2026-10-14). Both are what a user scrolling up would produce.
function scrollUp(list: Element, pack: SelectorPack): boolean {
  const firstRow = queryFirst(list, pack.messageRow)
  const scroller = firstRow === null ? null : scrollContainer(firstRow, list)
  if (scroller === null) {
    return false
  }
  scroller.dispatchEvent(
    new WheelEvent('wheel', { deltaY: OLDER_WHEEL_DELTA, bubbles: true, cancelable: true }),
  )
  scroller.scrollTop = 0
  return true
}

function countOtherSenders(messages: readonly CapturedMessage[]): number {
  return new Set(messages.filter(message => !message.sender.isSelf).map(m => m.sender.name)).size
}

/**
 * Messenger adapter for messenger.com and facebook.com/messages (ADR 0006). Rows carry
 * Messenger's own `mid.$…` ids, so alignment is only a fallback for rows without one.
 *
 * @param document - The page document.
 * @param pack - The validated Messenger selector pack.
 * @returns The adapter.
 */
export function createMessengerAdapter(document: Document, pack: SelectorPack): PlatformAdapter {
  const getMessageListRoot = (): Element | null => queryFirst(document, pack.messageList)

  const readVisibleMessages = (): CapturedMessage[] => {
    const list = getMessageListRoot()
    return list === null
      ? []
      : readMessages(list, pack, { fallbackSender: conversationTitle(document, pack) })
  }

  return {
    platform: 'messenger',
    selectorPackVersion: pack.version,
    getMessageListRoot,
    readVisibleMessages,
    loadOlder() {
      const list = getMessageListRoot()
      return list !== null && scrollUp(list, pack)
    },
    getActiveConversation(url) {
      const conversationId = threadIdFromUrl(url)
      if (conversationId === null) {
        return null
      }
      const conversation: ConversationRef = {
        platform: 'messenger',
        workspaceId: '_',
        conversationId,
        title: conversationTitle(document, pack),
        isGroup: countOtherSenders(readVisibleMessages()) > 1,
        url: `${url.origin}${url.pathname}`,
      }
      return conversation
    },
  }
}
