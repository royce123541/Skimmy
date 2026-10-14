import { afterEach, describe, expect, test, vi } from 'vitest'
import { createClaudeProvider } from '@/lib/ai/providers/claude'
import { createGeminiProvider } from '@/lib/ai/providers/gemini'
import { createOpenAiProvider } from '@/lib/ai/providers/openai'
import type { LlmProvider, SkimRequest } from '@/types/ai.types'
import type { RpcErrorCode } from '@/types/rpc.types'

/**
 * Provider conformance (plan §2.8): the same recorded situations must give the same
 * normalized result from every provider. Recordings are hand-built from each API's
 * documented stream format, so no key or network is needed.
 */

const SKIM_JSON = '{"tldr":"ok"}'
const request: SkimRequest = {
  systemPrompt: 'system',
  userPrompt: 'transcript',
  responseSchema: { type: 'object' },
}

interface SseEvent {
  readonly name?: string
  readonly data: unknown
}

function sse(events: readonly SseEvent[]): Response {
  const body = events
    .map(
      ({ name, data }) =>
        `${name === undefined ? '' : `event: ${name}\n`}data: ${JSON.stringify(data)}\n\n`,
    )
    .join('')
  return new Response(body, { status: 200, headers: { 'content-type': 'text/event-stream' } })
}

function httpError(status: number, message: string): Response {
  return new Response(JSON.stringify({ error: { type: 'error', code: status, message } }), {
    status,
    // Lets the SDKs' built-in retries finish immediately.
    headers: { 'content-type': 'application/json', 'retry-after-ms': '0', 'retry-after': '0' },
  })
}

// --- Claude (Messages API stream) ---

function claudeStream(text: string, stopReason: string): Response {
  const message = {
    id: 'msg_1',
    type: 'message',
    role: 'assistant',
    model: 'claude-opus-5-5',
    content: [],
    stop_reason: null,
    stop_sequence: null,
    usage: { input_tokens: 100, output_tokens: 1, cache_read_input_tokens: 20 },
  }
  const event = (type: string, data: Record<string, unknown>): SseEvent => ({
    name: type,
    data: { type, ...data },
  })
  return sse([
    event('message_start', { message }),
    event('content_block_start', { index: 0, content_block: { type: 'text', text: '' } }),
    event('content_block_delta', { index: 0, delta: { type: 'text_delta', text } }),
    event('content_block_stop', { index: 0 }),
    event('message_delta', {
      delta: { stop_reason: stopReason, stop_sequence: null },
      usage: { output_tokens: 30 },
    }),
    event('message_stop', {}),
  ])
}

// --- OpenAI (Responses API stream) ---

type OpenAiPart =
  { type: 'output_text'; text: string; annotations: [] } | { type: 'refusal'; refusal: string }

function openAiStream(part: OpenAiPart, status: 'completed' | 'incomplete'): Response {
  const item = {
    id: 'msg_1',
    type: 'message',
    role: 'assistant',
    status: 'completed',
    content: [part],
  }
  const response = {
    id: 'resp_1',
    object: 'response',
    created_at: 0,
    model: 'gpt-6.1-sol',
    status,
    output: [item],
    usage: { input_tokens: 120, output_tokens: 30, total_tokens: 150 },
  }
  const event = (type: string, data: Record<string, unknown>, sequence: number): SseEvent => ({
    name: type,
    data: { type, sequence_number: sequence, ...data },
  })
  const empty = part.type === 'output_text' ? { ...part, text: '' } : { ...part, refusal: '' }
  const delta =
    part.type === 'output_text'
      ? event(
          'response.output_text.delta',
          { item_id: 'msg_1', output_index: 0, content_index: 0, delta: part.text },
          4,
        )
      : event(
          'response.refusal.delta',
          { item_id: 'msg_1', output_index: 0, content_index: 0, delta: part.refusal },
          4,
        )
  return sse([
    event('response.created', { response: { ...response, status: 'in_progress', output: [] } }, 1),
    event('response.output_item.added', { output_index: 0, item: { ...item, content: [] } }, 2),
    event(
      'response.content_part.added',
      { item_id: 'msg_1', output_index: 0, content_index: 0, part: empty },
      3,
    ),
    delta,
    event(
      'response.content_part.done',
      { item_id: 'msg_1', output_index: 0, content_index: 0, part },
      5,
    ),
    event('response.output_item.done', { output_index: 0, item }, 6),
    event(status === 'completed' ? 'response.completed' : 'response.incomplete', { response }, 7),
  ])
}

// --- Gemini (Interactions API stream) ---

function geminiStream(text: string): Response {
  return sse([
    { data: { event_type: 'step.delta', index: 0, delta: { type: 'text', text } } },
    {
      data: {
        event_type: 'interaction.completed',
        interaction: { id: 'i1', usage: { total_input_tokens: 120, total_output_tokens: 30 } },
      },
    },
  ])
}

interface Recordings {
  readonly name: string
  readonly create: () => LlmProvider
  readonly success: () => Response
  /** Null where the provider has no refusal signal yet (Gemini's block shape is unmapped). */
  readonly refusal: (() => Response) | null
  readonly truncated: (() => Response) | null
}

const PROVIDERS: readonly Recordings[] = [
  {
    name: 'Claude',
    create: () => createClaudeProvider('test-key'),
    success: () => claudeStream(SKIM_JSON, 'end_turn'),
    refusal: () => claudeStream('', 'refusal'),
    truncated: () => claudeStream('{"tldr":', 'max_tokens'),
  },
  {
    name: 'OpenAI',
    create: () => createOpenAiProvider('test-key'),
    success: () =>
      openAiStream({ type: 'output_text', text: SKIM_JSON, annotations: [] }, 'completed'),
    refusal: () =>
      openAiStream({ type: 'refusal', refusal: 'I cannot help with that.' }, 'completed'),
    truncated: () =>
      openAiStream({ type: 'output_text', text: '{"tldr":', annotations: [] }, 'incomplete'),
  },
  {
    name: 'Gemini',
    create: () => createGeminiProvider('test-key', undefined, { maxRetries: 0 }),
    success: () => geminiStream(SKIM_JSON),
    refusal: null,
    truncated: () => geminiStream('{"tldr":'),
  },
]

function stubFetch(respond: () => Response): void {
  vi.stubGlobal(
    'fetch',
    vi.fn(() => Promise.resolve(respond())),
  )
}

async function errorCodeOf(provider: LlmProvider): Promise<RpcErrorCode | null> {
  const result = await provider.generateSkim(request)
  return result.success ? null : result.error.code
}

describe.each(PROVIDERS)('$name provider conformance', recordings => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  test('returns the parsed JSON with input and output token counts', async () => {
    // Arrange
    stubFetch(recordings.success)

    // Act
    const result = await recordings.create().generateSkim(request)

    // Assert
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.json).toEqual({ tldr: 'ok' })
      expect(result.data.usage.inputTokens).toBe(120)
      expect(result.data.usage.outputTokens).toBe(30)
    }
  })

  test.runIf(recordings.refusal !== null)('reports a refusal as refused', async () => {
    // Arrange
    stubFetch(recordings.refusal ?? recordings.success)

    // Act / Assert
    expect(await errorCodeOf(recordings.create())).toBe('refused')
  })

  test('reports a cut-off answer as invalid output', async () => {
    // Arrange
    stubFetch(recordings.truncated ?? recordings.success)

    // Act / Assert
    expect(await errorCodeOf(recordings.create())).toBe('invalid_output')
  })

  test('reports a rejected key as an auth error', async () => {
    // Arrange
    stubFetch(() => httpError(401, 'invalid x-api-key'))

    // Act / Assert
    expect(await errorCodeOf(recordings.create())).toBe('auth')
  })

  test('reports rate limiting as rate_limited', async () => {
    // Arrange
    stubFetch(() => httpError(429, 'rate limited'))

    // Act / Assert
    expect(await errorCodeOf(recordings.create())).toBe('rate_limited')
  })
})
