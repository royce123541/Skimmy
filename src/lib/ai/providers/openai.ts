import OpenAI from 'openai'
import { catalogProvider } from '@/lib/ai/modelCatalog'
import { mapProviderError } from '@/lib/ai/providerErrors'
import { fail, ok } from '@/lib/messaging/rpcResult'
import type { LlmProvider, ProviderSkimOutput, SkimRequest } from '@/types/ai.types'
import type { RpcResult } from '@/types/rpc.types'

export const OPENAI_DEFAULT_MODEL = catalogProvider('openai').defaultModel

const PROVIDER_NAME = 'ChatGPT'
const SCHEMA_NAME = 'skim'
const MAX_OUTPUT_TOKENS = 16_000

export interface OpenAiOptions {
  /** Replaces the network layer in tests. */
  readonly fetch?: typeof fetch
}

type FinalResponse = Awaited<ReturnType<ReturnType<OpenAI['responses']['stream']>['finalResponse']>>

function createClient(apiKey: string, options: OpenAiOptions): OpenAI {
  return new OpenAI({
    apiKey,
    // The key is the user's own and used only from the extension's service worker (ADR 0003).
    dangerouslyAllowBrowser: true,
    ...(options.fetch === undefined ? {} : { fetch: options.fetch }),
  })
}

async function streamSkim(
  client: OpenAI,
  model: string,
  request: SkimRequest,
): Promise<FinalResponse> {
  const stream = client.responses.stream({
    model,
    instructions: request.systemPrompt,
    input: request.userPrompt,
    max_output_tokens: MAX_OUTPUT_TOKENS,
    reasoning: { effort: 'low' },
    text: {
      format: {
        type: 'json_schema',
        name: SCHEMA_NAME,
        schema: { ...request.responseSchema },
        strict: true,
      },
    },
    // Skimmy never needs server-side history; don't let OpenAI keep the chat (ADR 0003).
    store: false,
  })
  return stream.finalResponse()
}

function refusalOf(response: FinalResponse): string | null {
  for (const item of response.output) {
    if (item.type !== 'message') {
      continue
    }
    const refusal = item.content.find(part => part.type === 'refusal')
    if (refusal !== undefined) {
      return refusal.refusal
    }
  }
  return null
}

function toOutput(response: FinalResponse): RpcResult<ProviderSkimOutput> {
  if (refusalOf(response) !== null) {
    return fail('refused', `${PROVIDER_NAME} declined to skim this chat.`)
  }
  if (response.status === 'incomplete') {
    return fail('invalid_output', `${PROVIDER_NAME}'s answer was cut off before it finished.`)
  }
  const usage = {
    inputTokens: response.usage?.input_tokens ?? 0,
    outputTokens: response.usage?.output_tokens ?? 0,
  }
  try {
    return ok({ json: JSON.parse(response.output_text) as unknown, model: response.model, usage })
  } catch {
    return fail('invalid_output', `${PROVIDER_NAME} returned malformed JSON.`)
  }
}

/**
 * OpenAI provider for "ChatGPT" keys: Responses API with streaming, strict JSON schema
 * output and `store: false`.
 *
 * @param apiKey - The user's OpenAI API key.
 * @param model - Model id from the catalog.
 * @param options - Test hooks.
 * @returns A provider for the LLM gateway.
 */
export function createOpenAiProvider(
  apiKey: string,
  model = OPENAI_DEFAULT_MODEL,
  options: OpenAiOptions = {},
): LlmProvider {
  const client = createClient(apiKey, options)
  return {
    id: 'openai',
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
 * @returns Success when OpenAI accepts the key.
 */
export async function validateOpenAiKey(
  apiKey: string,
  options: OpenAiOptions = {},
): Promise<RpcResult<null>> {
  try {
    await createClient(apiKey, options).models.list()
    return ok(null)
  } catch (error) {
    return mapProviderError(error, PROVIDER_NAME)
  }
}
