import type { CloudProviderId } from '@/types/ai.types'

/** One selectable model. Prices are USD per million tokens (plan §2.8, October 2026). */
export interface CatalogModel {
  readonly id: string
  readonly label: string
  readonly inputPerMillion: number
  readonly outputPerMillion: number
}

export interface CatalogProvider {
  readonly id: CloudProviderId
  readonly name: string
  readonly keyHelp: string
  readonly keyUrl: string
  readonly defaultModel: string
  readonly models: readonly CatalogModel[]
}

/**
 * Providers and models Skimmy offers, kept as data so lineups and prices can change without
 * touching provider code (plan §2.8). Phase 6 refreshes it remotely.
 */
export const MODEL_CATALOG: readonly CatalogProvider[] = [
  {
    id: 'gemini',
    name: 'Gemini',
    keyHelp: 'Get a key from Google AI Studio.',
    keyUrl: 'https://aistudio.google.com/apikey',
    defaultModel: 'gemini-3.5-flash-lite',
    models: [
      {
        id: 'gemini-3.5-flash-lite',
        label: 'Gemini 3.5 Flash-Lite',
        inputPerMillion: 0.3,
        outputPerMillion: 2.5,
      },
      {
        id: 'gemini-3.8-flash',
        label: 'Gemini 3.8 Flash',
        inputPerMillion: 0.75,
        outputPerMillion: 3.75,
      },
    ],
  },
  {
    id: 'claude',
    name: 'Claude',
    keyHelp:
      'Get a key from the Claude Console. Claude Pro and Max plans do not include API access.',
    keyUrl: 'https://console.anthropic.com/settings/keys',
    defaultModel: 'claude-opus-5-5',
    models: [
      {
        id: 'claude-opus-5-5',
        label: 'Claude Opus 5.5',
        inputPerMillion: 4,
        outputPerMillion: 20,
      },
      {
        id: 'claude-sonnet-5-5',
        label: 'Claude Sonnet 5.5',
        inputPerMillion: 2,
        outputPerMillion: 10,
      },
      {
        id: 'claude-haiku-5-5',
        label: 'Claude Haiku 5.5',
        inputPerMillion: 0.1,
        outputPerMillion: 0.5,
      },
    ],
  },
  {
    id: 'openai',
    name: 'ChatGPT (OpenAI)',
    keyHelp:
      'Get a key from the OpenAI platform. ChatGPT Plus and Pro plans do not include API access.',
    keyUrl: 'https://platform.openai.com/api-keys',
    defaultModel: 'gpt-6.1-sol',
    models: [
      { id: 'gpt-6.1-sol', label: 'GPT-6.1 Sol', inputPerMillion: 2, outputPerMillion: 10 },
      { id: 'gpt-6-luna', label: 'GPT-6 Luna', inputPerMillion: 0.1, outputPerMillion: 0.5 },
      { id: 'gpt-6-astra', label: 'GPT-6 Astra', inputPerMillion: 10, outputPerMillion: 50 },
    ],
  },
]

/**
 * A provider's catalog entry.
 *
 * @param id - The provider.
 * @returns Its entry; every cloud provider has one.
 */
export function catalogProvider(id: CloudProviderId): CatalogProvider {
  const entry = MODEL_CATALOG.find(provider => provider.id === id)
  if (entry === undefined) {
    throw new Error(`No catalog entry for provider ${id}`)
  }
  return entry
}

/**
 * Whether a model id belongs to the provider's catalog, so stale settings fall back safely.
 *
 * @param provider - The provider.
 * @param model - A model id from settings.
 * @returns True when the model is offered.
 */
export function isCatalogModel(provider: CloudProviderId, model: string): boolean {
  return catalogProvider(provider).models.some(entry => entry.id === model)
}
