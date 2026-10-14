import type { JSX } from 'react'
import { CatchUpControl } from '@/components/thread/CatchUpControl'
import { SkimResultView } from '@/components/thread/SkimResultView'
import { Notice } from '@/components/ui/Notice'
import type { ActiveConversation } from '@/hooks/useActiveConversation'
import { useSkimAction } from '@/hooks/useSkimAction'
import { useThreadView } from '@/hooks/useThreadView'

export interface CurrentChatViewProps {
  readonly conversation: ActiveConversation
}

/**
 * The chat open in the active tab: capture status, the Skim button and the latest skim.
 *
 * @param props - The active tab's conversation.
 * @returns The view.
 */
export function CurrentChatView({ conversation }: CurrentChatViewProps): JSX.Element {
  const view = useThreadView(conversation.threadKey)
  const { isSkimming, error, skim } = useSkimAction(conversation.threadKey)
  const unskimmed = view?.unskimmedCount ?? 0
  return (
    <section aria-label="Current chat" className="flex flex-col gap-3 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="truncate text-base font-semibold">{conversation.title}</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {view?.messageCount ?? 0} captured · {unskimmed} new since last skim
          </p>
        </div>
        <button
          type="button"
          onClick={skim}
          disabled={isSkimming || unskimmed === 0}
          className="shrink-0 rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSkimming ? 'Skimming…' : 'Skim'}
        </button>
      </div>
      <CatchUpControl
        tabId={conversation.tabId}
        threadKey={conversation.threadKey}
        capturedCount={view?.messageCount ?? 0}
      />
      {error !== null && (
        <Notice tone="error" title="Couldn't skim this chat">
          {error.message}
        </Notice>
      )}
      {view?.skim ? (
        <SkimResultView skim={view.skim} />
      ) : (
        <Notice title="No skim yet">
          Press Catch me up and Skimmy scrolls and skims for you, or scroll yourself and press Skim.
        </Notice>
      )}
    </section>
  )
}
