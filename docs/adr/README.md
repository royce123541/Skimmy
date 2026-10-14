# Architecture decision records

Each ADR records one decision: the context, what we chose, and what follows from it.
The full design lives in [`docs/architecture.md`](../architecture.md).

| ADR                                                  | Decision                                                 | Status   |
| ---------------------------------------------------- | -------------------------------------------------------- | -------- |
| [0001](0001-stack-and-standards.md)                  | Stack, tooling and coding standards                      | Accepted |
| [0002](0002-read-only-user-driven-capture.md)        | Read-only, user-driven capture, plus the "won't do" list | Accepted |
| [0003](0003-byok-multi-provider-llm-gateway.md)      | BYOK multi-provider LLM gateway (Gemini first)           | Accepted |
| [0004](0004-local-first-storage.md)                  | Local-first storage                                      | Accepted |
| [0005](0005-platform-adapters-and-selector-packs.md) | Platform adapters and selector packs                     | Accepted |
| [0006](0006-messenger-pilot.md)                      | Messenger as the pilot platform                          | Accepted |

To add an ADR, copy the format of an existing one, take the next number, and add it to
this table. To change a decision, write a new ADR that supersedes the old one, and mark
the old one "Superseded by NNNN".
