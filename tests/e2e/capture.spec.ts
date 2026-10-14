import path from 'node:path'
import type { Browser } from 'wxt/browser'
import { expect, test } from './fixtures'

/** The extension service worker's global scope, where Chrome exposes `chrome`. */
type ExtensionWorkerGlobal = typeof globalThis & { chrome: typeof Browser }

const FIXTURE = path.resolve('tests/fixtures/messenger/conversation.html')
const CHAT_URL = 'https://www.facebook.com/messages/t/1234'

test('captures a Messenger chat once and shows it live in the side panel', async ({
  context,
  extensionId,
  serviceWorker,
}) => {
  // Arrange: serve the synthetic fixture at a real Messenger URL, offline.
  await context.route(/fbcdn\.net/, route => route.abort())
  await context.route('https://www.facebook.com/**', route =>
    route.fulfill({ path: FIXTURE, contentType: 'text/html' }),
  )
  await expect
    .poll(() =>
      serviceWorker.evaluate(async () => {
        const scripts = await (
          globalThis as ExtensionWorkerGlobal
        ).chrome.scripting.getRegisteredContentScripts()
        return scripts.map(script => script.id)
      }),
    )
    .toContain('messenger')
  const chat = await context.newPage()
  await chat.goto(CHAT_URL)
  const tabId = await serviceWorker.evaluate(async url => {
    const [tab] = await (globalThis as ExtensionWorkerGlobal).chrome.tabs.query({ url })
    return tab?.id ?? null
  }, CHAT_URL)
  const panel = await context.newPage()
  await panel.goto(`chrome-extension://${extensionId}/sidepanel.html?tabId=${String(tabId)}`)

  // Assert: five messages captured (the empty row is skipped) and the chat title shown.
  await expect(panel.getByRole('heading', { name: 'Weekend Trip Crew' })).toBeVisible()
  await expect(panel.getByText('5 captured')).toBeVisible()

  // Act: the app re-renders every row, then a new message arrives.
  await chat.evaluate(() => {
    const rows = document.querySelector('[role="log"] > div')
    if (rows === null) {
      throw new Error('fixture has no message list')
    }
    rows.innerHTML = `${rows.innerHTML}<div role="article"><div aria-label="At Saturday 6:12pm, Jo Reyes: Van is booked for Friday" data-message-id="mid.$fixture0007"><span dir="auto"><div dir="auto">Van is booked for Friday</div></span></div></div>`
  })

  // Assert: re-rendered rows aren't stored twice; the new one appears without a reload.
  await expect(panel.getByText('6 captured')).toBeVisible()
})
