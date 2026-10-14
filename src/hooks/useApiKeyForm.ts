import { useCallback, useState, type SyntheticEvent } from 'react'
import { sendMessage } from '@/lib/messaging/protocol'
import type { CloudProviderId } from '@/types/ai.types'
import type { RpcResult } from '@/types/rpc.types'

export type SaveState =
  | { readonly kind: 'idle' }
  | { readonly kind: 'saving' }
  | { readonly kind: 'saved' }
  | { readonly kind: 'failed'; readonly message: string }

export interface ApiKeyForm {
  readonly apiKey: string
  readonly state: SaveState
  readonly setApiKey: (value: string) => void
  readonly submit: (event: SyntheticEvent<HTMLFormElement>) => void
  readonly remove: () => void
}

function failedState(error: unknown): SaveState {
  return { kind: 'failed', message: String(error) }
}

function stateFrom(result: RpcResult<null>, onSuccess: SaveState): SaveState {
  return result.success ? onSuccess : { kind: 'failed', message: result.error.message }
}

/**
 * State and actions for one provider's key form. Saving goes through the service worker,
 * which verifies the key before storing it.
 *
 * @param provider - Whose key the form edits.
 * @returns The current input, save state and actions.
 */
export function useApiKeyForm(provider: CloudProviderId): ApiKeyForm {
  const [apiKey, setApiKey] = useState('')
  const [state, setState] = useState<SaveState>({ kind: 'idle' })

  const submit = useCallback(
    (event: SyntheticEvent<HTMLFormElement>) => {
      event.preventDefault()
      setState({ kind: 'saving' })
      sendMessage('saveApiKey', { provider, apiKey })
        .then(result => {
          setState(stateFrom(result, { kind: 'saved' }))
          if (result.success) {
            setApiKey('')
          }
        })
        .catch((error: unknown) => {
          setState(failedState(error))
        })
    },
    [apiKey, provider],
  )

  const remove = useCallback(() => {
    sendMessage('deleteApiKey', { provider })
      .then(result => {
        setState(stateFrom(result, { kind: 'idle' }))
      })
      .catch((error: unknown) => {
        setState(failedState(error))
      })
  }, [provider])

  return { apiKey, state, setApiKey, submit, remove }
}
