import type { RpcResult } from '@/types/rpc.types'

/** LLM providers behind the gateway (ADR 0003). */
export type ProviderId = 'claude' | 'openai' | 'gemini' | 'on-device'

/** Providers that need a user-supplied API key. */
export type CloudProviderId = Exclude<ProviderId, 'on-device'>

export interface TokenUsage {
  readonly inputTokens: number
  readonly outputTokens: number
}

/** Everything a provider needs to produce one skim. */
export interface SkimRequest {
  readonly systemPrompt: string
  readonly userPrompt: string
  /** JSON Schema the response must follow. */
  readonly responseSchema: Readonly<Record<string, unknown>>
}

/** Raw provider output: parsed JSON that still has to pass Zod validation. */
export interface ProviderSkimOutput {
  readonly json: unknown
  readonly model: string
  readonly usage: TokenUsage
}

export interface LlmProvider {
  readonly id: ProviderId
  readonly model: string
  generateSkim(request: SkimRequest, signal?: AbortSignal): Promise<RpcResult<ProviderSkimOutput>>
}
