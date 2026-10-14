import type { SkimOutput } from '@/lib/ai/schemas/skimOutput'
import type { GroundedSkim, SkimEvent } from '@/types/skim.types'

const DAY_MS = 86_400_000
/** Events further ahead than this from their source message are flagged for review. */
const MAX_EVENT_LEAD_DAYS = 366
const MAX_EVENT_LEAD_MS = MAX_EVENT_LEAD_DAYS * DAY_MS

interface Cited {
  readonly refs: readonly string[]
}

function resolveRefs(refs: readonly string[], refToKey: ReadonlyMap<string, string>): string[] {
  return refs.flatMap(ref => {
    const key = refToKey.get(ref.trim())
    return key === undefined ? [] : [key]
  })
}

// Replaces refs with message keys and drops items that cite nothing real.
function groundItems<T extends Cited>(
  items: readonly T[],
  refToKey: ReadonlyMap<string, string>,
): (Omit<T, 'refs'> & { sourceKeys: string[] })[] {
  return items.flatMap(({ refs, ...rest }) => {
    const sourceKeys = resolveRefs(refs, refToKey)
    return sourceKeys.length === 0 ? [] : [{ ...rest, sourceKeys }]
  })
}

type UngroundedEvent = Omit<SkimEvent, 'needsReview'>

// A date before the message that mentions it (with a day of slack for all-day dates read as
// UTC midnight), or more than a year after it, is probably a misread relative date.
function needsReview(event: UngroundedEvent, messageTimes: ReadonlyMap<string, number>): boolean {
  const start = Date.parse(event.start)
  if (Number.isNaN(start)) {
    return true
  }
  const times = event.sourceKeys.flatMap(key => {
    const time = messageTimes.get(key)
    return time === undefined ? [] : [time]
  })
  if (times.length === 0) {
    return false
  }
  const mentionedAt = Math.min(...times)
  return start < mentionedAt - DAY_MS || start > mentionedAt + MAX_EVENT_LEAD_MS
}

/**
 * Ties every model claim to stored messages (plan §2.5). Items whose citations don't exist
 * in the request are dropped rather than shown without a source.
 *
 * @param output - Schema-valid model output.
 * @param refToKey - The transcript's ref map.
 * @param messageTimes - When each cited message was sent (epoch ms), for checking event dates.
 * @returns The skim with citations as message keys.
 */
export function groundSkim(
  output: SkimOutput,
  refToKey: ReadonlyMap<string, string>,
  messageTimes: ReadonlyMap<string, number>,
): GroundedSkim {
  return {
    tldr: output.tldr.trim(),
    highlights: groundItems(output.highlights, refToKey),
    actionItems: groundItems(output.actionItems, refToKey),
    questionsForMe: groundItems(output.questionsForMe, refToKey),
    decisions: groundItems(output.decisions, refToKey),
    events: groundItems(output.events, refToKey).map(event => ({
      ...event,
      needsReview: needsReview(event, messageTimes),
    })),
  }
}
