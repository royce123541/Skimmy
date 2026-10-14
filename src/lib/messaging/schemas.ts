import { z } from 'zod'
import type {
  ConversationChangedPayload,
  DeleteApiKeyPayload,
  IngestBatchPayload,
  RequestSkimPayload,
  SaveApiKeyPayload,
  StartCatchUpPayload,
} from '@/types/messaging.types'
import type { CapturedMessage, ConversationRef } from '@/types/platform.types'

/** Upper bound on one capture batch, so a misbehaving page can't flood the service worker. */
const MAX_BATCH_MESSAGES = 500
const MAX_TEXT_CHARS = 20_000
/** Matches the skim cap, so a catch-up never collects more than one skim can use. */
export const MAX_CATCH_UP_MESSAGES = 300
export const MIN_CATCH_UP_MESSAGES = 10

const PlatformIdSchema = z.enum(['messenger', 'whatsapp', 'slack', 'discord', 'telegram'])

export const ConversationRefSchema = z.strictObject({
  platform: PlatformIdSchema,
  workspaceId: z.string().min(1),
  conversationId: z.string().min(1),
  title: z.string(),
  isGroup: z.boolean(),
  url: z.url(),
}) satisfies z.ZodType<ConversationRef>

export const CapturedMessageSchema = z.strictObject({
  platformMessageId: z.string().nullable(),
  sender: z.strictObject({
    name: z.string(),
    platformUserId: z.string().nullable(),
    isSelf: z.boolean(),
  }),
  text: z.string().max(MAX_TEXT_CHARS),
  sentAt: z.number().nullable(),
  timePrecision: z.enum(['exact', 'minute', 'inferred', 'captured']),
  replyToExcerpt: z.string().nullable(),
  attachments: z.array(z.enum(['image', 'video', 'audio', 'file', 'sticker', 'link', 'other'])),
  isSystemEvent: z.boolean(),
}) satisfies z.ZodType<CapturedMessage>

export const IngestBatchSchema = z.strictObject({
  conversation: ConversationRefSchema,
  messages: z.array(CapturedMessageSchema).max(MAX_BATCH_MESSAGES),
}) satisfies z.ZodType<IngestBatchPayload>

export const ConversationChangedSchema = z.strictObject({
  conversation: ConversationRefSchema.nullable(),
}) satisfies z.ZodType<ConversationChangedPayload>

const CloudProviderSchema = z.enum(['gemini', 'claude', 'openai'])

const CatchUpCountSchema = z.int().min(1).max(MAX_CATCH_UP_MESSAGES)

export const RequestSkimSchema = z.strictObject({
  threadKey: z.string().min(1),
  lastCount: CatchUpCountSchema.optional(),
  provider: CloudProviderSchema.optional(),
}) satisfies z.ZodType<RequestSkimPayload>

export const StartCatchUpSchema = z.strictObject({
  target: z.int().min(MIN_CATCH_UP_MESSAGES).max(MAX_CATCH_UP_MESSAGES),
}) satisfies z.ZodType<StartCatchUpPayload>

export const SaveApiKeySchema = z.strictObject({
  provider: CloudProviderSchema,
  apiKey: z.string().trim().min(1),
}) satisfies z.ZodType<SaveApiKeyPayload>

export const DeleteApiKeySchema = z.strictObject({
  provider: CloudProviderSchema,
}) satisfies z.ZodType<DeleteApiKeyPayload>
