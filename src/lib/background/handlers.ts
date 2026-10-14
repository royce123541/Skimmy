import { browser } from '#imports'
import { resolveProvider } from '@/lib/ai/gateway'
import { validateGeminiKey } from '@/lib/ai/providers/gemini'
import { skimThread } from '@/lib/ai/skimThread'
import { rememberTab } from '@/lib/background/tabRegistry'
import { getDb } from '@/lib/db/schema'
import { deleteApiKey, saveApiKey } from '@/lib/db/secrets'
import { ingestBatch } from '@/lib/ingest/ingestBatch'
import { guarded } from '@/lib/messaging/guarded'
import { onMessage } from '@/lib/messaging/protocol'
import { ok } from '@/lib/messaging/rpcResult'
import {
  ConversationChangedSchema,
  DeleteApiKeySchema,
  IngestBatchSchema,
  RequestSkimSchema,
  SaveApiKeySchema,
} from '@/lib/messaging/schemas'

function readerLocale(): { timeZone: string; outputLanguage: string } {
  return {
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    outputLanguage: browser.i18n.getUILanguage(),
  }
}

/** Registers every RPC handler. Must run synchronously at service worker startup. */
export function registerMessageHandlers(): void {
  onMessage(
    'ingestBatch',
    guarded(IngestBatchSchema, async (data, sender) => {
      const outcome = await ingestBatch(getDb(), data.conversation, data.messages, Date.now())
      if (sender.tab?.id !== undefined) {
        await rememberTab(sender.tab.id, data.conversation)
      }
      return ok({ added: outcome.added })
    }),
  )

  onMessage(
    'conversationChanged',
    guarded(ConversationChangedSchema, async (data, sender) => {
      if (sender.tab?.id !== undefined) {
        await rememberTab(sender.tab.id, data.conversation)
      }
      return ok(null)
    }),
  )

  onMessage(
    'requestSkim',
    guarded(RequestSkimSchema, async data => {
      const db = getDb()
      const provider = await resolveProvider(db)
      if (!provider.success) {
        return provider
      }
      const deps = { db, provider: provider.data, now: new Date(), ...readerLocale() }
      return skimThread(deps, data.threadKey, data.lastCount)
    }),
  )

  onMessage(
    'saveApiKey',
    guarded(SaveApiKeySchema, async data => {
      const check = await validateGeminiKey(data.apiKey)
      if (check.success) {
        await saveApiKey(getDb(), data.provider, data.apiKey, Date.now())
      }
      return check
    }),
  )

  onMessage(
    'deleteApiKey',
    guarded(DeleteApiKeySchema, async data => {
      await deleteApiKey(getDb(), data.provider)
      return ok(null)
    }),
  )
}
