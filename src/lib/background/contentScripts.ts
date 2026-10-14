import { browser, type ScriptPublicPath } from '#imports'
import { MESSENGER_MATCHES } from '@/lib/adapters/messenger/matches'

interface PlatformScript {
  readonly id: string
  readonly matches: readonly string[]
  readonly file: ScriptPublicPath
}

/** Content scripts registered only after the user grants the platform (ADR 0002, plan §1.7). */
const PLATFORM_SCRIPTS: readonly PlatformScript[] = [
  { id: 'messenger', matches: MESSENGER_MATCHES, file: '/content-scripts/messenger.js' },
]

async function injectIntoOpenTabs(script: PlatformScript): Promise<void> {
  const tabs = await browser.tabs.query({ url: [...script.matches] })
  await Promise.all(
    tabs.map(async tab => {
      if (tab.id === undefined) {
        return
      }
      try {
        await browser.scripting.executeScript({ target: { tabId: tab.id }, files: [script.file] })
      } catch (error) {
        // Tabs that are still loading or crashed just pick the script up on next navigation.
        console.warn(`Skimmy: could not inject ${script.id} into tab ${tab.id}`, error)
      }
    }),
  )
}

async function syncScript(script: PlatformScript, injectIntoOpen: boolean): Promise<void> {
  const granted = await browser.permissions.contains({ origins: [...script.matches] })
  const registered = await browser.scripting.getRegisteredContentScripts({ ids: [script.id] })
  if (granted && registered.length === 0) {
    await browser.scripting.registerContentScripts([
      {
        id: script.id,
        matches: [...script.matches],
        js: [script.file],
        runAt: 'document_idle',
        persistAcrossSessions: true,
      },
    ])
  }
  if (!granted && registered.length > 0) {
    await browser.scripting.unregisterContentScripts({ ids: [script.id] })
  }
  if (granted && (injectIntoOpen || registered.length === 0)) {
    await injectIntoOpenTabs(script)
  }
}

/**
 * Registers content scripts for every platform the user granted and removes the rest.
 *
 * @param options - `injectIntoOpenTabs` re-injects into already-open tabs, needed after an
 * extension update because the old scripts are orphaned.
 */
export async function syncContentScripts(options: { injectIntoOpenTabs: boolean }): Promise<void> {
  await Promise.all(PLATFORM_SCRIPTS.map(script => syncScript(script, options.injectIntoOpenTabs)))
}
