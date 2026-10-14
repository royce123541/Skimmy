import type { JSX } from 'react'
import { Notice } from '@/components/ui/Notice'
import { useApiKeyForm, type ApiKeyForm } from '@/hooks/useApiKeyForm'
import { useHasGeminiKey } from '@/hooks/useThreadView'

function KeyForm({
  form,
  hasKey,
}: {
  readonly form: ApiKeyForm
  readonly hasKey: boolean
}): JSX.Element {
  return (
    <form onSubmit={form.submit} className="flex gap-2">
      <label htmlFor="gemini-key" className="sr-only">
        Gemini API key
      </label>
      <input
        id="gemini-key"
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
 * Gemini key entry (ADR 0003). The key is checked with a models-list call, which spends no
 * tokens, and stored only in the extension's IndexedDB.
 *
 * @returns The settings section.
 */
export function GeminiKeySection(): JSX.Element {
  const hasKey = useHasGeminiKey() === true
  const form = useApiKeyForm()
  return (
    <section aria-labelledby="gemini-title" className="flex flex-col gap-3">
      <h2 id="gemini-title" className="text-lg font-semibold">
        Gemini API key
      </h2>
      <p className="text-sm text-slate-600 dark:text-slate-400">
        Skimmy uses <code>gemini-3.5-flash-lite</code>. Get a key from Google AI Studio. It stays in
        this browser and is sent only to Google.
      </p>
      <Notice title="On Gemini's free tier, Google may use chat content to improve its products.">
        Use a paid key for real conversations, or test with made-up messages.
      </Notice>
      <KeyForm form={form} hasKey={hasKey} />
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
    </section>
  )
}
