import type { JSX, ReactNode } from 'react'

export interface NoticeProps {
  readonly title: string
  readonly children?: ReactNode
  readonly tone?: 'neutral' | 'error'
}

const TONE_CLASSES: Record<NonNullable<NoticeProps['tone']>, string> = {
  neutral: 'border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900',
  error:
    'border-red-200 bg-red-50 text-red-900 dark:border-red-900 dark:bg-red-950 dark:text-red-100',
}

/**
 * A small bordered message block for empty, setup and error states.
 *
 * @param props - Title, optional body and tone.
 * @returns The notice.
 */
export function Notice({ title, children = null, tone = 'neutral' }: NoticeProps): JSX.Element {
  return (
    <div
      role={tone === 'error' ? 'alert' : 'status'}
      className={`rounded-lg border p-3 text-sm ${TONE_CLASSES[tone]}`}
    >
      <p className="font-medium">{title}</p>
      {children !== null && <div className="mt-1 opacity-80">{children}</div>}
    </div>
  )
}
