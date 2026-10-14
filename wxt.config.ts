import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'wxt'
import { MESSENGER_MATCHES } from './src/lib/adapters/messenger/matches'

// Chrome 138 is the first release with the on-device Prompt API for extensions;
// everything else Skimmy uses (sidePanel, offscreen, 30 s alarms) is older.
const MINIMUM_CHROME_VERSION = '138'

/**
 * `wxt build --mode e2e` keeps platform hosts granted at install, because Playwright can't
 * click Chrome's permission prompt. Every other build keeps them optional.
 */
const E2E_MODE = 'e2e'
const OPT_IN_HOSTS: readonly string[] = [...MESSENGER_MATCHES]
const MANIFEST_V3 = 3

export default defineConfig({
  srcDir: 'src',
  // Explicit imports from '#imports' keep every dependency visible in the file that uses it.
  imports: false,
  modules: ['@wxt-dev/module-react'],
  manifest: {
    name: 'Skimmy',
    description:
      'Skim your group chats: summaries, action items and calendar events in one side panel.',
    minimum_chrome_version: MINIMUM_CHROME_VERSION,
    permissions: ['sidePanel', 'storage', 'unlimitedStorage', 'scripting'],
    // Platforms are opt-in: requested from Settings, never at install (plan §1.7).
    optional_host_permissions: [...OPT_IN_HOSTS],
    // No popup: clicking the toolbar icon opens the side panel (see background.ts).
    action: { default_title: 'Open Skimmy' },
  },
  hooks: {
    // WXT adds runtime-registered content scripts' matches to host_permissions, which would
    // make every platform a required permission. Keep them optional outside e2e builds.
    'build:manifestGenerated': (wxt, manifest) => {
      if (wxt.config.mode === E2E_MODE || manifest.manifest_version !== MANIFEST_V3) {
        return
      }
      const required = (manifest.host_permissions ?? []).filter(
        host => !OPT_IN_HOSTS.includes(host),
      )
      // WXT's hook API edits the generated manifest in place.
      // eslint-disable-next-line no-param-reassign
      manifest.host_permissions = required.length === 0 ? undefined : required
    },
  },
  vite: () => ({
    plugins: [tailwindcss()],
  }),
})
