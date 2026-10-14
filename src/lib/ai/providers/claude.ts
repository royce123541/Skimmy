import Anthropic from '@anthropic-ai/sdk'
import { catalogProvider } from '@/lib/ai/modelCatalog'
import { mapProviderError } from '@/lib/ai/providerErrors'
import { fail, ok } from '@/lib/messaging/rpcResult'
import type { LlmProvider, ProviderSkimOutput, SkimRequest } from '@/types/ai.types'
import type { RpcResult } from '@/types/rpc.types'

export const CLAUDE_DEFAULT_MODEL = catalogProvider('claude').defaultModel

const PROVIDER_NAME = 'Claude'
/** Room for a full skim plus thinking; streaming keeps it clear of HTTP timeouts. */
const MAX_OUTPUT_TOKENS = 16_000
/** Models that accept server-side refusal fallbacks (`fallbacks: "default"`). */
const FALLBACK_MODELS: ReadonlySet<string> = new Set(['claude-opus-5-5', 'claude-sonnet-5-5'])
const SERVER_FALLBACK_BETA = 'server-side-fallback-2026-07-01'

export interface ClaudeOptions {
  /** Replaces the network layer in tests. */
  readonly fetch?: typeof fetch
}

function createClient(apiKey: string, options: ClaudeOptions): Anthropic {
  return new Anthropic({
    apiKey,
    // The key is the user's own, typed into Skimmy's settings and used only from the
    // extension's service worker (ADR 0003), which is what this flag is for.
    dangerouslyAllowBrowser: true,
    ...(options.fetch === undefined ? {} : { fetch: options.fetch }),
  })
}

async function streamSkim(
  client: Anthropic,
  model: string,
  request: SkimRequest,
): Promise<Anthropic.Beta.BetaMessage> {
  const stream = client.beta.messages.stream({
    model,
    max_tokens: MAX_OUTPUT_TOKENS,
    // The system prompt never changes between skims, so it's cached (plan §2.8).
    system: [{ type: 'text', text: request.systemPrompt, cache_control: { type: 'ephemeral' } }],
    messages: [{ role: 'user', content: request.userPrompt }],
    output_config: {
      effort: 'low',
      format: { type: 'json_schema', schema: { ...request.responseSchema } },
    },
    ...(FALLBACK_MODELS.has(model) ? { betas: [SERVER_FALLBACK_BETA], fallbacks: 'default' } : {}),
  })
  return stream.finalMessage()
}

function toOutput(message: Anthropic.Beta.BetaMessage): RpcResult<ProviderSkimOutput> {
  if (message.stop_reason === 'refusal') {
    return fail('refused', `${PROVIDER_NAME} declined to skim this chat.`)
  }
  if (message.stop_reason === 'max_tokens') {
    return fail('invalid_output', `${PROVIDER_NAME}'s answer was cut off before it finished.`)
  }
  const text = message.content
    .flatMap(block => (block.type === 'text' ? [block.text] : []))
    .join('')
  const usage = message.usage
  const inputTokens =
    usage.input_tokens +
    (usage.cache_read_input_tokens ?? 0) +
    (usage.cache_creation_input_tokens ?? 0)
  try {
    return ok({
      json: JSON.parse(text) as unknown,
      model: message.model,
      usage: { inputTokens, outputTokens: usage.output_tokens },
    })
  } catch {
    return fail('invalid_output', `${PROVIDER_NAME} returned malformed JSON.`)
  }
}

/**
 * Claude provider: Messages API with streaming, structured JSON output and low effort.
 * Opus and Sonnet retry policy declines on a fallback model server-side.
 *
 * @param apiKey - The user's Anthropic API key.
 * @param model - Model id from the catalog.
 * @param options - Test hooks.
 * @returns A provider for the LLM gateway.
 */
export function createClaudeProvider(
  apiKey: string,
  model = CLAUDE_DEFAULT_MODEL,
  options: ClaudeOptions = {},
): LlmProvider {
  const client = createClient(apiKey, options)
  return {
    id: 'claude',
    model,
    async generateSkim(request) {
      try {
        return toOutput(await streamSkim(client, model, request))
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
 * @param options - Test hooks.
 * @returns Success when Anthropic accepts the key.
 */
export async function validateClaudeKey(
  apiKey: string,
  options: ClaudeOptions = {},
): Promise<RpcResult<null>> {
  try {
    await createClient(apiKey, options).models.list({ limit: 1 })
    return ok(null)
  } catch (error) {
    return mapProviderError(error, PROVIDER_NAME)
  }
}
