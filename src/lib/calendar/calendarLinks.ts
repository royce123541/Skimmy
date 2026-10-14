import type { SkimEvent } from '@/types/skim.types'

const HOUR_MS = 3_600_000
const HOURS_PER_DAY = 24
const DAY_MS = HOURS_PER_DAY * HOUR_MS
/** Length of a YYYY-MM-DD date and of its compact YYYYMMDD form. */
const ISO_DATE_LENGTH = 10
const COMPACT_DATE_LENGTH = 8
/** Assumed length of a timed event that doesn't say when it ends. */
const DEFAULT_DURATION_MS = HOUR_MS
const GOOGLE_TEMPLATE = 'https://calendar.google.com/calendar/render'
const OUTLOOK_COMPOSE = 'https://outlook.live.com/calendar/0/deeplink/compose'

/** The parts of an event every calendar format needs. */
export type CalendarEvent = Pick<SkimEvent, 'title' | 'start' | 'end' | 'allDay' | 'location'>

/**
 * The YYYY-MM-DD part of an ISO date or date-time.
 *
 * @param value - An ISO 8601 date or date-time.
 * @returns The date part.
 */
export function dateOnly(value: string): string {
  return value.slice(0, ISO_DATE_LENGTH)
}

interface Span {
  readonly start: Date
  readonly end: Date
}

// All-day dates are YYYY-MM-DD; calendars treat the end of an all-day span as exclusive.
function spanOf(event: CalendarEvent): Span | null {
  const start = new Date(event.allDay ? `${dateOnly(event.start)}T00:00:00Z` : event.start)
  if (Number.isNaN(start.getTime())) {
    return null
  }
  const parsedEnd = event.end === null ? Number.NaN : Date.parse(event.end)
  const fallback = start.getTime() + (event.allDay ? DAY_MS : DEFAULT_DURATION_MS)
  const endMs = Number.isNaN(parsedEnd) || parsedEnd <= start.getTime() ? fallback : parsedEnd
  return { start, end: new Date(event.allDay && endMs === parsedEnd ? endMs + DAY_MS : endMs) }
}

// 20261016T200000Z for timed events, 20261016 for all-day ones.
function compact(date: Date, allDay: boolean): string {
  const iso = date
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}/, '')
  return allDay ? iso.slice(0, COMPACT_DATE_LENGTH) : iso
}

/**
 * A Google Calendar link that opens a pre-filled event for the user to save.
 *
 * @param event - The event.
 * @param details - Text for the event description.
 * @returns The URL, or null when the start date can't be read.
 */
export function googleCalendarUrl(event: CalendarEvent, details: string): string | null {
  const span = spanOf(event)
  if (span === null) {
    return null
  }
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: event.title,
    dates: `${compact(span.start, event.allDay)}/${compact(span.end, event.allDay)}`,
    details,
  })
  if (event.location !== null) {
    params.set('location', event.location)
  }
  return `${GOOGLE_TEMPLATE}?${params.toString()}`
}

/**
 * An Outlook on the web link that opens a pre-filled event.
 *
 * @param event - The event.
 * @param details - Text for the event body.
 * @returns The URL, or null when the start date can't be read.
 */
export function outlookCalendarUrl(event: CalendarEvent, details: string): string | null {
  const span = spanOf(event)
  if (span === null) {
    return null
  }
  const params = new URLSearchParams({
    path: '/calendar/action/compose',
    rru: 'addevent',
    subject: event.title,
    startdt: span.start.toISOString(),
    enddt: span.end.toISOString(),
    body: details,
    allday: String(event.allDay),
  })
  if (event.location !== null) {
    params.set('location', event.location)
  }
  return `${OUTLOOK_COMPOSE}?${params.toString()}`
}

// RFC 5545 text escaping.
function escapeIcs(text: string): string {
  return text.replace(/[\\;,]/g, match => `\\${match}`).replace(/\r?\n/g, '\\n')
}

function icsDate(name: string, date: Date, allDay: boolean): string {
  return allDay ? `${name};VALUE=DATE:${compact(date, true)}` : `${name}:${compact(date, false)}`
}

/**
 * An iCalendar (.ics) file for Apple Calendar and anything else that imports RFC 5545.
 *
 * @param event - The event.
 * @param details - Text for the description.
 * @param uid - A stable unique id, so re-importing updates instead of duplicating.
 * @param now - Creation time stamp.
 * @returns The file contents, or null when the start date can't be read.
 */
export function icsFile(
  event: CalendarEvent,
  details: string,
  uid: string,
  now: Date,
): string | null {
  const span = spanOf(event)
  if (span === null) {
    return null
  }
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Skimmy//Skimmy//EN',
    'BEGIN:VEVENT',
    `UID:${uid}@skimmy`,
    `DTSTAMP:${compact(now, false)}`,
    icsDate('DTSTART', span.start, event.allDay),
    icsDate('DTEND', span.end, event.allDay),
    `SUMMARY:${escapeIcs(event.title)}`,
    ...(event.location === null ? [] : [`LOCATION:${escapeIcs(event.location)}`]),
    `DESCRIPTION:${escapeIcs(details)}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ]
  return `${lines.join('\r\n')}\r\n`
}
