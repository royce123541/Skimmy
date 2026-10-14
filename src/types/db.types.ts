import type { CloudProviderId, ProviderId, TokenUsage } from '@/types/ai.types'
import type { AttachmentKind, PlatformId, TimePrecision } from '@/types/platform.types'
import type { GroundedSkim } from '@/types/skim.types'

export interface StoredThread {
  readonly threadKey: string
  readonly platform: PlatformId
  readonly workspaceId: string
  readonly conversationId: string
  readonly title: string
  readonly isGroup: boolean
  readonly url: string
  readonly lastCapturedAt: number
  /** Order value of the last message included in a skim, or null if never skimmed. */
  readonly skimWatermark: number | null
}

export interface StoredMessage {
  readonly messageKey: string
  readonly threadKey: string
  /** Fractional position in the thread; backfilled history gets lower values. */
  readonly order: number
  readonly fingerprint: string
  readonly platformMessageId: string | null
  readonly senderName: string
  readonly senderIsSelf: boolean
  readonly text: string
  readonly sentAt: number | null
  readonly timePrecision: TimePrecision
  readonly replyToExcerpt: string | null
  readonly attachments: readonly AttachmentKind[]
  readonly isSystemEvent: boolean
  readonly capturedAt: number
  /** True when this message was stored without overlapping earlier ones (possible gap). */
  readonly startsSegment: boolean
}

export interface StoredSkim {
  readonly id: string
  readonly threadKey: string
  readonly createdAt: number
  readonly provider: ProviderId
  readonly model: string
  readonly promptVersion: string
  readonly fromOrder: number
  readonly toOrder: number
  readonly messageCount: number
  readonly result: GroundedSkim
  readonly usage: TokenUsage
}

export interface StoredSecret {
  readonly name: CloudProviderId
  readonly value: string
  readonly updatedAt: number
}
