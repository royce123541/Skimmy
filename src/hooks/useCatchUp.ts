import { useCallback, useState } from 'react'
import { sendMessage } from '@/lib/messaging/protocol'
import type { CatchUpOutcome } from '@/types/messaging.types'
import type { RpcError } from '@/types/rpc.types'

export type CatchUpPhase = 'idle' | 'collecting' | 'skimming'

export interface CatchUpState {
  readonly phase: CatchUpPhase
  readonly error: RpcError | null
  /** A short note on how the last catch-up ended, e.g. when the chat ran out of history. */
  readonly note: string | null
  readonly start: (target: number) => void
  readonly cancel: () => void
}

interface RunCallbacks {
  readonly setPhase: (phase: CatchUpPhase) => void
  readonly setNote: (note: string | null) => void
}

function describeOutcome(outcome: CatchUpOutcome, target: number): string | null {
  if (outcome.reason === 'exhausted') {
    return `Reached the start of the chat after ${outcome.collected} messages.`
  }
  if (outcome.reason === 'timeout') {
    return `Stopped after 3 minutes with ${outcome.collected} of ${target} messages.`
  }
  return null
}

// Collect in the tab, then skim what was collected. Resolves to the error to show, if any.
async function runCatchUp(
  tabId: number,
  threadKey: string,
  target: number,
  callbacks: RunCallbacks,
): Promise<RpcError | null> {
  const collected = await sendMessage('startCatchUp', { target }, tabId)
  if (!collected.success) {
    return collected.error
  }
  const outcome = collected.data
  if (outcome.reason === 'busy') {
    return { code: 'invalid_input', message: 'A catch-up is already running in this tab.' }
  }
  if (outcome.reason === 'cancelled' || outcome.collected === 0) {
    return null
  }
  callbacks.setNote(describeOutcome(outcome, target))
  callbacks.setPhase('skimming')
  const lastCount = Math.min(target, outcome.collected)
  const skim = await sendMessage('requestSkim', { threadKey, lastCount })
  return skim.success ? null : skim.error
}

/**
 * "Catch me up": scrolls the chat in its tab until it has `target` messages, then skims the
 * newest `target`. The skim itself arrives through the database.
 *
 * @param tabId - The tab showing the chat.
 * @param threadKey - The chat's thread.
 * @returns Progress, errors and the start/cancel actions.
 */
export function useCatchUp(tabId: number, threadKey: string): CatchUpState {
  const [phase, setPhase] = useState<CatchUpPhase>('idle')
  const [error, setError] = useState<RpcError | null>(null)
  const [note, setNote] = useState<string | null>(null)

  const start = useCallback(
    (target: number) => {
      setPhase('collecting')
      setError(null)
      setNote(null)
      runCatchUp(tabId, threadKey, target, { setPhase, setNote })
        .then(setError)
        .catch(() => {
          setError({
            code: 'network',
            message: 'Could not reach the chat tab. Reload it and try again.',
          })
        })
        .finally(() => {
          setPhase('idle')
        })
    },
    [tabId, threadKey],
  )

  const cancel = useCallback(() => {
    sendMessage('cancelCatchUp', undefined, tabId).catch((caught: unknown) => {
      console.error('Skimmy: could not cancel the catch-up', caught)
    })
  }, [tabId])

  return { phase, error, note, start, cancel }
}
