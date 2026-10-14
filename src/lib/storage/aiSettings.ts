import { z } from 'zod'
import { storage } from '#imports'
import { catalogProvider, isCatalogModel } from '@/lib/ai/modelCatalog'
import type { CloudProviderId } from '@/types/ai.types'

const CloudProviderSchema = z.enum(['gemini', 'claude', 'openai'])

/** Which provider skims by default, and the model picked for each one. */
export const AiSettingsSchema = z.strictObject({
  provider: CloudProviderSchema,
  models: z.partialRecord(CloudProviderSchema, z.string().min(1)),
})

export type AiSettings = z.infer<typeof AiSettingsSchema>

export const DEFAULT_AI_SETTINGS: AiSettings = { provider: 'gemini', models: {} }

/**
 * AI settings in `storage.sync`, so they follow the user across Chrome profiles. Keys are
 * not here: they stay in IndexedDB on this device (ADR 0004).
 */
export const aiSettingsItem = storage.defineItem<AiSettings>('sync:aiSettings', {
  fallback: DEFAULT_AI_SETTINGS,
})

/**
 * Reads settings, falling back to defaults if what's stored doesn't validate.
 *
 * @returns Valid AI settings.
 */
export async function readAiSettings(): Promise<AiSettings> {
  const parsed = AiSettingsSchema.safeParse(await aiSettingsItem.getValue())
  return parsed.success ? parsed.data : DEFAULT_AI_SETTINGS
}

/**
 * The model to use for a provider: the user's pick if it's still offered, else the default.
 *
 * @param settings - The user's AI settings.
 * @param provider - The provider.
 * @returns A model id from the catalog.
 */
export function modelFor(settings: AiSettings, provider: CloudProviderId): string {
  const chosen = settings.models[provider]
  return chosen !== undefined && isCatalogModel(provider, chosen)
    ? chosen
    : catalogProvider(provider).defaultModel
}
