# 0005: Platform adapters and selector packs

- **Status:** Accepted (2026-10-13)

## Context

Five platforms (six web clients, since Telegram has two) ship UI changes weekly. Many use hashed or atomic CSS, and some don't expose message IDs. Breakage is certain, so it needs to be cheap to detect and fix.

## Decision

- **Adapters are pure DOM readers.** Each one implements `PlatformAdapter` and outputs canonical `CapturedMessage`s as plain text.
- **A shared `CaptureEngine` does the rest.** It observes the DOM, batches, de-duplicates, follows SPA routes and reports health.
- **Identity:**
  - Use the platform's message ID when one exists. Otherwise assign a ULID when the message is first stored.
  - Platforms without IDs are aligned against the stored sequence, using the longest overlap of sender-plus-text fingerprints.
- **Selector packs are versioned JSON with ordered fallbacks:** data attributes, then ARIA, then structure, then classes. Phase 6 can override them remotely, validated and version-gated.
- **"Me" detection uses structure**, such as bubble side and outgoing-message markers, never translated strings.
- **Every adapter passes the shared conformance suite**, run against sanitized fixtures that contain only synthetic text.

## Consequences

- When a site breaks capture, the fix is usually a data change, not a code change.
- Each new platform costs one investigation of its DOM, one selector pack, fixtures, and an adapter that passes the conformance suite.
