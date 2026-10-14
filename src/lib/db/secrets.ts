import type { SkimmyDb } from '@/lib/db/schema'
import type { CloudProviderId } from '@/types/ai.types'

/**
 * Reads a provider API key. Keys live in extension-origin IndexedDB, which content scripts
 * can't reach (ADR 0004).
 *
 * @param db - The database.
 * @param provider - Which provider's key to read.
 * @returns The key, or null if none is saved.
 */
export async function getApiKey(db: SkimmyDb, provider: CloudProviderId): Promise<string | null> {
  const secret = await db.secrets.get(provider)
  return secret?.value ?? null
}

/**
 * Saves or replaces a provider API key.
 *
 * @param db - The database.
 * @param provider - Which provider the key belongs to.
 * @param apiKey - The key.
 * @param now - Save time in epoch ms.
 */
export async function saveApiKey(
  db: SkimmyDb,
  provider: CloudProviderId,
  apiKey: string,
  now: number,
): Promise<void> {
  await db.secrets.put({ name: provider, value: apiKey, updatedAt: now })
}

/**
 * Removes a provider API key.
 *
 * @param db - The database.
 * @param provider - Which provider's key to remove.
 */
export async function deleteApiKey(db: SkimmyDb, provider: CloudProviderId): Promise<void> {
  await db.secrets.delete(provider)
}

/**
 * Which providers have a saved key. Reads names only, never the keys.
 *
 * @param db - The database.
 * @returns Providers with keys, in settings order.
 */
export async function providersWithKeys(db: SkimmyDb): Promise<CloudProviderId[]> {
  const names = new Set(await db.secrets.toCollection().primaryKeys())
  return (['gemini', 'claude', 'openai'] as const).filter(id => names.has(id))
}
