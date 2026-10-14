import { outermost, readText } from '@/lib/adapters/core/domText'
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

// The sender named in the row's accessible label, when the label's language matches the pack.
function labelSender(row: Element, pack: SelectorPack): string | null {
  if (pack.messageLabel === null) {
    return null
  }
  const label = queryFirst(row, pack.messageLabel.element)?.getAttribute('aria-label') ?? ''
  const sender = new RegExp(pack.messageLabel.pattern).exec(label)?.groups?.sender?.trim()
  return sender === undefined || sender === '' ? null : sender
}

interface SenderReading {
  readonly name: string
  readonly isSelf: boolean
}

function resolveSender(
  row: Element,
  pack: SelectorPack,
  isRightSide: boolean,
  lastSender: string,
): SenderReading {
  const fromLabel = labelSender(row, pack)
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

function readRow(row: Element, list: Element, pack: SelectorPack, lastSender: string): RowReading {
  const body = bodyElements(row, pack)
  const text = body.map(readText).filter(Boolean).join('\n')
  const attachments = readAttachments(row, pack)
  if (text === '' && attachments.length === 0) {
    return { message: null, lastSender }
  }
  const sender = resolveSender(row, pack, isRightAligned(body[0] ?? row, list), lastSender)
  const reply = queryFirst(row, pack.replyExcerpt)
  const message: CapturedMessage = {
    platformMessageId: readMessageId(row, pack),
    sender: { name: sender.name, platformUserId: null, isSelf: sender.isSelf },
    text,
    sentAt: null,
    timePrecision: 'captured',
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
  let lastSender = options.fallbackSender
  for (const row of rows) {
    const reading = readRow(row, list, pack, lastSender)
    lastSender = reading.lastSender
    if (reading.message !== null) {
      messages.push(reading.message)
    }
  }
  return messages
}
