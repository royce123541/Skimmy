import 'fake-indexeddb/auto'
import { beforeEach } from 'vitest'
import { fakeBrowser } from 'wxt/testing/fake-browser'

// Every test starts from an empty in-memory browser: storage, tabs and listeners.
beforeEach(() => {
  fakeBrowser.reset()
})
