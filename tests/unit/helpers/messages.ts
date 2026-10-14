import type { CapturedMessage } from '@/types/platform.types'

/** Builds a captured message with sensible defaults for tests. */
export function message(
  text: string,
  sender = 'Mia',
  overrides: Partial<CapturedMessage> = {},
): CapturedMessage {
  return {
    platformMessageId: null,
    sender: { name: sender, platformUserId: null, isSelf: sender === 'You' },
    text,
    sentAt: null,
    timePrecision: 'captured',
    replyToExcerpt: null,
    attachments: [],
    isSystemEvent: false,
    ...overrides,
  }
}
