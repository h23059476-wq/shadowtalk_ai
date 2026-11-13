# Security Model — Intelligent Workspace

Threat model and enforcement points for the three capabilities. Baseline context: Firestore rules whitelist + `ownsExisting()/ownsIncoming()`; BYOK keys in localStorage (pre-existing app-wide pattern, device-local).

## Stealth RAG

| Threat | Defense | Where enforced |
|---|---|---|
| Cross-user retrieval | Every record carries `user_id`; every read/write filters by authenticated uid | `vectorStore.ts`; proven by dedicated tests |
| Cross-project bleed | Project queries return ONLY that project's chunks; user-level queries ONLY user-level | `getChunks/listDocuments` filters; tests |
| Plaintext secrets in index | No keys are ever stored in `shadowtalk-rag`; records hold text + embeddings + metadata only | schema |
| Unrelated content injection | Coverage gate + top-K + char budget; excluded documents honored | `retrieval.ts` |
| Secret leakage to remote embeddings | Remote path refused for providers without documented embeddings APIs; uses ONLY the user's configured provider + key | `EMBEDDING_CAPABLE_PROVIDERS`, consent record |
| False local-processing claims | Indicator/labels derive from stored `localProcessing` records, not marketing | `formatRetrievedContext` |
| Data residue after deletion | Document + chunks deleted in one transaction; `deleteAllUserData` wipes per-user | `vectorStore.ts` |

Honest boundary: with remote embeddings ON, document text is sent to the user's embeddings provider; with any chat, retrieved text reaches the chat provider. IndexedDB is device-local, not encrypted at rest (same as the existing BYOK storage).

## Token optimizer

| Threat | Defense |
|---|---|
| Continuity loss (project decisions dropped for budget) | Protected-class classifier + verbatim recent tail; protected messages survive all compaction paths (test-enforced) |
| Silent history mutation | Compaction touches only the outgoing request; originals immutable in state + Firestore; summaries stored separately with source-message ids |
| Fabricated savings/usage | Estimated numbers labeled estimated; measured only from provider usage payloads; caching reported only when provider reports it |
| Unauthorized data in summaries | Compaction reads session state only; summaries persist to a user-owned collection with the same rules strength |
| Rules drift | `conversation_compactions` added to `isUserDataCollection()` with `user_id == auth.uid`; emulator test included (CI runs it) |

## MCP bridge

| Threat | Defense |
|---|---|
| Remote exploitation of localhost bridge | Loopback bind + Host check + pairing token on every request |
| Cross-origin CSRF from a malicious web page | Preflight refused without token (browser never sends the real request); no CORS grant without token; client also requires the custom `X-ShadowTalk-Bridge` header |
| Stolen pairing token | Token is device-local (localStorage), never sent anywhere except the user's own loopback bridge; disconnect + companion restart/rotation revokes |
| Shell injection | No shell anywhere: MCP servers spawn with argv arrays (`shell: false`); tool args travel as JSON-RPC payloads, never through a shell |
| Path traversal | `allowedRoots` canonicalization + containment BEFORE args reach servers; traversal chains rejected; unrooted servers pass through ungated (documented — pick trusted servers) |
| Unauthorized tool use | Discovery grants nothing; read-only = ask-once/allow-always revocable; write/execute = explicit approval EVERY use, no persistent grants possible |
| Silent autonomy | Approval dialog shows server, tool, category, exact arguments; result cards show provenance; activity + audit logs on both sides |
| Crash/timeout abuse | Hard timeouts; crash surfacing; bounded restarts |

## Secrets handling

- BYOK keys: unchanged (localStorage `shadowtalk.byok.v2.{uid}` — pre-existing pattern, not modified by this initiative).
- MCP pairing token: localStorage per user; never logged (audit logs summarize args, and the token is checked, never written).
- Private-mode chat: unchanged — message metadata (telemetry + RAG provenance) flows through the SAME encrypt-or-null gate as content; encryption failure skips the field.

## Firestore changes

Exactly one: `conversation_compactions` added to the user-data whitelist (same ownership rules as `messages`). Covered by `firestore.rules.test.ts` (runs in CI against the emulator). No new Cloud Functions, no Storage rule changes, no weakening of any existing rule.
