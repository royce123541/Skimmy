import { outermost, readText } from '@/lib/adapters/core/domText'
import { parseLabelTime } from '@/lib/adapters/core/labelTime'
import {
  matchesAny,
  queryAll,
  queryFirst,
  type SelectorPack,
} from '@/lib/adapters/core/selectorPack'
import type { AttachmentKind, CapturedMessage } from '@/types/platform.types'

/** A bubble whose centre sits this far right of the list's centre is an outgoing message. */
const SELF_ALIGNMENT_THRESHOLD = 0.1

export interface ReadOptions {
  /** Sender to assume when a row shows no name (in a DM, the other person). */
  readonly fallbackSender: string
  /** The reader's clock, for turning relative label times ("Tuesday 9:42pm") into dates. */
  readonly now: Date
}

interface RowContext {
  readonly list: Element
  readonly pack: SelectorPack
  readonly now: Date
}

function isRightAligned(bubble: Element, list: Element): boolean {
  const listRect = list.getBoundingClientRect()
  const bubbleRect = bubble.getBoundingClientRect()
  if (listRect.width === 0 || bubbleRect.width === 0) {
    return false
  }
  const listCentre = listRect.left + listRect.width / 2
  const bubbleCentre = bubbleRect.left + bubbleRect.width / 2
  return bubbleCentre - listCentre > listRect.width * SELF_ALIGNMENT_THRESHOLD
}

function readAttachments(row: Element, pack: SelectorPack): AttachmentKind[] {
  return Object.entries(pack.attachments).flatMap(([kind, selectors]) =>
    queryFirst(row, selectors) === null ? [] : [kind as AttachmentKind],
  )
}

// The row's own text elements, excluding quoted reply excerpts.
function bodyElements(row: Element, pack: SelectorPack): Element[] {
  const candidates = queryAll(row, pack.messageText).filter(
    element => pack.replyExcerpt.length === 0 || !matchesAny(element, pack.replyExcerpt),
  )
  return outermost(candidates)
}

function readMessageId(row: Element, pack: SelectorPack): string | null {
  if (pack.messageId === null) {
    return null
  }
  const element = queryFirst(row, pack.messageId.element)
  const id = element?.getAttribute(pack.messageId.attribute)?.trim() ?? ''
  return id === '' ? null : id
}

interface LabelParts {
  readonly sender: string | null
  readonly time: string | null
}

// The sender and time named in the row's accessible label, when its language matches the pack.
function readLabel(row: Element, pack: SelectorPack): LabelParts {
  if (pack.messageLabel === null) {
    return { sender: null, time: null }
  }
  const label = queryFirst(row, pack.messageLabel.element)?.getAttribute('aria-label') ?? ''
  const groups = new RegExp(pack.messageLabel.pattern).exec(label)?.groups
  const sender = groups?.sender?.trim() ?? ''
  const time = groups?.time?.trim() ?? ''
  return { sender: sender === '' ? null : sender, time: time === '' ? null : time }
}

interface SenderReading {
  readonly name: string
  readonly isSelf: boolean
}

function resolveSender(
  row: Element,
  pack: SelectorPack,
  fromLabel: string | null,
  isRightSide: boolean,
  lastSender: string,
): SenderReading {
  if (fromLabel !== null) {
    const isSelf = pack.messageLabel?.selfNames.includes(fromLabel) === true
    return isSelf ? { name: 'You', isSelf } : { name: fromLabel, isSelf }
  }
  if (isRightSide || matchesAny(row, pack.selfMarker)) {
    return { name: 'You', isSelf: true }
  }
  const shownName = queryFirst(row, pack.senderName)
  const name = shownName === null ? '' : readText(shownName)
  return { name: name === '' ? lastSender : name, isSelf: false }
}

interface RowReading {
  readonly message: CapturedMessage | null
  readonly lastSender: string
}

function readRow(row: Element, context: RowContext, lastSender: string): RowReading {
  const { list, pack } = context
  const body = bodyElements(row, pack)
  const text = body.map(readText).filter(Boolean).join('\n')
  const attachments = readAttachments(row, pack)
  if (text === '' && attachments.length === 0) {
    return { message: null, lastSender }
  }
  const label = readLabel(row, pack)
  const rightSide = isRightAligned(body[0] ?? row, list)
  const sender = resolveSender(row, pack, label.sender, rightSide, lastSender)
  const sentAt = label.time === null ? null : parseLabelTime(label.time, context.now)
  const reply = queryFirst(row, pack.replyExcerpt)
  const message: CapturedMessage = {
    platformMessageId: readMessageId(row, pack),
    sender: { name: sender.name, platformUserId: null, isSelf: sender.isSelf },
    text,
    sentAt,
    timePrecision: sentAt === null ? 'captured' : 'minute',
    replyToExcerpt: reply ? readText(reply) : null,
    attachments,
    isSystemEvent: matchesAny(row, pack.systemEvent),
  }
  return { message, lastSender: sender.isSelf ? lastSender : sender.name }
}

/**
 * Reads every visible message row in a list using a selector pack. Platforms that show a
 * sender's name only on the first bubble of a group carry it forward to later bubbles.
 *
 * @param list - The message list root.
 * @param pack - The platform's selector pack.
 * @param options - Defaults for missing data.
 * @returns Captured messages, top to bottom.
 */
export function readMessages(
  list: Element,
  pack: SelectorPack,
  options: ReadOptions,
): CapturedMessage[] {
  const rows = queryAll(list, pack.messageRow)
  const messages: CapturedMessage[] = []
  const context: RowContext = { list, pack, now: options.now }
  let lastSender = options.fallbackSender
  for (const row of rows) {
    const reading = readRow(row, context, lastSender)
    lastSender = reading.lastSender
    if (reading.message !== null) {
      messages.push(reading.message)
    }
  }
  return messages
}
