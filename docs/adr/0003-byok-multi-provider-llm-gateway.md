# 0003: BYOK multi-provider LLM gateway (Gemini first)

- **Status:** Accepted (2026-10-13)

## Context

Users bring their own API keys, and v1 has no Skimmy backend. Users may have a key for Claude, OpenAI ("ChatGPT") or Gemini, or none at all. The project owner develops with a Gemini key for `gemini-3.5-flash-lite`.

The three providers differ in four ways:

- SDKs: `@anthropic-ai/sdk` Messages, `openai` Responses, `@google/genai` Interactions
- structured-output dialects
- server-side storage defaults
- refusal and safety signals

## Decision

- **One gateway.** `LlmProvider` has four implementations: `claude`, `openai`, `gemini` and `on-device` (Chrome's Prompt API).
  - All run in the service worker and stream, apart from on-device, which may run in an offscreen document.
  - All take the same `SkimRequest` and return output validated by one Zod schema.
- **Gemini first.** It's built in Phase 1, so the owner's key works end to end. Claude and OpenAI follow in Phase 2, along with a provider conformance suite run against recorded responses.
- **One schema dialect.** `SkimResult` follows the strictest rules of the three, OpenAI's strict mode:
  - every property required
  - nullable instead of optional
  - `additionalProperties: false`
  - no exotic keywords
- **Privacy defaults:**
  - `store: false` wherever offered (OpenAI, Gemini).
  - Never switch providers automatically. Instead, offer a one-click retry with a provider the user picks.
  - `on-device only` policies fail closed.
- **Model catalog as data.** It records IDs, tiers, prices, context sizes and capabilities. The model picker shows catalog models that also appear in the key's own models-list response.
- **Proposed default models** (final once Phase 2 evals are in):
  - Claude `claude-opus-5-5`
  - OpenAI `gpt-6.1-sol`
  - Gemini `gemini-3.5-flash-lite`
- "ChatGPT" means an **OpenAI API key**. ChatGPT Plus and Pro subscriptions don't include API access.

## Consequences

- The three SDKs are bundled statically, because MV3 service workers can't use dynamic `import()`.
- Gemini's free tier lets Google use the content to improve its products. Onboarding warns about this and recommends the paid tier or on-device mode for real chats. The owner should use synthetic chats while on a free-tier key.
- Errors are normalized to `RpcErrorCode` (`src/types/rpc.types.ts`), so the UI shows one consistent message per failure type, whatever the provider.
