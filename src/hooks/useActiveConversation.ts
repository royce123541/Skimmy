import { useEffect, useState } from 'react'
import { browser } from '#imports'
import { tabConversationsItem, type TabConversation } from '@/lib/storage/items'

// `sidepanel.html?tabId=123` follows one tab instead of the active one. Used by end-to-end
// tests and for debugging, where the panel is opened as an ordinary tab.
function pinnedTabId(): number | null {
  const value = new URLSearchParams(window.location.search).get('tabId')
  const tabId = value === null ? Number.NaN : Number(value)
  return Number.isInteger(tabId) ? tabId : null
}

/** A tab's conversation plus the tab it's open in, so the panel can talk to that tab. */
export interface ActiveConversation extends TabConversation {
  readonly tabId: number
}

async function readTabConversation(): Promise<ActiveConversation | null> {
  const pinned = pinnedTabId()
  const tabId = pinned ?? (await browser.tabs.query({ active: true, currentWindow: true }))[0]?.id
  if (tabId === undefined) {
    return null
  }
  const conversation = (await tabConversationsItem.getValue())[String(tabId)]
  return conversation === undefined ? null : { ...conversation, tabId }
}

/**
 * The conversation open in the active tab of this window, kept current as the user switches
 * tabs or chats.
 *
 * @returns The active tab's conversation, or null when it isn't showing a captured chat.
 */
export function useActiveConversation(): ActiveConversation | null {
  const [conversation, setConversation] = useState<ActiveConversation | null>(null)

  useEffect(() => {
    const refresh = (): void => {
      readTabConversation()
        .then(next => {
          setConversation(next)
        })
        .catch((error: unknown) => {
          console.error('Skimmy: could not read the active conversation', error)
        })
    }
    refresh()
    const unwatch = tabConversationsItem.watch(refresh)
    browser.tabs.onActivated.addListener(refresh)
    browser.windows.onFocusChanged.addListener(refresh)
    return () => {
      unwatch()
      browser.tabs.onActivated.removeListener(refresh)
      browser.windows.onFocusChanged.removeListener(refresh)
    }
  }, [])

  return conversation
}
