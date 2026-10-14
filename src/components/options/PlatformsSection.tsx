import type { JSX } from 'react'
import { usePlatformPermission } from '@/hooks/usePlatformPermission'
import { MESSENGER_MATCHES } from '@/lib/adapters/messenger/matches'

/**
 * Per-platform opt-in. Skimmy can read a site only after the user grants it here
 * (ADR 0002), and only what that site already shows in the user's tab.
 *
 * @returns The settings section.
 */
export function PlatformsSection(): JSX.Element {
  const messenger = usePlatformPermission(MESSENGER_MATCHES)
  return (
    <section aria-labelledby="platforms-title" className="flex flex-col gap-3">
      <h2 id="platforms-title" className="text-lg font-semibold">
        Platforms
      </h2>
      <div className="flex items-center justify-between gap-4 rounded-lg border border-slate-200 p-3 dark:border-slate-800">
        <div>
          <p className="font-medium">Messenger</p>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Reads chats you open on facebook.com/messages. Skimmy never sends messages or opens
            chats for you.
          </p>
        </div>
        {messenger.granted === true ? (
          <button
            type="button"
            onClick={messenger.revoke}
            className="shrink-0 text-sm text-red-600 underline"
          >
            Turn off
          </button>
        ) : (
          <button
            type="button"
            onClick={messenger.request}
            className="shrink-0 rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white"
          >
            Turn on
          </button>
        )}
      </div>
    </section>
  )
}
