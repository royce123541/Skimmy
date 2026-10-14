import { afterEach, describe, expect, test, vi } from 'vitest'
import { createGeminiProvider } from '@/lib/ai/providers/gemini'
import type { SkimRequest } from '@/types/ai.types'

const request: SkimRequest = {
  systemPrompt: 'system',
  userPrompt: 'transcript',
  responseSchema: { type: 'object' },
}

function sseResponse(events: readonly unknown[]): Response {
  const body = events.map(event => `data: ${JSON.stringify(event)}\n\n`).join('')
  return new Response(body, { status: 200, headers: { 'content-type': 'text/event-stream' } })
}

function textDelta(text: string): unknown {
  return { event_type: 'step.delta', index: 0, delta: { type: 'text', text } }
}

describe('createGeminiProvider', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  test('assembles streamed JSON text and token usage, and asks Google not to store it', async () => {
    // Arrange
    const bodies: string[] = []
    const fetchMock = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      bodies.push(
        input instanceof Request ? await input.text() : JSON.stringify(init?.body ?? null),
      )
      return sseResponse([
        textDelta('{"tldr":'),
        textDelta('"ok"}'),
        {
          event_type: 'interaction.completed',
          interaction: { id: 'i1', usage: { total_input_tokens: 120, total_output_tokens: 30 } },
        },
      ])
    })
    vi.stubGlobal('fetch', fetchMock)

    // Act
    const result = await createGeminiProvider('test-key').generateSkim(request)

    // Assert
    expect(result).toEqual({
      success: true,
      data: {
        json: { tldr: 'ok' },
        model: 'gemini-3.5-flash-lite',
        usage: { inputTokens: 120, outputTokens: 30 },
      },
    })
    const body = JSON.parse(bodies[0] ?? '') as Record<string, unknown>
    expect(body).toMatchObject({ store: false, stream: true, model: 'gemini-3.5-flash-lite' })
  })

  test('reports malformed JSON as invalid output', async () => {
    // Arrange
    vi.stubGlobal('fetch', () => Promise.resolve(sseResponse([textDelta('{"tldr":')])))

    // Act
    const result = await createGeminiProvider('test-key').generateSkim(request)

    // Assert
    expect(result.success ? null : result.error.code).toBe('invalid_output')
  })

  test('maps a rejected key to an auth error', async () => {
    // Arrange
    vi.stubGlobal('fetch', () =>
      Promise.resolve(
        new Response(JSON.stringify({ error: { code: 400, message: 'API key not valid.' } }), {
          status: 400,
          headers: { 'content-type': 'application/json' },
        }),
      ),
    )

    // Act
    const result = await createGeminiProvider('bad-key').generateSkim(request)

    // Assert
    expect(result.success ? null : result.error.code).toBe('auth')
  })
})
