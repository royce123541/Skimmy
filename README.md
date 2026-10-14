# Skimmy

Skimmy skims your group chats into summaries, action items and calendar events, collected in one side panel. It reads Messenger, WhatsApp Web, Telegram Web, Slack and Discord, and runs as a Chrome and Edge extension (Manifest V3).

> **Status:** Phase 1 (the Messenger + Gemini skeleton) is code-complete. Messenger's selectors (pack 1.0.0) come from recon on the real messenger.com page; a few cases are still unverified (see [ADR 0006](docs/adr/0006-messenger-pilot.md)). See [`docs/architecture.md`](docs/architecture.md) for the full plan and roadmap.

## Try it (Phase 1)

1. Build and load Skimmy (see below), then open **Settings** (right-click the toolbar icon → Options).
2. Under **AI provider**, paste a key for Gemini, Claude or ChatGPT (an OpenAI API key; ChatGPT and Claude subscriptions don't include API access) and pick which one skims. Skimmy checks each key without spending tokens and keeps it in this browser only. On Gemini's free tier, Google may use chat content to improve its products, so test with made-up messages or use a paid key.
3. Under **Platforms**, turn on Messenger and approve Chrome's prompt.
4. Open a chat on messenger.com or facebook.com/messages, scroll a little, and click the Skimmy toolbar icon. The side panel shows how many messages were captured. **Skim** summarizes everything new since the last skim.

## Requirements

- Node.js 22.12 or newer (CI uses Node 24 LTS; see `.nvmrc`)
- Chrome or Edge 138 or newer

## Getting started

```sh
npm install
npm run build        # Chrome → .output/chrome-mv3
npm run build:edge   # Edge   → .output/edge-mv3
```

### Load Skimmy in Chrome

1. Open `chrome://extensions` and turn on **Developer mode** (top right).
2. Click **Load unpacked** and select `.output/chrome-mv3`.
3. Pin Skimmy, then click its toolbar icon. The side panel opens.

### Load Skimmy in Edge

1. Open `edge://extensions` and turn on **Developer mode** (left sidebar).
2. Click **Load unpacked** and select `.output/edge-mv3`.
3. Click the Skimmy toolbar icon. The side panel opens.

### Develop with hot reload

`npm run dev` builds to `.output/chrome-mv3-dev` and rebuilds whenever you save. WXT also tries to launch a browser with Skimmy installed, but branded Chrome and Edge ignore the flag it uses. If the browser opens without Skimmy, load `.output/chrome-mv3-dev` once using the steps above; after that it reloads itself.

To stop the automatic browser launch, create `web-ext.config.ts` (it's git-ignored):

```ts
import { defineWebExtConfig } from 'wxt'

export default defineWebExtConfig({ disabled: true })
```

## Scripts

| Script                         | What it does                                       |
| ------------------------------ | -------------------------------------------------- |
| `npm run dev` / `dev:edge`     | Development build with hot reload                  |
| `npm run build` / `build:edge` | Production build                                   |
| `npm run zip` / `zip:edge`     | Store-ready zip in `.output/`                      |
| `npm run check`                | Typecheck, lint, format check and unit tests       |
| `npm run e2e`                  | Build in `e2e` mode, then run the Playwright tests |
| `npm run format`               | Format the codebase with Prettier                  |

Before your first E2E run, install Playwright's Chromium with `npx playwright install chromium`.

E2E tests use a `--mode e2e` build (in `.output/chrome-mv3-e2e`) that grants Messenger access at install time, because automation can't click Chrome's permission prompt. Store builds keep every platform optional, and CI checks this with `scripts/assert-store-manifest.js`. To debug the side panel in a normal tab, open `sidepanel.html?tabId=<id>` so it follows that tab instead of itself.

## Project layout

```
src/
  entrypoints/   WXT entrypoints (thin wiring): background, side panel, content scripts later
  components/    React components (PascalCase, named exports)
  lib/           Domain modules: messaging, and later adapters, ai, db, jobs, calendar
  types/         Shared *.types.ts
tests/
  unit/          Vitest (happy-dom, in-memory browser APIs, fake IndexedDB)
  e2e/           Playwright with the built extension loaded in Chromium
docs/
  architecture.md   The approved architecture and roadmap
  adr/              Architecture decision records
```

## Documentation

- [Architecture and roadmap](docs/architecture.md)
- [Architecture decision records](docs/adr/README.md), including the ["won't do" list](docs/adr/0002-read-only-user-driven-capture.md)

## Known issues

- `npm audit` reports high-severity `node-forge` advisories. They come from `web-ext`, WXT's development-only browser launcher. No patched version exists, and none of that code ships in the extension. See [ADR 0001](docs/adr/0001-stack-and-standards.md).
