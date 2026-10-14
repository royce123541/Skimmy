import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import {
  BATCH_DELAY_MS,
  DEGRADED_AFTER_EMPTY_READS,
  startCapture,
  type CaptureHost,
} from '@/lib/adapters/core/captureEngine'
import type { PlatformAdapter } from '@/types/adapter.types'
import type { CapturedMessage, ConversationRef } from '@/types/platform.types'
import { message } from '../../helpers/messages'

const conversation: ConversationRef = {
  platform: 'messenger',
  workspaceId: '_',
  conversationId: '1',
  title: 'Trip',
  isGroup: true,
  url: 'https://www.facebook.com/messages/t/1',
}

interface FakeHost extends CaptureHost {
  readonly ingested: (readonly CapturedMessage[])[]
  readonly changes: (ConversationRef | null)[]
  readonly degraded: string[]
}

function createFakeHost(): FakeHost {
  const ingested: (readonly CapturedMessage[])[] = []
  const changes: (ConversationRef | null)[] = []
  const degraded: string[] = []
  return {
    ingested,
    changes,
    degraded,
    currentUrl: () => new URL(conversation.url),
    onUrlChange: () => undefined,
    setInterval: (callback, ms) => {
      window.setInterval(callback, ms)
    },
    setTimeout: (callback, ms) => window.setTimeout(callback, ms),
    clearTimeout: id => {
      window.clearTimeout(id)
    },
    sendIngest: (_conversation, messages) => {
      ingested.push(messages)
      return Promise.resolve()
    },
    sendConversationChanged: next => {
      changes.push(next)
      return Promise.resolve()
    },
    reportDegraded: reason => {
      degraded.push(reason)
    },
  }
}

function createFakeAdapter(list: Element, read: () => CapturedMessage[]): PlatformAdapter {
  return {
    platform: 'messenger',
    selectorPackVersion: 'test',
    getActiveConversation: () => conversation,
    getMessageListRoot: () => list,
    readVisibleMessages: read,
    loadOlder: () => true,
  }
}

describe('startCapture', () => {
  let list: HTMLElement

  beforeEach(() => {
    vi.useFakeTimers()
    list = document.createElement('div')
    document.body.append(list)
  })

  afterEach(() => {
    vi.useRealTimers()
    list.remove()
  })

  test('announces the conversation and sends the visible messages once things settle', () => {
    // Arrange
    const host = createFakeHost()

    // Act
    startCapture(
      host,
      createFakeAdapter(list, () => [message('hello')]),
    )
    vi.advanceTimersByTime(BATCH_DELAY_MS)

    // Assert
    expect(host.changes).toEqual([conversation])
    expect(host.ingested).toHaveLength(1)
    expect(host.ingested[0]?.map(captured => captured.text)).toEqual(['hello'])
  })

  test('folds a burst of DOM mutations into a single batch', async () => {
    // Arrange
    const host = createFakeHost()
    startCapture(
      host,
      createFakeAdapter(list, () => [message('hello')]),
    )
    vi.advanceTimersByTime(BATCH_DELAY_MS)

    // Act
    list.append(document.createElement('p'))
    await Promise.resolve()
    list.append(document.createElement('p'))
    await Promise.resolve()
    vi.advanceTimersByTime(BATCH_DELAY_MS)

    // Assert
    expect(host.ingested).toHaveLength(2)
  })

  test('reports the adapter as degraded after repeated empty reads', async () => {
    // Arrange
    const host = createFakeHost()
    startCapture(
      host,
      createFakeAdapter(list, () => []),
    )

    // Act
    for (let read = 0; read < DEGRADED_AFTER_EMPTY_READS; read += 1) {
      vi.advanceTimersByTime(BATCH_DELAY_MS)
      list.append(document.createElement('p'))
      await Promise.resolve()
    }
    vi.advanceTimersByTime(BATCH_DELAY_MS)

    // Assert
    expect(host.ingested).toEqual([])
    expect(host.degraded).toHaveLength(1)
  })
})
