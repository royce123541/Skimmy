import { toThreadKey } from '@/lib/threadKeys'
import type { PlatformAdapter } from '@/types/adapter.types'
import type { CapturedMessage, ConversationRef } from '@/types/platform.types'

/** Wait for the chat to settle before reading, so one burst of messages is one batch. */
export const BATCH_DELAY_MS = 1500
/** How often to look for the message list after navigation (SPAs render it late). */
export const ATTACH_POLL_MS = 1000
/** Empty reads in a row before the adapter is reported as degraded. */
export const DEGRADED_AFTER_EMPTY_READS = 3
const MAX_BATCH_MESSAGES = 500

/** The environment the engine runs in; the content script adapts WXT's context to it. */
export interface CaptureHost {
  currentUrl(): URL
  onUrlChange(listener: () => void): void
  setInterval(callback: () => void, ms: number): void
  setTimeout(callback: () => void, ms: number): number
  clearTimeout(id: number): void
  sendIngest(conversation: ConversationRef, messages: readonly CapturedMessage[]): Promise<void>
  sendConversationChanged(conversation: ConversationRef | null): Promise<void>
  reportDegraded(reason: string): void
}

function reportError(error: unknown): void {
  console.error('Skimmy: capture failed', error)
}

/**
 * Watches the open conversation and sends new messages to the service worker. Owns
 * observation, debouncing, SPA navigation and health; adapters only read the DOM (ADR 0005).
 */
export class CaptureSession {
  private threadKey: string | null = null
  private observer: MutationObserver | null = null
  private observedRoot: Element | null = null
  private pendingFlush: number | null = null
  private emptyReads = 0

  /**
   * @param host - Timers, URL access and messaging.
   * @param adapter - The platform's DOM reader.
   */
  constructor(
    private readonly host: CaptureHost,
    private readonly adapter: PlatformAdapter,
  ) {}

  /** Starts following navigation and polling for the message list. */
  start(): void {
    this.handleRoute()
    this.host.onUrlChange(this.handleRoute)
    this.host.setInterval(this.attachIfNeeded, ATTACH_POLL_MS)
  }

  /** Sends what's on screen now, skipping the debounce. Catch-up calls this every step. */
  flushNow(): void {
    if (this.pendingFlush !== null) {
      this.host.clearTimeout(this.pendingFlush)
    }
    this.flush()
  }

  private readonly handleRoute = (): void => {
    const conversation = this.adapter.getActiveConversation(this.host.currentUrl())
    const threadKey = conversation === null ? null : toThreadKey(conversation)
    if (threadKey === this.threadKey) {
      return
    }
    this.threadKey = threadKey
    this.observer?.disconnect()
    this.observer = null
    this.observedRoot = null
    this.emptyReads = 0
    this.host.sendConversationChanged(conversation).catch(reportError)
    this.attachIfNeeded()
  }

  private readonly attachIfNeeded = (): void => {
    if (this.threadKey === null) {
      return
    }
    const root = this.adapter.getMessageListRoot()
    if (root === null || (root === this.observedRoot && root.isConnected)) {
      return
    }
    this.observer?.disconnect()
    this.observer = new MutationObserver(this.scheduleFlush)
    this.observer.observe(root, { childList: true, subtree: true, characterData: true })
    this.observedRoot = root
    this.scheduleFlush()
  }

  private readonly scheduleFlush = (): void => {
    if (this.pendingFlush !== null) {
      this.host.clearTimeout(this.pendingFlush)
    }
    this.pendingFlush = this.host.setTimeout(this.flush, BATCH_DELAY_MS)
  }

  private readonly flush = (): void => {
    this.pendingFlush = null
    // Re-read the conversation: titles often render after the URL changes.
    const conversation = this.adapter.getActiveConversation(this.host.currentUrl())
    if (conversation === null) {
      return
    }
    const messages = this.adapter.readVisibleMessages().slice(-MAX_BATCH_MESSAGES)
    if (messages.length === 0) {
      this.emptyReads += 1
      if (this.emptyReads === DEGRADED_AFTER_EMPTY_READS) {
        this.host.reportDegraded(
          `No messages found with selector pack ${this.adapter.selectorPackVersion}`,
        )
      }
      return
    }
    this.emptyReads = 0
    this.host.sendIngest(conversation, messages).catch(reportError)
  }
}

/**
 * Creates and starts a capture session.
 *
 * @param host - Timers, URL access and messaging.
 * @param adapter - The platform's DOM reader.
 * @returns The running session.
 */
export function startCapture(host: CaptureHost, adapter: PlatformAdapter): CaptureSession {
  const session = new CaptureSession(host, adapter)
  session.start()
  return session
}
