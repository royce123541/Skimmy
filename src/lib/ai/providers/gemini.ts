import { GoogleGenAI } from '@google/genai'
import { mapProviderError } from '@/lib/ai/providerErrors'
import { fail, ok } from '@/lib/messaging/rpcResult'
import type { LlmProvider, ProviderSkimOutput, SkimRequest, TokenUsage } from '@/types/ai.types'
import type { RpcResult } from '@/types/rpc.types'

/** The project owner's development model (ADR 0003). */
export const GEMINI_DEFAULT_MODEL = 'gemini-3.5-flash-lite'

const PROVIDER_NAME = 'Gemini'

interface StreamAccumulator {
  text: string
  usage: TokenUsage
  errorMessage: string | null
}

interface UsageLike {
  readonly total_input_tokens?: number | undefined
  readonly total_output_tokens?: number | undefined
  readonly total_thought_tokens?: number | undefined
}

function toUsage(usage: UsageLike | undefined, previous: TokenUsage): TokenUsage {
  if (usage === undefined) {
    return previous
  }
  return {
    inputTokens: usage.total_input_tokens ?? previous.inputTokens,
    outputTokens: (usage.total_output_tokens ?? 0) + (usage.total_thought_tokens ?? 0),
  }
}

async function collectStream(
  client: GoogleGenAI,
  model: string,
  request: SkimRequest,
): Promise<StreamAccumulator> {
  const stream = await client.interactions.create({
    model,
    system_instruction: request.systemPrompt,
    input: request.userPrompt,
    response_format: {
      type: 'text',
      mime_type: 'application/json',
      schema: request.responseSchema,
    },
    generation_config: { thinking_level: 'low' },
    // Skimmy never needs server-side history; don't let Google keep the chat (ADR 0003).
    store: false,
    stream: true,
  })
  const accumulator: StreamAccumulator = {
    text: '',
    usage: { inputTokens: 0, outputTokens: 0 },
    errorMessage: null,
  }
  for await (const event of stream) {
    if (event.event_type === 'step.delta') {
      if (event.delta.type === 'text') {
        accumulator.text += event.delta.text
      }
      accumulator.usage = toUsage(event.metadata?.total_usage, accumulator.usage)
    } else if (event.event_type === 'interaction.completed') {
      accumulator.usage = toUsage(event.interaction.usage, accumulator.usage)
    } else if (event.event_type === 'error') {
      accumulator.errorMessage = event.error?.message ?? 'Unknown streaming error'
    }
  }
  return accumulator
}

function toOutput(accumulator: StreamAccumulator, model: string): RpcResult<ProviderSkimOutput> {
  if (accumulator.errorMessage !== null) {
    return fail('internal', `${PROVIDER_NAME} stream failed: ${accumulator.errorMessage}`)
  }
  if (accumulator.text.trim() === '') {
    return fail('blocked_by_safety', `${PROVIDER_NAME} returned no text for this chat.`)
  }
  try {
    return ok({ json: JSON.parse(accumulator.text) as unknown, model, usage: accumulator.usage })
  } catch {
    return fail('invalid_output', `${PROVIDER_NAME} returned malformed JSON.`)
  }
}

/**
 * Gemini provider using the Interactions API with streaming and `store: false`.
 *
 * @param apiKey - The user's Gemini API key.
 * @param model - Model id; defaults to the development model.
 * @returns A provider for the LLM gateway.
 */
export function createGeminiProvider(apiKey: string, model = GEMINI_DEFAULT_MODEL): LlmProvider {
  const client = new GoogleGenAI({ apiKey })
  return {
    id: 'gemini',
    model,
    async generateSkim(request) {
      try {
        return toOutput(await collectStream(client, model, request), model)
      } catch (error) {
        return mapProviderError(error, PROVIDER_NAME)
      }
    },
  }
}

/**
 * Checks a key by listing models, which spends no tokens.
 *
 * @param apiKey - The key to check.
 * @returns Success when Gemini accepts the key.
 */
export async function validateGeminiKey(apiKey: string): Promise<RpcResult<null>> {
  try {
    const client = new GoogleGenAI({ apiKey })
    await client.models.list({ config: { pageSize: 1 } })
    return ok(null)
  } catch (error) {
    return mapProviderError(error, PROVIDER_NAME)
  }
}
