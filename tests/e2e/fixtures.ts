import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { type BrowserContext, type Worker, chromium, test as base } from '@playwright/test'

const PROJECT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..')
const EXTENSION_PATH = path.join(PROJECT_ROOT, '.output', 'chrome-mv3-e2e')

interface ExtensionFixtures {
  context: BrowserContext
  serviceWorker: Worker
  extensionId: string
}

/**
 * Playwright test with the built extension loaded into a fresh Chromium profile.
 * Branded Chrome and Edge no longer honor the side-loading flags, so this relies on
 * the Chromium build that ships with Playwright (which also supports headless).
 */
export const test = base.extend<ExtensionFixtures>({
  // eslint-disable-next-line no-empty-pattern -- Playwright requires a destructuring pattern here.
  context: async ({}, use) => {
    const context = await chromium.launchPersistentContext('', {
      channel: 'chromium',
      args: [`--disable-extensions-except=${EXTENSION_PATH}`, `--load-extension=${EXTENSION_PATH}`],
    })
    await use(context)
    await context.close()
  },
  serviceWorker: async ({ context }, use) => {
    const serviceWorker =
      context.serviceWorkers()[0] ?? (await context.waitForEvent('serviceworker'))
    await use(serviceWorker)
  },
  extensionId: async ({ serviceWorker }, use) => {
    await use(new URL(serviceWorker.url()).host)
  },
})

export const { expect } = test
