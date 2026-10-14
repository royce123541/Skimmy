import { catalogProvider } from '@/lib/ai/modelCatalog'
import { createClaudeProvider, validateClaudeKey } from '@/lib/ai/providers/claude'
import { createGeminiProvider, validateGeminiKey } from '@/lib/ai/providers/gemini'
import { createOpenAiProvider, validateOpenAiKey } from '@/lib/ai/providers/openai'
import { getApiKey } from '@/lib/db/secrets'
import type { SkimmyDb } from '@/lib/db/schema'
import { fail, ok } from '@/lib/messaging/rpcResult'
import { modelFor, type AiSettings } from '@/lib/storage/aiSettings'
import type { CloudProviderId, LlmProvider } from '@/types/ai.types'
import type { RpcResult } from '@/types/rpc.types'

const FACTORIES: Readonly<Record<CloudProviderId, (apiKey: string, model: string) => LlmProvider>> =
  {
    gemini: createGeminiProvider,
    claude: createClaudeProvider,
    openai: createOpenAiProvider,
  }

const VALIDATORS: Readonly<Record<CloudProviderId, (apiKey: string) => Promise<RpcResult<null>>>> =
  {
    gemini: validateGeminiKey,
    claude: validateClaudeKey,
    openai: validateOpenAiKey,
  }

/**
 * Picks the provider for a skim: an explicit choice (from "Retry with…") or the user's
 * default. Never switches providers on its own, so chat text only goes where the user chose
 * (plan §2.7).
 *
 * @param db - The database holding the user's keys.
 * @param settings - The user's AI settings.
 * @param override - A provider the user picked for this one skim.
 * @returns A ready provider, or an `auth` error when that provider has no key.
 */
export async function resolveProvider(
  db: SkimmyDb,
  settings: AiSettings,
  override?: CloudProviderId,
): Promise<RpcResult<LlmProvider>> {
  const provider = override ?? settings.provider
  const apiKey = await getApiKey(db, provider)
  if (apiKey === null) {
    const { name } = catalogProvider(provider)
    return fail('auth', `Add your ${name} API key in Skimmy settings to skim with ${name}.`)
  }
  return ok(FACTORIES[provider](apiKey, modelFor(settings, provider)))
}

/**
 * Checks a key with the provider's models list, which spends no tokens.
 *
 * @param provider - Whose key it is.
 * @param apiKey - The key.
 * @returns Success when the provider accepts it.
 */
export function validateApiKey(
  provider: CloudProviderId,
  apiKey: string,
): Promise<RpcResult<null>> {
  return VALIDATORS[provider](apiKey)
}
