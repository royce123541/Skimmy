import { groundSkim } from '@/lib/ai/grounding'
import { SKIM_PROMPT_VERSION, SKIM_SYSTEM_PROMPT } from '@/lib/ai/prompts/skimPrompt'
import { SkimOutputSchema, skimOutputJsonSchema } from '@/lib/ai/schemas/skimOutput'
import { buildTranscript } from '@/lib/ai/transcript/buildTranscript'
import { messagesInOrder } from '@/lib/db/queries'
import type { SkimmyDb } from '@/lib/db/schema'
import { fail, ok } from '@/lib/messaging/rpcResult'
import type { LlmProvider, ProviderSkimOutput } from '@/types/ai.types'
import type { StoredMessage, StoredSkim, StoredThread } from '@/types/db.types'
import type { RpcResult } from '@/types/rpc.types'

/** Phase 1 cap; Phase 2 replaces it with token budgets and map-reduce (plan §2.6). */
export const MAX_SKIM_MESSAGES = 300

export interface SkimDependencies {
  readonly db: SkimmyDb
  readonly provider: LlmProvider
  readonly now: Date
  readonly timeZone: string
  readonly outputLanguage: string
}

// The newest `lastCount` messages when given, otherwise everything since the last skim.
function selectMessages(
  thread: StoredThread,
  messages: readonly StoredMessage[],
  lastCount: number | undefined,
): StoredMessage[] {
  const watermark = thread.skimWatermark
  const content = messages.filter(message => !message.isSystemEvent)
  if (lastCount !== undefined) {
    return content.slice(-Math.min(lastCount, MAX_SKIM_MESSAGES))
  }
  return content
    .filter(message => watermark === null || message.order > watermark)
    .slice(-MAX_SKIM_MESSAGES)
}

async function saveSkim(db: SkimmyDb, skim: StoredSkim): Promise<void> {
  await db.transaction('rw', db.skims, db.threads, async () => {
    await db.skims.add(skim)
    await db.threads.update(skim.threadKey, { skimWatermark: skim.toOrder })
  })
}

function toStoredSkim(
  thread: StoredThread,
  messages: readonly StoredMessage[],
  output: ProviderSkimOutput,
  deps: SkimDependencies,
  refToKey: ReadonlyMap<string, string>,
): RpcResult<StoredSkim> {
  const parsed = SkimOutputSchema.safeParse(output.json)
  if (!parsed.success) {
    return fail('invalid_output', "The AI's answer didn't match the expected format.")
  }
  return ok({
    id: crypto.randomUUID(),
    threadKey: thread.threadKey,
    createdAt: deps.now.getTime(),
    provider: deps.provider.id,
    model: output.model,
    promptVersion: SKIM_PROMPT_VERSION,
    fromOrder: messages[0]?.order ?? 0,
    toOrder: messages.at(-1)?.order ?? 0,
    messageCount: messages.length,
    result: groundSkim(parsed.data, refToKey),
    usage: output.usage,
  })
}

/**
 * Skims the thread's newest messages (all since the watermark, or the last `lastCount`),
 * stores the grounded result and advances the watermark.
 *
 * @param deps - Database, provider and the reader's clock and language.
 * @param threadKey - The thread to skim.
 * @param lastCount - Skim this many of the newest messages, even if already skimmed.
 * @returns The new skim's id, or why it couldn't be produced.
 */
export async function skimThread(
  deps: SkimDependencies,
  threadKey: string,
  lastCount?: number,
): Promise<RpcResult<{ skimId: string }>> {
  const thread = await deps.db.threads.get(threadKey)
  if (thread === undefined) {
    return fail('not_found', 'Skimmy has not captured this chat yet.')
  }
  const messages = selectMessages(thread, await messagesInOrder(deps.db, threadKey), lastCount)
  if (messages.length === 0) {
    return fail('not_found', 'No new messages since the last skim.')
  }
  const transcript = buildTranscript({ ...deps, thread, messages })
  const response = await deps.provider.generateSkim({
    systemPrompt: SKIM_SYSTEM_PROMPT,
    userPrompt: transcript.text,
    responseSchema: skimOutputJsonSchema(),
  })
  if (!response.success) {
    return response
  }
  const skim = toStoredSkim(thread, messages, response.data, deps, transcript.refToKey)
  if (!skim.success) {
    return skim
  }
  await saveSkim(deps.db, skim.data)
  return ok({ skimId: skim.data.id })
}
