import type { JSX } from 'react'
import { Notice } from '@/components/ui/Notice'
import { useProvidersWithKeys } from '@/hooks/useThreadView'
import { catalogProvider } from '@/lib/ai/modelCatalog'
import type { CloudProviderId } from '@/types/ai.types'
import type { RpcError, RpcErrorCode } from '@/types/rpc.types'

/** Failures another provider can't fix: nothing to skim, or a bad request. */
const NOT_RETRYABLE: ReadonlySet<RpcErrorCode> = new Set(['not_found', 'invalid_input'])

export interface SkimErrorNoticeProps {
  readonly error: RpcError
  readonly onRetry: (provider: CloudProviderId) => void
}

/**
 * Why a skim failed, with one-click "Retry with…" for every other provider that has a key.
 * Skimmy never retries on another provider by itself (plan §2.7).
 *
 * @param props - The error and the retry action.
 * @returns The notice.
 */
export function SkimErrorNotice({ error, onRetry }: SkimErrorNoticeProps): JSX.Element {
  const withKeys = useProvidersWithKeys() ?? []
  const options = NOT_RETRYABLE.has(error.code) ? [] : withKeys
  return (
    <Notice tone="error" title="Couldn't skim this chat">
      <p>{error.message}</p>
      {options.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-2">
          {options.map(provider => (
            <button
              key={provider}
              type="button"
              onClick={() => {
                onRetry(provider)
              }}
              className="rounded-md border border-current px-2 py-1 text-xs font-medium"
            >
              Retry with {catalogProvider(provider).name}
            </button>
          ))}
        </div>
      )}
    </Notice>
  )
}
