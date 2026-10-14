import type { CapturedMessage } from '@/types/platform.types'

/** Gap between order values for appended messages; leaves room for midpoint inserts. */
const ORDER_STEP = 1024

/** A stored message reduced to what alignment needs. */
export interface OrderedFingerprint {
  readonly fingerprint: string
  readonly order: number
}

/** A newly observed message plus the order value it should be stored with. */
export interface PlacedMessage {
  readonly message: CapturedMessage
  readonly fingerprint: string
  readonly order: number
}

export interface AlignmentResult {
  readonly placed: readonly PlacedMessage[]
  /** True when the window shared no messages with storage, so a gap may exist before it. */
  readonly startsNewSegment: boolean
}

interface Overlap {
  readonly windowStart: number
  readonly storedStart: number
  readonly length: number
}

/**
 * Identity used to recognise the same message across re-renders: the platform id when
 * exposed, otherwise sender + normalized text + attachment kinds.
 *
 * @param message - A captured message.
 * @returns A string that is equal for re-observations of the same message.
 */
export function fingerprintOf(message: CapturedMessage): string {
  if (message.platformMessageId !== null) {
    return `id:${message.platformMessageId}`
  }
  const text = message.text.replace(/\s+/g, ' ').trim()
  return `fp:${message.sender.name}␟${text}␟${message.attachments.join(',')}`
}

function runLengthAt(
  windowPrints: readonly string[],
  stored: readonly OrderedFingerprint[],
  windowStart: number,
  storedStart: number,
): number {
  let length = 0
  while (
    windowStart + length < windowPrints.length &&
    storedStart + length < stored.length &&
    windowPrints[windowStart + length] === stored[storedStart + length]?.fingerprint
  ) {
    length += 1
  }
  return length
}

function findBestOverlap(
  windowPrints: readonly string[],
  stored: readonly OrderedFingerprint[],
): Overlap | null {
  let best: Overlap | null = null
  for (let windowStart = 0; windowStart < windowPrints.length; windowStart += 1) {
    for (let storedStart = 0; storedStart < stored.length; storedStart += 1) {
      const length = runLengthAt(windowPrints, stored, windowStart, storedStart)
      // `>=` prefers the most recent stored position when runs tie.
      if (length > 0 && length >= (best?.length ?? 0)) {
        best = { windowStart, storedStart, length }
      }
    }
  }
  if (best === null) {
    return null
  }
  // One shared message is too weak a signal ("ok", "lol"), unless the window starts exactly
  // where storage ends (live capture at the bottom) or ends exactly where storage starts
  // (scrolling up into older history).
  const minimumOverlap = Math.min(2, windowPrints.length, stored.length)
  const continuesTail = best.windowStart === 0 && best.storedStart + best.length === stored.length
  const continuesHead =
    best.storedStart === 0 && best.windowStart + best.length === windowPrints.length
  return best.length >= minimumOverlap || continuesTail || continuesHead ? best : null
}

// Evenly spaced order values strictly between `low` and `high` (either may be open-ended).
function ordersBetween(low: number | null, high: number | null, count: number): number[] {
  if (low === null && high === null) {
    return Array.from({ length: count }, (_, index) => (index + 1) * ORDER_STEP)
  }
  if (high === null) {
    return Array.from({ length: count }, (_, index) => (low ?? 0) + (index + 1) * ORDER_STEP)
  }
  if (low === null) {
    return Array.from({ length: count }, (_, index) => high - (count - index) * ORDER_STEP)
  }
  const step = (high - low) / (count + 1)
  return Array.from({ length: count }, (_, index) => low + (index + 1) * step)
}

function place(
  messages: readonly CapturedMessage[],
  prints: readonly string[],
  orders: readonly number[],
): PlacedMessage[] {
  return messages.map((message, index) => ({
    message,
    fingerprint: prints[index] ?? fingerprintOf(message),
    order: orders[index] ?? 0,
  }))
}

/**
 * Works out which messages in an observed window are new and where they belong, by finding
 * the longest run the window shares with stored messages (ADR 0005). Messages before the
 * run go before its stored position; messages after it go after.
 *
 * @param stored - Stored fingerprints for the thread, sorted by order.
 * @param window - Messages currently visible, top to bottom.
 * @returns The new messages with order values, and whether they start a new segment.
 */
export function alignWindow(
  stored: readonly OrderedFingerprint[],
  window: readonly CapturedMessage[],
): AlignmentResult {
  const prints = window.map(fingerprintOf)
  const overlap = findBestOverlap(prints, stored)
  if (overlap === null) {
    const tail = stored.at(-1)?.order ?? null
    const orders = ordersBetween(tail, null, window.length)
    return { placed: place(window, prints, orders), startsNewSegment: stored.length > 0 }
  }
  const anchorStart = stored[overlap.storedStart]
  const anchorEnd = stored[overlap.storedStart + overlap.length - 1]
  const before = window.slice(0, overlap.windowStart)
  const after = window.slice(overlap.windowStart + overlap.length)
  const beforeOrders = ordersBetween(
    stored[overlap.storedStart - 1]?.order ?? null,
    anchorStart?.order ?? null,
    before.length,
  )
  const afterOrders = ordersBetween(
    anchorEnd?.order ?? null,
    stored[overlap.storedStart + overlap.length]?.order ?? null,
    after.length,
  )
  return {
    placed: [
      ...place(before, prints.slice(0, overlap.windowStart), beforeOrders),
      ...place(after, prints.slice(overlap.windowStart + overlap.length), afterOrders),
    ],
    startsNewSegment: false,
  }
}
