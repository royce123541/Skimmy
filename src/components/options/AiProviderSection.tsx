import type { JSX } from 'react'
import { ProviderKeySection } from '@/components/options/ProviderKeySection'
import { useAiSettings } from '@/hooks/useAiSettings'
import { useProvidersWithKeys } from '@/hooks/useThreadView'
import { MODEL_CATALOG, type CatalogProvider } from '@/lib/ai/modelCatalog'
import { modelFor, type AiSettings } from '@/lib/storage/aiSettings'

function price(model: CatalogProvider['models'][number]): string {
  return `$${model.inputPerMillion} in / $${model.outputPerMillion} out per million tokens`
}

interface ProviderRowProps {
  readonly entry: CatalogProvider
  readonly settings: AiSettings
  readonly hasKey: boolean
  readonly onPickProvider: () => void
  readonly onPickModel: (model: string) => void
}

function ProviderRow({
  entry,
  settings,
  hasKey,
  onPickProvider,
  onPickModel,
}: ProviderRowProps): JSX.Element {
  const model = modelFor(settings, entry.id)
  const selected = entry.models.find(candidate => candidate.id === model)
  return (
    <div className="flex flex-wrap items-center gap-3 text-sm">
      <label className="flex min-w-40 items-center gap-2">
        <input
          type="radio"
          name="default-provider"
          checked={settings.provider === entry.id}
          disabled={!hasKey}
          onChange={onPickProvider}
        />
        {entry.name}
        {!hasKey && <span className="text-xs text-slate-400">(no key)</span>}
      </label>
      <select
        aria-label={`${entry.name} model`}
        value={model}
        onChange={event => {
          onPickModel(event.target.value)
        }}
        className="rounded-md border border-slate-300 bg-transparent px-2 py-1 dark:border-slate-700"
      >
        {entry.models.map(candidate => (
          <option key={candidate.id} value={candidate.id}>
            {candidate.label}
          </option>
        ))}
      </select>
      {selected !== undefined && <span className="text-xs text-slate-500">{price(selected)}</span>}
    </div>
  )
}

/**
 * AI provider settings: a key per provider, the default provider and each one's model.
 * Skimmy never switches providers on its own (plan §2.7).
 *
 * @returns The settings section.
 */
export function AiProviderSection(): JSX.Element {
  const { settings, setProvider, setModel } = useAiSettings()
  const withKeys = useProvidersWithKeys() ?? []
  return (
    <section aria-labelledby="ai-title" className="flex flex-col gap-4">
      <h2 id="ai-title" className="text-lg font-semibold">
        AI provider
      </h2>
      <p className="text-sm text-slate-600 dark:text-slate-400">
        Skimmy sends chat text only to the provider you pick, using your own key. Keys stay in this
        browser.
      </p>
      {settings !== null && (
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1 text-sm font-medium">Skim with</legend>
          {MODEL_CATALOG.map(entry => (
            <ProviderRow
              key={entry.id}
              entry={entry}
              settings={settings}
              hasKey={withKeys.includes(entry.id)}
              onPickProvider={() => {
                setProvider(entry.id)
              }}
              onPickModel={model => {
                setModel(entry.id, model)
              }}
            />
          ))}
        </fieldset>
      )}
      {MODEL_CATALOG.map(entry => (
        <ProviderKeySection
          key={entry.id}
          provider={entry.id}
          hasKey={withKeys.includes(entry.id)}
        />
      ))}
    </section>
  )
}
