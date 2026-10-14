# 0004: Local-first storage

- **Status:** Accepted (2026-10-13)

## Context

- **No server-side storage.** v1 has no backend, and chat data must stay on the device.
- **Content-script storage belongs to the page.** A content script's IndexedDB and localStorage belong to the _host page's_ origin (for example facebook.com), so the site itself can read anything stored there.
- **The service worker is short-lived.** The MV3 service worker can be killed at any moment.

## Decision

| Data                                                    | Store                                                           |
| ------------------------------------------------------- | --------------------------------------------------------------- |
| Settings                                                | `chrome.storage.sync` (WXT typed items with migrations)         |
| API keys                                                | `secrets` table in extension-origin IndexedDB                   |
| Threads, messages, skims, items, events, policies, jobs | IndexedDB via Dexie, extension origin                           |
| Tab registry, in-flight progress, adapter health        | `chrome.storage.session`                                        |
| Remote selector packs, model catalog                    | `chrome.storage.local`; content scripts get packs over RPC      |
| Capture buffers                                         | Content-script memory only, flushed to the SW about every 1.5 s |

- **One writer.** The service worker is the only writer of domain data. UIs send commands over RPC and read with Dexie `liveQuery`.
- **Content scripts never persist anything.**
- **Retention.** Raw messages are kept for 14 days by default (configurable from 0 to 90). Skims and action items are kept until the user deletes them.

## Consequences

- A Phase 1 spike must confirm that `liveQuery` picks up writes made by the service worker in the side panel. If it doesn't, the service worker broadcasts `dbChanged`.
- Only settings sync across devices in v1.
