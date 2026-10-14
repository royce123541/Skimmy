import { describe, expect, test } from 'vitest'
import { parseLabelTime } from '@/lib/adapters/core/labelTime'

// Wednesday, October 14, 2026, 10:00 in the reader's local time.
const NOW = new Date(2026, 9, 14, 10, 0)

function local(month: number, day: number, hours: number, minutes: number, year = 2026): number {
  return new Date(year, month, day, hours, minutes).getTime()
}

describe('parseLabelTime', () => {
  test.each([
    ['9:42am', local(9, 14, 9, 42)],
    ['Tuesday 9:42pm', local(9, 13, 21, 42)],
    ['Wednesday 8:05 AM', local(9, 14, 8, 5)],
    ['Yesterday 11:15pm', local(9, 13, 23, 15)],
    ['October 3 7:15pm', local(9, 3, 19, 15)],
    ['Oct 3, 2025 7:15pm', local(9, 3, 19, 15, 2025)],
    ['12:30am', local(9, 14, 0, 30)],
    ['09:15', local(9, 14, 9, 15)],
  ])('reads "%s"', (text, expected) => {
    // Act
    const parsed = parseLabelTime(text, NOW)

    // Assert
    expect(parsed).toBe(expected)
  })

  test('treats a weekday label later than now as last week', () => {
    // Act
    const parsed = parseLabelTime('Wednesday 11:30pm', NOW)

    // Assert
    expect(parsed).toBe(local(9, 7, 23, 30))
  })

  test('treats a month-day label in the future as last year', () => {
    // Act
    const parsed = parseLabelTime('December 24 6:00pm', NOW)

    // Assert
    expect(parsed).toBe(local(11, 24, 18, 0, 2025))
  })

  test.each(['', 'Sent', 'Tuesday', 'Martes 9:42pm'])('returns null for "%s"', text => {
    // Act
    const parsed = parseLabelTime(text, NOW)

    // Assert
    expect(parsed).toBeNull()
  })
})
