import { useCallback, type JSX } from 'react'
import { browser } from '#imports'
import { CurrentChatView } from '@/components/thread/CurrentChatView'
import { Notice } from '@/components/ui/Notice'
import { useActiveConversation } from '@/hooks/useActiveConversation'
import { useHasGeminiKey } from '@/hooks/useThreadView'

function SetupNotice(): JSX.Element {
  const openSettings = useCallback(() => {
    browser.runtime.openOptionsPage().catch((error: unknown) => {
      console.error('Skimmy: could not open settings', error)
    })
  }, [])
  return (
    <div className="p-4">
      <Notice title="Finish setting up Skimmy">
        <p>Add an AI key and turn on Messenger to start skimming.</p>
        <button
          type="button"
          onClick={openSettings}
          className="mt-2 font-medium text-indigo-600 underline dark:text-indigo-400"
        >
          Open settings
        </button>
      </Notice>
    </div>
  )
}

function EmptyState(): JSX.Element {
  return (
    <section
      aria-labelledby="empty-state-title"
      className="flex flex-1 flex-col items-center justify-center gap-2 px-6 text-center"
    >
      <h2 id="empty-state-title" className="text-base font-medium">
        Nothing to skim yet
      </h2>
      <p className="max-w-xs text-sm text-slate-500 dark:text-slate-400">
        Open a group chat, then come back here to catch up on what you missed.
      </p>
    </section>
  )
}

/**
 * Root of the Skimmy side panel. Phase 1 shows the chat open in the active tab; the Inbox,
 * Action items and Events views arrive in Phase 5.
 *
 * @returns The side panel layout.
 */
export function SidePanelApp(): JSX.Element {
  const conversation = useActiveConversation()
  const hasKey = useHasGeminiKey()
  return (
    <main className="flex min-h-screen flex-col bg-white text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <header className="border-b border-slate-200 px-4 py-3 dark:border-slate-800">
        <h1 className="text-lg font-semibold tracking-tight">Skimmy</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">Your group chats, skimmed.</p>
      </header>
      {hasKey === false && <SetupNotice />}
      {conversation === null ? <EmptyState /> : <CurrentChatView conversation={conversation} />}
    </main>
  )
}
