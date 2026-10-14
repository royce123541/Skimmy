/** Messaging platforms Skimmy reads (ADR 0005). */
export type PlatformId = 'messenger' | 'whatsapp' | 'slack' | 'discord' | 'telegram'

/** How much a message's timestamp can be trusted. */
export type TimePrecision = 'exact' | 'minute' | 'inferred' | 'captured'

export type AttachmentKind = 'image' | 'video' | 'audio' | 'file' | 'sticker' | 'link' | 'other'

/** Identifies the conversation open in a tab. */
export interface ConversationRef {
  readonly platform: PlatformId
  /** Workspace / server / team id; `_` for platforms without one. */
  readonly workspaceId: string
  readonly conversationId: string
  readonly title: string
  readonly isGroup: boolean
  readonly url: string
}

export interface MessageSender {
  readonly name: string
  readonly platformUserId: string | null
  readonly isSelf: boolean
}

/** The canonical message every downstream module sees. Plain text, never HTML. */
export interface CapturedMessage {
  /** Null when the platform exposes no id; identity is then assigned at ingestion. */
  readonly platformMessageId: string | null
  readonly sender: MessageSender
  readonly text: string
  /** Epoch milliseconds. */
  readonly sentAt: number | null
  readonly timePrecision: TimePrecision
  readonly replyToExcerpt: string | null
  readonly attachments: readonly AttachmentKind[]
  readonly isSystemEvent: boolean
}
