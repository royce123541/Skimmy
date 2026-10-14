/** A summary point grounded in the messages it came from. */
export interface SkimHighlight {
  readonly text: string
  readonly sourceKeys: readonly string[]
}

export interface SkimActionItem {
  readonly task: string
  readonly owner: string | null
  readonly ownerIsMe: boolean
  /** ISO 8601 with offset, resolved against the source message's date. */
  readonly due: string | null
  readonly sourceKeys: readonly string[]
}

export interface SkimQuestion {
  readonly text: string
  readonly sourceKeys: readonly string[]
}

export type EventCertainty = 'confirmed' | 'proposed'

/** Something to put in a calendar, found in the chat. */
export interface SkimEvent {
  readonly title: string
  /** ISO 8601 with offset, or YYYY-MM-DD when `allDay`. */
  readonly start: string
  readonly end: string | null
  readonly allDay: boolean
  readonly location: string | null
  readonly certainty: EventCertainty
  /** True when the date looks wrong: before its source message, or implausibly far ahead. */
  readonly needsReview: boolean
  readonly sourceKeys: readonly string[]
}

/** A validated skim whose citations point at stored message keys. */
export interface GroundedSkim {
  readonly tldr: string
  readonly highlights: readonly SkimHighlight[]
  readonly actionItems: readonly SkimActionItem[]
  readonly questionsForMe: readonly SkimQuestion[]
  /** Absent in skims made with prompt skim-v0. */
  readonly decisions?: readonly SkimHighlight[]
  /** Absent in skims made with prompt skim-v0. */
  readonly events?: readonly SkimEvent[]
}
