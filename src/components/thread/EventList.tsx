import { useCallback, type JSX } from 'react'
import {
  dateOnly,
  googleCalendarUrl,
  icsFile,
  outlookCalendarUrl,
} from '@/lib/calendar/calendarLinks'
import type { SkimEvent } from '@/types/skim.types'

export interface EventListProps {
  readonly events: readonly SkimEvent[]
  /** The chat the events came from, used in the calendar entry's description. */
  readonly chatTitle: string
  /** Stable id prefix for .ics files, so re-importing updates rather than duplicates. */
  readonly skimId: string
}

const PRIMARY_LINK =
  'rounded-md bg-indigo-600 px-2 py-1 text-xs font-medium text-white hover:bg-indigo-500'
const SECONDARY_LINK =
  'rounded-md border border-slate-300 px-2 py-1 text-xs font-medium hover:bg-slate-100 dark:border-slate-600 dark:hover:bg-slate-800'

function formatWhen(event: SkimEvent): string {
  if (event.allDay) {
    const day = new Date(`${dateOnly(event.start)}T00:00:00`)
    return Number.isNaN(day.getTime())
      ? event.start
      : day.toLocaleDateString(undefined, { dateStyle: 'full' })
  }
  const start = new Date(event.start)
  return Number.isNaN(start.getTime())
    ? event.start
    : start.toLocaleString(undefined, { dateStyle: 'full', timeStyle: 'short' })
}

function downloadIcs(contents: string, title: string): void {
  const url = URL.createObjectURL(new Blob([contents], { type: 'text/calendar' }))
  const link = document.createElement('a')
  link.href = url
  link.download = `${title.replace(/[^\p{L}\p{N} _-]/gu, '').trim() || 'event'}.ics`
  link.click()
  URL.revokeObjectURL(url)
}

interface EventRowProps {
  readonly event: SkimEvent
  readonly details: string
  readonly uid: string
}

function EventRow({ event, details, uid }: EventRowProps): JSX.Element {
  const google = googleCalendarUrl(event, details)
  const outlook = outlookCalendarUrl(event, details)
  const ics = icsFile(event, details, uid, new Date())
  // Proposed events never get the primary button: the group hasn't agreed yet (plan §2.5).
  const firstStyle =
    event.certainty === 'confirmed' && !event.needsReview ? PRIMARY_LINK : SECONDARY_LINK
  const onDownload = useCallback(() => {
    if (ics !== null) {
      downloadIcs(ics, event.title)
    }
  }, [ics, event.title])
  return (
    <li className="flex flex-col gap-1 rounded border border-slate-200 p-2 dark:border-slate-800">
      <p className="font-medium">
        {event.title}
        {event.certainty === 'proposed' && (
          <span className="ml-2 text-xs text-amber-600">Proposed</span>
        )}
        {event.needsReview && <span className="ml-2 text-xs text-red-600">Check the date</span>}
      </p>
      <p className="text-xs text-slate-500 dark:text-slate-400">
        {formatWhen(event)}
        {event.location !== null && ` · ${event.location}`}
      </p>
      <div className="flex flex-wrap gap-2 pt-1">
        {google !== null && (
          <a href={google} target="_blank" rel="noopener noreferrer" className={firstStyle}>
            Google Calendar
          </a>
        )}
        {outlook !== null && (
          <a href={outlook} target="_blank" rel="noopener noreferrer" className={SECONDARY_LINK}>
            Outlook
          </a>
        )}
        {ics !== null && (
          <button type="button" onClick={onDownload} className={SECONDARY_LINK}>
            .ics file
          </button>
        )}
      </div>
    </li>
  )
}

/**
 * Events found in a skim, each with links to add it to a calendar. Links are generated
 * locally and open only when clicked; nothing is added automatically (ADR 0002).
 *
 * @param props - The events, their chat and the skim they came from.
 * @returns The list.
 */
export function EventList({ events, chatTitle, skimId }: EventListProps): JSX.Element {
  const details = `From "${chatTitle}", found by Skimmy.`
  return (
    <ul className="space-y-2">
      {events.map((event, index) => (
        <EventRow
          key={`${event.title}-${event.start}`}
          event={event}
          details={details}
          uid={`${skimId}-${index}`}
        />
      ))}
    </ul>
  )
}
