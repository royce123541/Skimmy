import { useCallback, useState } from 'react'
import { sendMessage } from '@/lib/messaging/protocol'
import type { RpcError } from '@/types/rpc.types'

export interface SkimAction {
  readonly isSkimming: boolean
  readonly error: RpcError | null
  readonly skim: () => void
}

/**
 * Asks the service worker to skim a thread and tracks progress and errors. The result
 * itself arrives through the database, so it isn't returned here.
 *
 * @param threadKey - The thread to skim.
 * @returns Progress, the last error and the trigger.
 */
export function useSkimAction(threadKey: string): SkimAction {
  const [isSkimming, setIsSkimming] = useState(false)
  const [error, setError] = useState<RpcError | null>(null)

  const skim = useCallback(() => {
    setIsSkimming(true)
    setError(null)
    sendMessage('requestSkim', { threadKey })
      .then(result => {
        setError(result.success ? null : result.error)
      })
      .catch((caught: unknown) => {
        setError({ code: 'internal', message: String(caught) })
      })
      .finally(() => {
        setIsSkimming(false)
      })
  }, [threadKey])

  return { isSkimming, error, skim }
}
