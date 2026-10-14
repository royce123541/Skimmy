# 0001: Stack, tooling and coding standards

- **Status:** Accepted (2026-10-13)

## Context

Skimmy is a Chrome + Edge Manifest V3 extension with several entrypoints: a service worker, a side panel, options and onboarding pages, an offscreen document, and one content script per platform. We want one TypeScript codebase with fast feedback and tooling that enforces the project coding standards, so they aren't left to code review.

## Decision

**Framework and UI**

- **WXT 0.21** (Vite 8). It provides file-based entrypoints, manifest generation, HMR and runtime-registered content scripts.
  - Source lives in `src/` (`srcDir: 'src'`).
  - Auto-imports are off (`imports: false`), and WXT APIs are imported explicitly from `#imports`.
  - The manifest requires Chrome/Edge **138+**, the first version with the on-device Prompt API.
- **React 19 + TypeScript 5.9 (strict) + Tailwind 4** for UI.
  - TypeScript stays on 5.9 because `typescript-eslint` supports only TS < 6.1, and WXT's own template uses 5.9.
  - We'll upgrade once the lint tooling supports TS 6 and 7.

**Package manager and Node**

- **npm.** The plan named pnpm, but it isn't installed on the dev machine. Switching later is a lockfile change.
- **Node ≥ 22.12**, with **Node 24 LTS in CI** (see `.nvmrc`). Vitest 5 runs on the local Node 25 but doesn't list it as supported.

**Tests**

- **Unit:** Vitest 5 with happy-dom, WXT's in-memory `fakeBrowser`, and `fake-indexeddb`. Tests live in `tests/unit/` and follow Arrange-Act-Assert, with names that describe behavior.
- **E2E:** Playwright with **its bundled Chromium**.
  - Branded Chrome and Edge no longer honor the `--load-extension` flag, so they can't be automated.
  - Loading the extension in Chrome and Edge is a manual smoke check; steps are in the README.

**Lint and format**

- **ESLint 10** (flat config) with `typescript-eslint` strict type-checked rules, which enforce the coding standards:
  - no `any`
  - explicit return types on exported functions
  - functions ≤ 50 lines and nesting ≤ 3
  - no magic numbers (beyond -1, 0, 1 and 2)
  - no parameter mutation
  - JSDoc on exported functions in `src/`
  - named exports in `components/`, `hooks/`, `lib/` and `types/`
  - the React Hooks rules
- **Prettier:** no semicolons, single quotes, trailing commas, 100 columns.

**CI**

- **GitHub Actions** (`.github/workflows/ci.yml`) runs typecheck, lint, format check, unit tests, Chrome and Edge zips, and E2E smoke tests.

## Consequences

- One `npm run check` covers typecheck, lint, formatting and unit tests. `npm run e2e` builds the extension and runs the browser smoke tests.
- Edge is verified by hand until browser automation supports side-loading again.
- `npm audit` reports high-severity `node-forge` advisories inside `web-ext`, WXT's dev-only browser launcher.
  - No patched `node-forge` exists. None of this code ships in the extension.
  - A `shell-quote` override (`^1.12.0`) removes the critical advisories from the same tree.
  - Re-check after each `web-ext` release.
