import type { SkimOutput } from '@/lib/ai/schemas/skimOutput'
import type { GroundedSkim } from '@/types/skim.types'

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

/**
 * Ties every model claim to stored messages (plan §2.5). Items whose citations don't exist
 * in the request are dropped rather than shown without a source.
 *
 * @param output - Schema-valid model output.
 * @param refToKey - The transcript's ref map.
 * @returns The skim with citations as message keys.
 */
export function groundSkim(
  output: SkimOutput,
  refToKey: ReadonlyMap<string, string>,
): GroundedSkim {
  return {
    tldr: output.tldr.trim(),
    highlights: groundItems(output.highlights, refToKey),
    actionItems: groundItems(output.actionItems, refToKey),
    questionsForMe: groundItems(output.questionsForMe, refToKey),
  }
}
