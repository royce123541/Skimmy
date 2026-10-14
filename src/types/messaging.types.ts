import type { CloudProviderId } from '@/types/ai.types'
import type { CapturedMessage, ConversationRef } from '@/types/platform.types'

export interface IngestBatchPayload {
  readonly conversation: ConversationRef
  readonly messages: readonly CapturedMessage[]
}

export interface ConversationChangedPayload {
  readonly conversation: ConversationRef | null
}

export interface RequestSkimPayload {
  readonly threadKey: string
  /** Skim the newest N messages instead of only those since the last skim. */
  readonly lastCount?: number
  /** Use this provider instead of the default, for "Retry with…". */
  readonly provider?: CloudProviderId
}

export interface StartCatchUpPayload {
  /** How many messages to collect before stopping. */
  readonly target: number
}

export type CatchUpStopReason = 'reached' | 'exhausted' | 'cancelled' | 'timeout' | 'busy'

export interface CatchUpOutcome {
  /** Distinct messages seen during the catch-up, including those already on screen. */
  readonly collected: number
  readonly reason: CatchUpStopReason
}

export interface SaveApiKeyPayload {
  readonly provider: CloudProviderId
  readonly apiKey: string
}

export interface DeleteApiKeyPayload {
  readonly provider: CloudProviderId
}
