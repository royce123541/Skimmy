import type { PlatformAdapter } from '@/types/adapter.types'
import type { CatchUpOutcome, CatchUpStopReason } from '@/types/messaging.types'
import type { CapturedMessage } from '@/types/platform.types'

/** Pause between scroll steps: gives the page time to load and stays gentle on the platform. */
export const CATCH_UP_STEP_MS = 1500
/** Steps in a row with nothing new before deciding the chat has no older history. */
export const CATCH_UP_IDLE_STEPS = 5
/** Hard stop, so a catch-up never runs unattended for long. */
export const CATCH_UP_MAX_MS = 180_000

export interface CatchUpHost {
  wait(ms: number): Promise<void>
  now(): number
  /** Sends what's on screen to the service worker now, before the list recycles it. */
  flush(): void
}

// Messenger ids when present; otherwise sender + text, which is only used for counting.
function identityOf(message: CapturedMessage): string {
  return message.platformMessageId ?? `${message.sender.name}\u0000${message.text}`
}

interface Progress {
  readonly collected: number
  readonly idleSteps: number
  readonly elapsedMs: number
}

function stopReason(
  progress: Progress,
  target: number,
  signal: AbortSignal,
): CatchUpStopReason | null {
  if (signal.aborted) {
    return 'cancelled'
  }
  if (progress.collected >= target) {
    return 'reached'
  }
  if (progress.idleSteps >= CATCH_UP_IDLE_STEPS) {
    return 'exhausted'
  }
  return progress.elapsedMs >= CATCH_UP_MAX_MS ? 'timeout' : null
}

/**
 * Scrolls the open chat up step by step until `target` distinct messages have been seen,
 * flushing each step to the service worker because virtualized lists drop rows that scroll
 * away. Runs only when the user asks for it (ADR 0002).
 *
 * @param adapter - Reads messages and loads older history.
 * @param host - Timers and the capture flush.
 * @param target - Messages to collect, counting those already on screen.
 * @param signal - Aborts the catch-up when the user cancels.
 * @returns How many messages were seen and why it stopped.
 */
export async function catchUp(
  adapter: PlatformAdapter,
  host: CatchUpHost,
  target: number,
  signal: AbortSignal,
): Promise<CatchUpOutcome> {
  const seen = new Set<string>()
  const startedAt = host.now()
  let idleSteps = 0
  for (;;) {
    const before = seen.size
    adapter.readVisibleMessages().forEach(message => seen.add(identityOf(message)))
    host.flush()
    idleSteps = seen.size > before ? 0 : idleSteps + 1
    const progress = { collected: seen.size, idleSteps, elapsedMs: host.now() - startedAt }
    const reason = stopReason(progress, target, signal)
    if (reason !== null) {
      return { collected: seen.size, reason }
    }
    if (!adapter.loadOlder()) {
      return { collected: seen.size, reason: 'exhausted' }
    }
    await host.wait(CATCH_UP_STEP_MS)
  }
}
