import { describe, expect, test } from 'vitest'
import {
  CATCH_UP_IDLE_STEPS,
  CATCH_UP_MAX_MS,
  CATCH_UP_STEP_MS,
  catchUp,
  type CatchUpHost,
} from '@/lib/adapters/core/catchUp'
import type { PlatformAdapter } from '@/types/adapter.types'
import type { CapturedMessage } from '@/types/platform.types'
import { message } from '../../helpers/messages'

const PAGE_SIZE = 20

function withId(id: string): CapturedMessage {
  return message(`text ${id}`, 'Mia', { platformMessageId: id })
}

// A chat with `total` messages that shows one page at a time, like a virtualized list.
function pagedChat(total: number): PlatformAdapter & { readonly scrolls: () => number } {
  let oldestShown = Math.max(0, total - PAGE_SIZE)
  let scrolls = 0
  return {
    platform: 'messenger',
    selectorPackVersion: 'test',
    getActiveConversation: () => null,
    getMessageListRoot: () => null,
    readVisibleMessages: () =>
      Array.from({ length: Math.min(PAGE_SIZE, total - oldestShown) }, (_, index) =>
        withId(`m${oldestShown + index}`),
      ),
    loadOlder: () => {
      scrolls += 1
      oldestShown = Math.max(0, oldestShown - PAGE_SIZE)
      return true
    },
    scrolls: () => scrolls,
  }
}

function fakeHost(): CatchUpHost & { readonly flushes: () => number } {
  let clock = 0
  let flushes = 0
  return {
    wait: ms => {
      clock += ms
      return Promise.resolve()
    },
    now: () => clock,
    flush: () => {
      flushes += 1
    },
    flushes: () => flushes,
  }
}

describe('catchUp', () => {
  test('scrolls until the target is reached, flushing every step', async () => {
    // Arrange
    const chat = pagedChat(500)
    const host = fakeHost()

    // Act
    const outcome = await catchUp(chat, host, 100, new AbortController().signal)

    // Assert
    expect(outcome).toEqual({ collected: 100, reason: 'reached' })
    expect(chat.scrolls()).toBe(4)
    expect(host.flushes()).toBe(5)
  })

  test('stops at the start of the chat when nothing new loads', async () => {
    // Arrange
    const chat = pagedChat(45)

    // Act
    const outcome = await catchUp(chat, fakeHost(), 300, new AbortController().signal)

    // Assert
    expect(outcome).toEqual({ collected: 45, reason: 'exhausted' })
    expect(chat.scrolls()).toBe(2 + CATCH_UP_IDLE_STEPS)
  })

  test('stops right away when the user cancels', async () => {
    // Arrange
    const controller = new AbortController()
    controller.abort()

    // Act
    const outcome = await catchUp(pagedChat(500), fakeHost(), 300, controller.signal)

    // Assert
    expect(outcome).toEqual({ collected: 20, reason: 'cancelled' })
  })

  test('gives up after the time limit', async () => {
    // Arrange: every step loads something new, but very slowly.
    const chat = pagedChat(100_000)
    const host = fakeHost()
    const slowHost: CatchUpHost = {
      ...host,
      wait: () => host.wait(CATCH_UP_MAX_MS / 2),
    }

    // Act
    const outcome = await catchUp(chat, slowHost, 300, new AbortController().signal)

    // Assert
    expect(outcome.reason).toBe('timeout')
    expect(CATCH_UP_STEP_MS).toBeLessThan(CATCH_UP_MAX_MS)
  })

  test('reports exhausted when there is no list to scroll', async () => {
    // Arrange
    const chat = { ...pagedChat(500), loadOlder: () => false }

    // Act
    const outcome = await catchUp(chat, fakeHost(), 300, new AbortController().signal)

    // Assert
    expect(outcome).toEqual({ collected: 20, reason: 'exhausted' })
  })
})
