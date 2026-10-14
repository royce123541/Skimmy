import type { JSX } from 'react'
import { Notice } from '@/components/ui/Notice'
import { useApiKeyForm, type ApiKeyForm } from '@/hooks/useApiKeyForm'
import { catalogProvider } from '@/lib/ai/modelCatalog'
import type { CloudProviderId } from '@/types/ai.types'

export interface ProviderKeySectionProps {
  readonly provider: CloudProviderId
  readonly hasKey: boolean
}

interface KeyFormProps {
  readonly form: ApiKeyForm
  readonly hasKey: boolean
  readonly inputId: string
  readonly label: string
}

function KeyForm({ form, hasKey, inputId, label }: KeyFormProps): JSX.Element {
  return (
    <form onSubmit={form.submit} className="flex gap-2">
      <label htmlFor={inputId} className="sr-only">
        {label}
      </label>
      <input
        id={inputId}
        type="password"
        autoComplete="off"
        value={form.apiKey}
        onChange={event => {
          form.setApiKey(event.target.value)
        }}
        placeholder={hasKey ? 'Key saved. Paste a new one to replace it' : 'Paste your key'}
        className="min-w-0 flex-1 rounded-md border border-slate-300 bg-transparent px-3 py-1.5 text-sm dark:border-slate-700"
      />
      <button
        type="submit"
        disabled={form.apiKey.trim() === '' || form.state.kind === 'saving'}
        className="rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
      >
        {form.state.kind === 'saving' ? 'Checking…' : 'Save'}
      </button>
    </form>
  )
}

/**
 * One provider's key (ADR 0003). The key is checked with a models-list call, which spends no
 * tokens, and stored only in the extension's IndexedDB.
 *
 * @param props - The provider and whether a key is already saved.
 * @returns The key block.
 */
export function ProviderKeySection({ provider, hasKey }: ProviderKeySectionProps): JSX.Element {
  const entry = catalogProvider(provider)
  const form = useApiKeyForm(provider)
  return (
    <div className="flex flex-col gap-2 rounded-lg border border-slate-200 p-3 dark:border-slate-800">
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="font-medium">{entry.name}</h3>
        {hasKey && <span className="text-xs text-emerald-600">Key saved</span>}
      </div>
      <p className="text-sm text-slate-600 dark:text-slate-400">
        {entry.keyHelp}{' '}
        <a href={entry.keyUrl} target="_blank" rel="noopener noreferrer" className="underline">
          Get a key
        </a>
      </p>
      {provider === 'gemini' && (
        <Notice title="On Gemini's free tier, Google may use chat content to improve its products.">
          Use a paid key for real conversations, or test with made-up messages.
        </Notice>
      )}
      <KeyForm
        form={form}
        hasKey={hasKey}
        inputId={`${provider}-key`}
        label={`${entry.name} API key`}
      />
      {form.state.kind === 'saved' && <Notice title="Key saved and verified." />}
      {form.state.kind === 'failed' && (
        <Notice tone="error" title="Key not saved">
          {form.state.message}
        </Notice>
      )}
      {hasKey && (
        <button
          type="button"
          onClick={form.remove}
          className="self-start text-sm text-red-600 underline"
        >
          Remove saved key
        </button>
      )}
    </div>
  )
}
