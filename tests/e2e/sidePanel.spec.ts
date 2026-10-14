import type { Browser } from 'wxt/browser'
import { expect, test } from './fixtures'

/** The extension service worker's global scope, where Chrome exposes `chrome`. */
type ExtensionWorkerGlobal = typeof globalThis & { chrome: typeof Browser }

test('side panel page shows the Skimmy shell and empty state', async ({ page, extensionId }) => {
  // Arrange
  const sidePanelUrl = `chrome-extension://${extensionId}/sidepanel.html`

  // Act
  await page.goto(sidePanelUrl)

  // Assert
  await expect(page.getByRole('heading', { level: 1, name: 'Skimmy' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Nothing to skim yet' })).toBeVisible()
})

test('manifest declares the side panel and a toolbar action', async ({ page, extensionId }) => {
  // Arrange
  const manifestUrl = `chrome-extension://${extensionId}/manifest.json`

  // Act
  const response = await page.goto(manifestUrl)
  const manifest: unknown = await response?.json()

  // Assert
  expect(manifest).toMatchObject({
    manifest_version: 3,
    side_panel: { default_path: 'sidepanel.html' },
    action: { default_title: 'Open Skimmy' },
    permissions: expect.arrayContaining(['sidePanel']),
  })
})

test('toolbar icon is wired to open the side panel', async ({ serviceWorker }) => {
  // Arrange
  const readPanelBehavior = (): Promise<Browser.sidePanel.PanelBehavior> =>
    serviceWorker.evaluate(() =>
      (globalThis as ExtensionWorkerGlobal).chrome.sidePanel.getPanelBehavior(),
    )

  // Act + Assert: the background sets this asynchronously at startup, so poll for it.
  await expect.poll(readPanelBehavior).toMatchObject({ openPanelOnActionClick: true })
})
