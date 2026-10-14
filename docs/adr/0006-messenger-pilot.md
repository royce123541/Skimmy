# 0006: Messenger as the pilot platform

- **Status:** Accepted (2026-10-13)

## Context

The project owner chose Messenger for the Phase 1 walking skeleton. It's the hardest of the five platforms to read:

- atomic CSS
- localized ARIA labels
- no message IDs in the DOM, as far as we know
- timestamps only on separators or on hover
- a PIN gate on end-to-end-encrypted chats

Meta also announced that messenger.com would redirect to facebook.com/messages from April 2026. On 2026-10-13 the site still served a login page.

## Decision

- Target `facebook.com/messages` first (`www.` and `web.`), and keep `www.messenger.com` as a secondary match while it still serves.
- Build the shared weak-signal machinery in Phase 1, since Messenger needs all of it:
  - ID-less alignment
  - inferred timestamps
  - structural "me" detection
- Run AI, storage and UI work against recorded fixtures while DOM recon is underway.
- Run recon only on a test group chat whose members have consented. If the Gemini key is on the free tier, use synthetic content (ADR 0003).

## Consequences

- Phase 1 takes longer than it would with an easier platform, but every later adapter reuses its machinery.
- If recon gets stuck, Discord takes the pilot slot with no architectural change.

## Recon findings (2026-10-14, www.messenger.com, English UI)

- messenger.com still serves the full app, so it's a first-class match, not just a fallback.
- Messages live in `[role="main"] [role="log"]`, one `[role="article"]` per message. The `grid`/`row` structure assumed earlier is the chat list sidebar.
- **Messenger does expose message ids:** `data-message-id="mid.$…"` on the message element. Alignment becomes the fallback for rows without one.
- Each message element has an `aria-label` of the form `At Tuesday 9:42pm, <sender>: <text>`. Skimmy parses the sender from it (selector pack `messageLabel`). The label is localized, so other languages fall back to the `h3` sender heading. For replies that heading reads "X replied to Y", which is why the label comes first.
- Body text: `span[dir="auto"] > div[dir="auto"]`. Reply quotes sit in a labelled `role="button"` inside the message element. Date separators carry `data-scope="date_break"`.
- Avatars (inside `aria-hidden`) and read receipts (inside a labelled button) also load from `scontent`, so the photo selector is scoped to the bubble's `role="none"` container.
- Not yet verified: the user's own messages (none were in view), photo/video attachments, system events, non-English labels, and parsing the label's time into `sentAt`.
