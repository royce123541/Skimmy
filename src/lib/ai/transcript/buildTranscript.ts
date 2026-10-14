import type { StoredMessage, StoredThread } from '@/types/db.types'

/** Longer messages are cut so one wall of text can't crowd out the rest of the chat. */
const MAX_MESSAGE_CHARS = 1500

export interface TranscriptInput {
  readonly thread: StoredThread
  readonly messages: readonly StoredMessage[]
  readonly now: Date
  readonly timeZone: string
  readonly outputLanguage: string
}

export interface Transcript {
  readonly text: string
  /** Maps local refs ("m1") back to stored message keys. */
  readonly refToKey: ReadonlyMap<string, string>
}

// Keeps chat text from closing the transcript block early (prompt-injection hardening).
function neutralize(text: string): string {
  return text.replace(/<\/?\s*(transcript|chat|context|memory)/gi, match => match.replace('<', '‹'))
}

function attribute(value: string): string {
  return neutralize(value).replace(/"/g, "'")
}

function formatTime(message: StoredMessage, formatter: Intl.DateTimeFormat): string {
  const time = formatter.format(new Date(message.sentAt ?? message.capturedAt))
  const isApproximate = message.timePrecision === 'inferred' || message.timePrecision === 'captured'
  return isApproximate ? `~${time}` : time
}

function formatBody(message: StoredMessage): string {
  const text =
    message.text.length > MAX_MESSAGE_CHARS
      ? `${message.text.slice(0, MAX_MESSAGE_CHARS)} [truncated]`
      : message.text
  const attachments = message.attachments.map(kind => `[${kind}]`)
  return neutralize([text, ...attachments].filter(Boolean).join(' '))
}

function formatLine(ref: string, message: StoredMessage, formatter: Intl.DateTimeFormat): string {
  const sender = message.senderIsSelf ? 'You' : neutralize(message.senderName)
  const reply = message.replyToExcerpt ? ` (↩ "${attribute(message.replyToExcerpt)}")` : ''
  return `${ref} | ${formatTime(message, formatter)} | ${sender}${reply}: ${formatBody(message)}`
}

/**
 * Renders messages as the compact, line-per-message transcript the model sees (plan §2.3).
 *
 * @param input - Thread, messages (oldest first) and the reader's clock and language.
 * @returns The prompt text plus the map from refs back to message keys.
 */
export function buildTranscript(input: TranscriptInput): Transcript {
  const formatter = new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
    timeZone: input.timeZone,
  })
  const visible = input.messages.filter(message => !message.isSystemEvent)
  const refs = visible.map((_, index) => `m${index + 1}`)
  const lines = visible.map((message, index) => formatLine(refs[index] ?? '', message, formatter))
  const { thread } = input
  const text = [
    `<chat platform="${thread.platform}" title="${attribute(thread.title)}" type="${thread.isGroup ? 'group' : 'direct'}"/>`,
    `<context now="${input.now.toISOString()}" timezone="${input.timeZone}" me="You" output_language="${input.outputLanguage}"/>`,
    '<transcript>',
    ...lines,
    '</transcript>',
  ].join('\n')
  const refToKey = new Map(visible.map((message, index) => [refs[index] ?? '', message.messageKey]))
  return { text, refToKey }
}
