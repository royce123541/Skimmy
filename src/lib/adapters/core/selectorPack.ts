import { z } from 'zod'

const Selectors = z.array(z.string().min(1))
const AttachmentKindSchema = z.enum(['image', 'video', 'audio', 'file', 'sticker', 'link', 'other'])

const PatternSchema = z.string().refine(
  pattern => {
    try {
      // Compiling throws on an invalid pattern.
      return pattern.includes('(?<sender>') && new RegExp(pattern).source !== ''
    } catch {
      return false
    }
  },
  { message: 'must be a valid regular expression with a named "sender" group' },
)

/** Where a row keeps the platform's own message id. */
const MessageIdSchema = z.strictObject({
  element: Selectors.min(1),
  attribute: z.string().min(1),
})

/**
 * An accessible label that names the sender (and often the time) of each message. Labels are
 * localized, so a pattern that doesn't match falls back to the visible sender name.
 */
const MessageLabelSchema = z.strictObject({
  element: Selectors.min(1),
  pattern: PatternSchema,
  selfNames: z.array(z.string().min(1)),
})

/**
 * A platform's DOM selectors, kept as data so fixes don't need code changes (ADR 0005).
 * Each field lists fallbacks in priority order: data attributes, ARIA, structure, classes.
 */
export const SelectorPackSchema = z.strictObject({
  platform: z.enum(['messenger', 'whatsapp', 'slack', 'discord', 'telegram']),
  version: z.string().min(1),
  notes: z.string().optional(),
  conversationTitle: Selectors,
  messageList: Selectors.min(1),
  messageRow: Selectors.min(1),
  messageId: MessageIdSchema.nullable(),
  messageLabel: MessageLabelSchema.nullable(),
  messageText: Selectors.min(1),
  senderName: Selectors,
  selfMarker: Selectors,
  replyExcerpt: Selectors,
  systemEvent: Selectors,
  attachments: z.partialRecord(AttachmentKindSchema, Selectors),
})

export type SelectorPack = z.infer<typeof SelectorPackSchema>

/**
 * Validates a selector pack, failing loudly at startup rather than silently capturing nothing.
 *
 * @param raw - Pack JSON, bundled or (later) fetched remotely.
 * @returns The validated pack.
 * @throws {z.ZodError} When the pack doesn't match the schema.
 */
export function parseSelectorPack(raw: unknown): SelectorPack {
  return SelectorPackSchema.parse(raw)
}

/**
 * The first element matched by the first selector that matches anything.
 *
 * @param root - Where to search.
 * @param selectors - Fallback selectors in priority order.
 * @returns The element, or null.
 */
export function queryFirst(root: ParentNode, selectors: readonly string[]): Element | null {
  for (const selector of selectors) {
    const found = root.querySelector(selector)
    if (found !== null) {
      return found
    }
  }
  return null
}

/**
 * All elements matched by the first selector that matches anything.
 *
 * @param root - Where to search.
 * @param selectors - Fallback selectors in priority order.
 * @returns The matches, possibly empty.
 */
export function queryAll(root: ParentNode, selectors: readonly string[]): Element[] {
  for (const selector of selectors) {
    const found = Array.from(root.querySelectorAll(selector))
    if (found.length > 0) {
      return found
    }
  }
  return []
}

/**
 * Whether the element matches, or sits inside, any of the selectors.
 *
 * @param element - Element to test.
 * @param selectors - Selectors to check.
 * @returns True on any match.
 */
export function matchesAny(element: Element, selectors: readonly string[]): boolean {
  return selectors.some(selector => element.closest(selector) !== null)
}
