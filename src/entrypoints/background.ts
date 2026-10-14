import { browser, defineBackground } from '#imports'
import { syncContentScripts } from '@/lib/background/contentScripts'
import { registerMessageHandlers } from '@/lib/background/handlers'
import { forgetTab } from '@/lib/background/tabRegistry'

function logFailure(task: string): (error: unknown) => void {
  return error => {
    console.error(`Skimmy: ${task} failed`, error)
  }
}

export default defineBackground(() => {
  // Skimmy has no popup; the toolbar icon opens the side panel, the primary UI.
  browser.sidePanel
    .setPanelBehavior({ openPanelOnActionClick: true })
    .catch(logFailure('opening the side panel from the toolbar'))

  registerMessageHandlers()

  // After install or update, open tabs hold orphaned (or no) content scripts: re-inject.
  browser.runtime.onInstalled.addListener(() => {
    syncContentScripts({ injectIntoOpenTabs: true }).catch(logFailure('content script sync'))
  })
  browser.permissions.onAdded.addListener(() => {
    syncContentScripts({ injectIntoOpenTabs: true }).catch(logFailure('content script sync'))
  })
  browser.permissions.onRemoved.addListener(() => {
    syncContentScripts({ injectIntoOpenTabs: false }).catch(logFailure('content script sync'))
  })
  browser.tabs.onRemoved.addListener(tabId => {
    forgetTab(tabId).catch(logFailure('tab cleanup'))
  })
})
