import { describe, expect, test } from 'vitest'
import { alignWindow, fingerprintOf, type OrderedFingerprint } from '@/lib/ingest/alignment'
import { message } from '../../helpers/messages'

function storedFrom(texts: readonly string[]): OrderedFingerprint[] {
  return texts.map((text, index) => ({
    fingerprint: fingerprintOf(message(text)),
    order: (index + 1) * 1024,
  }))
}

function placedTexts(result: ReturnType<typeof alignWindow>): string[] {
  return result.placed.map(placed => placed.message.text)
}

describe('alignWindow', () => {
  test('stores every message of the first window in on-screen order', () => {
    // Arrange
    const window = [message('a'), message('b'), message('c')]

    // Act
    const result = alignWindow([], window)

    // Assert
    expect(placedTexts(result)).toEqual(['a', 'b', 'c'])
    expect(result.placed.map(placed => placed.order)).toEqual([1024, 2048, 3072])
    expect(result.startsNewSegment).toBe(false)
  })

  test('adds nothing when the same window is observed again after a re-render', () => {
    // Arrange
    const stored = storedFrom(['a', 'b', 'c'])

    // Act
    const result = alignWindow(stored, [message('a'), message('b'), message('c')])

    // Assert
    expect(result.placed).toEqual([])
  })

  test('appends only the new messages that arrived below the stored tail', () => {
    // Arrange
    const stored = storedFrom(['a', 'b', 'c'])

    // Act
    const result = alignWindow(stored, [message('b'), message('c'), message('d')])

    // Assert
    expect(placedTexts(result)).toEqual(['d'])
    expect(result.placed[0]?.order).toBeGreaterThan(3072)
  })

  test('prepends older messages revealed by scrolling up', () => {
    // Arrange
    const stored = storedFrom(['c', 'd'])

    // Act
    const result = alignWindow(stored, [message('a'), message('b'), message('c'), message('d')])

    // Assert
    expect(placedTexts(result)).toEqual(['a', 'b'])
    const [first, second] = result.placed.map(placed => placed.order)
    expect(first).toBeLessThan(second ?? 0)
    expect(second).toBeLessThan(1024)
  })

  test('keeps repeated identical messages as separate entries', () => {
    // Arrange
    const stored = storedFrom(['ok', 'see you'])

    // Act
    const result = alignWindow(stored, [message('ok'), message('see you'), message('ok')])

    // Assert
    expect(placedTexts(result)).toEqual(['ok'])
  })

  test('accepts a single shared message when the window continues the stored tail', () => {
    // Arrange
    const stored = storedFrom(['a', 'b', 'c'])

    // Act
    const result = alignWindow(stored, [message('c'), message('d')])

    // Assert
    expect(placedTexts(result)).toEqual(['d'])
  })

  test('accepts a single shared message when the window ends where storage begins', () => {
    // Arrange
    const stored = storedFrom(['c', 'd'])

    // Act
    const result = alignWindow(stored, [message('a'), message('b'), message('c')])

    // Assert
    expect(placedTexts(result)).toEqual(['a', 'b'])
    expect(result.startsNewSegment).toBe(false)
  })

  test('starts a new segment when the window shares nothing with storage', () => {
    // Arrange
    const stored = storedFrom(['a', 'b'])

    // Act
    const result = alignWindow(stored, [message('x'), message('y')])

    // Assert
    expect(placedTexts(result)).toEqual(['x', 'y'])
    expect(result.startsNewSegment).toBe(true)
  })

  test('uses the platform message id as identity when one exists', () => {
    // Arrange
    const withId = message('edited text', 'Mia', { platformMessageId: '42' })

    // Act
    const fingerprint = fingerprintOf(withId)

    // Assert
    expect(fingerprint).toBe('id:42')
  })
})
