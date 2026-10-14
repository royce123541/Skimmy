import type { JSX } from 'react'
import { GeminiKeySection } from '@/components/options/GeminiKeySection'
import { PlatformsSection } from '@/components/options/PlatformsSection'

/**
 * Skimmy settings: AI provider key and per-platform access.
 *
 * @returns The options page.
 */
export function OptionsApp(): JSX.Element {
  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col gap-8 bg-white px-6 py-8 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Skimmy settings</h1>
      </header>
      <GeminiKeySection />
      <PlatformsSection />
    </main>
  )
}
