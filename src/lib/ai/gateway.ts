import { createGeminiProvider } from '@/lib/ai/providers/gemini'
import { getApiKey } from '@/lib/db/secrets'
import type { SkimmyDb } from '@/lib/db/schema'
import { fail, ok } from '@/lib/messaging/rpcResult'
import type { LlmProvider } from '@/types/ai.types'
import type { RpcResult } from '@/types/rpc.types'

/**
 * Picks the provider for a skim. Phase 1 has only Gemini; Phase 2 adds Claude and OpenAI
 * and per-chat policies (plan §2.7).
 *
 * @param db - The database holding the user's keys.
 * @returns A ready provider, or an `auth` error when no key is saved.
 */
export async function resolveProvider(db: SkimmyDb): Promise<RpcResult<LlmProvider>> {
  const geminiKey = await getApiKey(db, 'gemini')
  if (geminiKey === null) {
    return fail('auth', 'Add your Gemini API key in Skimmy settings to skim chats.')
  }
  return ok(createGeminiProvider(geminiKey))
}
