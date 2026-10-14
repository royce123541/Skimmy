const WEEKDAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
const MONTHS = [
  'january',
  'february',
  'march',
  'april',
  'may',
  'june',
  'july',
  'august',
  'september',
  'october',
  'november',
  'december',
]
const HOURS_PER_HALF_DAY = 12
const DAYS_PER_WEEK = 7
const MONTH_PREFIX_LENGTH = 3

// "9:42pm", "9:42 PM" or "21:42" at the end of the label time.
const CLOCK = /(\d{1,2}):(\d{2})\s*([ap]\.?m\.?)?$/i
// "October 3", "Oct 3, 2025" at the start.
const MONTH_DAY = /^([a-z]+)\.? (\d{1,2})(?:, (\d{4}))?/i

interface ClockTime {
  readonly hours: number
  readonly minutes: number
}

function parseClock(text: string): ClockTime | null {
  const match = CLOCK.exec(text.trim())
  if (match === null) {
    return null
  }
  const [, rawHours = '', rawMinutes = '', meridiem] = match
  const hours = Number(rawHours) % HOURS_PER_HALF_DAY
  const isPm = meridiem?.toLowerCase().startsWith('p') === true
  const hours24 =
    meridiem === undefined ? Number(rawHours) : hours + (isPm ? HOURS_PER_HALF_DAY : 0)
  return { hours: hours24, minutes: Number(rawMinutes) }
}

// Full names ("October") or three-letter abbreviations ("Oct") only, so words like "Martes"
// aren't mistaken for months.
function monthIndex(name: string): number {
  const lower = name.toLowerCase()
  return MONTHS.findIndex(month => month === lower || month.slice(0, MONTH_PREFIX_LENGTH) === lower)
}

// The calendar day the label refers to, at local midnight, or null if unrecognized.
function resolveDay(text: string, now: Date): Date | null {
  const lower = text.toLowerCase()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const firstWord = lower.split(/[\s,]+/)[0] ?? ''
  const weekday = WEEKDAYS.indexOf(firstWord)
  if (weekday !== -1) {
    const daysAgo = (today.getDay() - weekday + DAYS_PER_WEEK) % DAYS_PER_WEEK
    return new Date(today.getFullYear(), today.getMonth(), today.getDate() - daysAgo)
  }
  if (firstWord === 'yesterday') {
    return new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1)
  }
  const monthDay = MONTH_DAY.exec(text.trim())
  const month = monthDay === null ? -1 : monthIndex(monthDay[1] ?? '')
  if (monthDay !== null && month !== -1) {
    const year = monthDay[3] === undefined ? today.getFullYear() : Number(monthDay[3])
    return new Date(year, month, Number(monthDay[2]))
  }
  return CLOCK.test(lower.trim()) && /^(today\s+)?\d/.test(lower) ? today : null
}

/**
 * Turns the time in an English Messenger message label ("Tuesday 9:42pm", "9:42pm",
 * "Yesterday 8:01am", "October 3, 2025 7:15pm") into epoch milliseconds, in the reader's
 * local time zone.
 *
 * @param text - The label's time part.
 * @param now - The reader's current time; weekday labels mean the most recent such day.
 * @returns Epoch ms, or null when the text isn't a recognized time.
 */
export function parseLabelTime(text: string, now: Date): number | null {
  const clock = parseClock(text)
  const day = resolveDay(text, now)
  if (clock === null || day === null) {
    return null
  }
  const at = new Date(day.getFullYear(), day.getMonth(), day.getDate(), clock.hours, clock.minutes)
  if (at.getTime() <= now.getTime()) {
    return at.getTime()
  }
  // A label can't be in the future: a weekday means last week, a month-day means last year.
  if (WEEKDAYS.includes(text.trim().split(/\s+/)[0]?.toLowerCase() ?? '')) {
    return new Date(
      at.getFullYear(),
      at.getMonth(),
      at.getDate() - DAYS_PER_WEEK,
      clock.hours,
      clock.minutes,
    ).getTime()
  }
  if (MONTH_DAY.test(text.trim()) && !/\d{4}/.test(text)) {
    return new Date(
      at.getFullYear() - 1,
      at.getMonth(),
      at.getDate(),
      clock.hours,
      clock.minutes,
    ).getTime()
  }
  return at.getTime()
}
