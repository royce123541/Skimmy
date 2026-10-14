# 0002: Read-only, user-driven capture

- **Status:** Accepted (2026-10-13)

## Context

Skimmy reads other people's messages on platforms whose terms restrict automation:

- Meta's terms (Messenger, WhatsApp) restrict automated access and collection.
- Discord bans self-bots and client modifications.
- Slack workspaces can have admin policies.
- The Chrome Web Store's user-data policy treats chat messages as personal communications. Collecting them requires a narrow purpose, disclosure and Limited Use.

Opening a chat also sends read receipts. And chat apps render only the conversation that's open, as a virtualized list.

## Decision

Skimmy reads only what the user's own tab already shows. Anything beyond that happens only when the user asks for it.

**Won't do (v1):**

1. Never send, edit, react to, delete or forward messages.
2. Never open chats, switch conversations or crawl in the background. The only time Skimmy navigates a platform tab is right after a user clicks.
3. Never call platform APIs, official or private. Never reuse session tokens or cookies, and never intercept network or WebSocket traffic.
4. Never run code in the page's main world or change how the platform behaves.
5. Never store chat content on a server. Never send it anywhere except the LLM provider the user chose for that chat (ADR 0003).
6. Never act on AI output automatically. Calendar adds, links and replies each need a click.
7. Never run remotely fetched code. Selector packs and the model catalog are data, validated with Zod.
8. Never collect telemetry that includes message content.
9. Backfill (scroll-to-load) runs only when the user starts it. It's rate-limited, capped and cancellable.

## Consequences

- Skimmy can't summarize a chat the user has never opened. For those chats, _Catch me up_ opens the chat on a click, backfills to the unread divider, then skims.
- Rate limits and caps make large catch-ups slower, by design.
- Platform terms and the store's user-data policy get a legal review before the public launch (Phase 8).
