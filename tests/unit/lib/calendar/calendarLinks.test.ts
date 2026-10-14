import { describe, expect, test } from 'vitest'
import {
  googleCalendarUrl,
  icsFile,
  outlookCalendarUrl,
  type CalendarEvent,
} from '@/lib/calendar/calendarLinks'

const call: CalendarEvent = {
  title: 'Planning call',
  start: '2026-10-15T20:00:00+08:00',
  end: null,
  allDay: false,
  location: 'Zoom',
}

const trip: CalendarEvent = {
  title: 'Beach trip; bring snacks, sunscreen',
  start: '2026-10-17',
  end: '2026-10-18',
  allDay: true,
  location: null,
}

function params(url: string | null): URLSearchParams {
  if (url === null) {
    throw new Error('expected a URL')
  }
  return new URL(url).searchParams
}

describe('googleCalendarUrl', () => {
  test('fills a one-hour UTC span when the end is not given', () => {
    // Act
    const query = params(googleCalendarUrl(call, 'From the chat'))

    // Assert
    expect(query.get('text')).toBe('Planning call')
    expect(query.get('dates')).toBe('20261015T120000Z/20261015T130000Z')
    expect(query.get('location')).toBe('Zoom')
  })

  test('uses date-only values with an exclusive end for all-day events', () => {
    // Act
    const query = params(googleCalendarUrl(trip, ''))

    // Assert
    expect(query.get('dates')).toBe('20261017/20261019')
    expect(query.has('location')).toBe(false)
  })

  test('returns null when the start date cannot be read', () => {
    // Act
    const url = googleCalendarUrl({ ...call, start: 'next Thursday' }, '')

    // Assert
    expect(url).toBeNull()
  })
})

describe('outlookCalendarUrl', () => {
  test('passes ISO start and end times and the all-day flag', () => {
    // Act
    const query = params(outlookCalendarUrl(call, 'From the chat'))

    // Assert
    expect(query.get('subject')).toBe('Planning call')
    expect(query.get('startdt')).toBe('2026-10-15T12:00:00.000Z')
    expect(query.get('enddt')).toBe('2026-10-15T13:00:00.000Z')
    expect(query.get('allday')).toBe('false')
  })
})

describe('icsFile', () => {
  test('writes an RFC 5545 event with escaped text and CRLF line endings', () => {
    // Act
    const ics = icsFile(trip, 'Line one\nLine two', 'skim-1-0', new Date('2026-10-14T00:00:00Z'))

    // Assert
    expect(ics).toContain('DTSTART;VALUE=DATE:20261017\r\n')
    expect(ics).toContain('DTEND;VALUE=DATE:20261019\r\n')
    expect(ics).toContain('SUMMARY:Beach trip\\; bring snacks\\, sunscreen\r\n')
    expect(ics).toContain('DESCRIPTION:Line one\\nLine two\r\n')
    expect(ics).toContain('UID:skim-1-0@skimmy\r\n')
    expect(ics?.endsWith('END:VCALENDAR\r\n')).toBe(true)
  })
})
