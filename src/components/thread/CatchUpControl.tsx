import { useState, type JSX } from 'react'
import { Notice } from '@/components/ui/Notice'
import { useCatchUp, type CatchUpPhase } from '@/hooks/useCatchUp'
import { MAX_CATCH_UP_MESSAGES, MIN_CATCH_UP_MESSAGES } from '@/lib/messaging/schemas'

const DEFAULT_TARGET = 100

export interface CatchUpControlProps {
  readonly tabId: number
  readonly threadKey: string
  /** Messages captured so far, shown as live progress while scrolling. */
  readonly capturedCount: number
}

function clampTarget(value: number): number {
  if (Number.isNaN(value)) {
    return DEFAULT_TARGET
  }
  return Math.min(MAX_CATCH_UP_MESSAGES, Math.max(MIN_CATCH_UP_MESSAGES, Math.round(value)))
}

interface StatusProps {
  readonly phase: CatchUpPhase
  readonly capturedCount: number
}

function CatchUpStatus({ phase, capturedCount }: StatusProps): JSX.Element | null {
  if (phase === 'idle') {
    return null
  }
  return (
    <p role="status" className="text-xs text-slate-500 dark:text-slate-400">
      {phase === 'collecting'
        ? `Scrolling the chat… ${capturedCount} captured. Keep this tab open.`
        : 'Skimming…'}
    </p>
  )
}

interface ButtonProps {
  readonly phase: CatchUpPhase
  readonly onCancel: () => void
}

// Submits the form when idle; cancels while scrolling (a skim in flight can't be cancelled).
function CatchUpButton({ phase, onCancel }: ButtonProps): JSX.Element {
  if (phase === 'idle') {
    return (
      <button
        type="submit"
        className="ml-auto rounded-md bg-indigo-600 px-3 py-1.5 font-medium text-white hover:bg-indigo-500"
      >
        Catch up
      </button>
    )
  }
  return (
    <button
      type="button"
      onClick={onCancel}
      disabled={phase === 'skimming'}
      className="ml-auto rounded-md border border-slate-300 px-3 py-1.5 font-medium disabled:opacity-50 dark:border-slate-600"
    >
      Cancel
    </button>
  )
}

/**
 * "Skim the last N messages": Skimmy scrolls the chat for the user, then skims.
 *
 * @param props - The chat's tab and thread, and the live captured count.
 * @returns The control.
 */
export function CatchUpControl({
  tabId,
  threadKey,
  capturedCount,
}: CatchUpControlProps): JSX.Element {
  const [target, setTarget] = useState(DEFAULT_TARGET)
  const { phase, error, note, start, cancel } = useCatchUp(tabId, threadKey)
  const isBusy = phase !== 'idle'
  return (
    <div className="flex flex-col gap-2 rounded-md border border-slate-200 p-3 dark:border-slate-700">
      <form
        className="flex items-center gap-2 text-sm"
        onSubmit={event => {
          event.preventDefault()
          start(target)
        }}
      >
        <label htmlFor="catch-up-target">Skim the last</label>
        <input
          id="catch-up-target"
          type="number"
          min={MIN_CATCH_UP_MESSAGES}
          max={MAX_CATCH_UP_MESSAGES}
          value={target}
          disabled={isBusy}
          onChange={event => {
            setTarget(clampTarget(event.target.valueAsNumber))
          }}
          className="w-20 rounded-md border border-slate-300 px-2 py-1 dark:border-slate-600 dark:bg-slate-900"
        />
        <span>messages</span>
        <CatchUpButton phase={phase} onCancel={cancel} />
      </form>
      <CatchUpStatus phase={phase} capturedCount={capturedCount} />
      {note !== null && <p className="text-xs text-slate-500 dark:text-slate-400">{note}</p>}
      {error !== null && (
        <Notice tone="error" title="Couldn't catch up">
          {error.message}
        </Notice>
      )}
    </div>
  )
}
