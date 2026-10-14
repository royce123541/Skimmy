import { defineConfig } from '@playwright/test'

const isCi = Boolean(process.env.CI)

export default defineConfig({
  testDir: 'tests/e2e',
  // Each test launches its own Chromium profile with the extension loaded; keep them serial.
  workers: 1,
  forbidOnly: isCi,
  retries: isCi ? 1 : 0,
  reporter: isCi ? 'github' : 'list',
  use: { trace: 'retain-on-failure' },
})
