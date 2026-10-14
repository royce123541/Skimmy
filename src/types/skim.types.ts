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

/** A validated skim whose citations point at stored message keys. */
export interface GroundedSkim {
  readonly tldr: string
  readonly highlights: readonly SkimHighlight[]
  readonly actionItems: readonly SkimActionItem[]
  readonly questionsForMe: readonly SkimQuestion[]
}
