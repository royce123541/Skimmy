import type { JSX, ReactNode } from 'react'
import { EventList } from '@/components/thread/EventList'
import type { StoredSkim } from '@/types/db.types'
import type { SkimActionItem } from '@/types/skim.types'

export interface SkimResultViewProps {
  readonly skim: StoredSkim
  readonly chatTitle: string
}

interface CitedText {
  readonly text: string
  readonly sourceKeys: readonly string[]
}

function SourceCount({ count }: { readonly count: number }): JSX.Element {
  return (
    <span className="ml-1 text-xs text-slate-400" title="Messages this point comes from">
      ({count} {count === 1 ? 'message' : 'messages'})
    </span>
  )
}

function Section({
  title,
  children,
}: {
  readonly title: string
  readonly children: ReactNode
}): JSX.Element {
  return (
    <section>
      <h3 className="mb-1 font-semibold">{title}</h3>
      {children}
    </section>
  )
}

function CitedList({ items }: { readonly items: readonly CitedText[] }): JSX.Element {
  return (
    <ul className="list-disc space-y-1 pl-5">
      {items.map(item => (
        <li key={item.text}>
          {item.text}
          <SourceCount count={item.sourceKeys.length} />
        </li>
      ))}
    </ul>
  )
}

function formatDue(due: string): string {
  const date = new Date(due)
  return Number.isNaN(date.getTime())
    ? due
    : date.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
}

function ActionItemList({ items }: { readonly items: readonly SkimActionItem[] }): JSX.Element {
  return (
    <ul className="space-y-1">
      {items.map(item => (
        <li key={item.task} className="rounded border border-slate-200 p-2 dark:border-slate-800">
          <p>{item.task}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {item.ownerIsMe ? 'You' : (item.owner ?? 'Unassigned')}
            {item.due !== null && ` · due ${formatDue(item.due)}`}
          </p>
        </li>
      ))}
    </ul>
  )
}

/**
 * Renders a skim. Everything is plain text from the model; React escapes it, and nothing is
 * rendered as HTML (plan §2.5).
 *
 * @param props - The skim to show and its chat's title.
 * @returns The skim's sections.
 */
export function SkimResultView({ skim, chatTitle }: SkimResultViewProps): JSX.Element {
  const { result } = skim
  const events = result.events ?? []
  const decisions = result.decisions ?? []
  return (
    <article className="flex flex-col gap-4 text-sm">
      <p className="text-base leading-snug">{result.tldr}</p>
      {result.questionsForMe.length > 0 && (
        <Section title="Waiting on you">
          <CitedList items={result.questionsForMe} />
        </Section>
      )}
      {result.actionItems.length > 0 && (
        <Section title="Action items">
          <ActionItemList items={result.actionItems} />
        </Section>
      )}
      {events.length > 0 && (
        <Section title="Events">
          <EventList events={events} chatTitle={chatTitle} skimId={skim.id} />
        </Section>
      )}
      {decisions.length > 0 && (
        <Section title="Decisions">
          <CitedList items={decisions} />
        </Section>
      )}
      {result.highlights.length > 0 && (
        <Section title="Highlights">
          <CitedList items={result.highlights} />
        </Section>
      )}
      <p className="text-xs text-slate-400">
        {skim.messageCount} messages · {skim.model} · {new Date(skim.createdAt).toLocaleString()}
      </p>
    </article>
  )
}
