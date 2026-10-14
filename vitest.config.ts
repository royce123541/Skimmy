import { defineConfig } from 'vitest/config'
import { WxtVitest } from 'wxt/testing/vitest-plugin'

export default defineConfig({
  // Provides the in-memory `browser` API, WXT aliases (@/, @@/) and #imports.
  plugins: [WxtVitest()],
  test: {
    include: ['tests/unit/**/*.test.{ts,tsx}'],
    environment: 'happy-dom',
    setupFiles: ['tests/setup.ts'],
  },
})
