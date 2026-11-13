# Test Results — Intelligent Workspace

Honest accounting per the mission's requirement to distinguish automated tests, simulated tests, and real provider/device tests. "Do not confuse an implemented interface with a working capability" — the tiers below say exactly which is which.

## Verification environment

- Branch `feature/intelligent-workspace` (based on `main` @ `5a84ca69`). Node 24, vitest 4 + happy-dom, fake-indexeddb 6 for IDB, tsconfig `tsconfig.app.json` typecheck.
- Runs executed locally in the build sandbox; Firebase emulator rules tests skip locally by design (`rulesDescribe`) and run in CI's emulator job.

## Tier 1 — Automated (vitest, deterministic, run in CI)

Totals at delivery: **101 tests across the three new suites (rag / tokenOptimizer / mcpBridge) — all passing; typecheck `tsconfig.app.json` clean** (see Batch commits for per-suite counts; full-suite runs: 839 → 871 during Batches 1–2).

### Token optimizer (46 tests, Batch 1)
- Registry: known-model windows (OpenAI/Anthropic/Gemini/DeepSeek/OpenRouter vendor prefixes), unknown-model round-down, shared-gateway conservatism, output cap invariants, `STREAM_USAGE_PROVIDERS` gating.
- Estimation: ASCII 4-char rule, CJK ~1 token/char, empty/null.
- Continuity classifier: decisions, requirements, constraints, tasks, questions, references, code blocks; short critical messages protected; plain chatter not.
- Extractive summary: budget fit, relevance preference, original-order preservation, code-block integrity.
- Budget math: reservation + margin clamps; non-negative availability.
- Compaction: fits → untouched; over-budget → oldest runs compacted; recent tail kept verbatim; **protected message survives verbatim** (decision text equality asserted); traceability ids per block; request-order sequence with `[Compacted earlier conversation…]` system blocks; chronological ordering.
- Usage parsing: OpenAI shape + `cached_tokens`, DeepSeek `prompt_cache_hit_tokens`, Anthropic `message_start` (base + cache-read + cache-write) / `message_delta`, merge, absent → null.
- SSE-level capture (fetch mocked at the network boundary ONLY — real stream client): measured usage from final chunk, `include_usage` sent only for documented providers, absent usage → undefined, Anthropic usage events end-to-end, `cache_control` breakpoints present on large prefixes and absent on small ones.

### Stealth RAG (32 tests, Batch 2)
- Chunker: target sizing, single-chunk short docs, overlap carry-over property, giant-paragraph sentence split, determinism, blank input.
- Embeddings: determinism, L2 norm, related-vs-unrelated ordering (0.603 vs 0.000 measured), CJK safety; remote embedder rejects undocumented providers, sends the documented OpenAI embeddings shape, restores input order via `index`; consent gating (default local; forged provider → local).
- Pipeline over **fake-indexeddb (real `idb` semantics, real transactions)** — wait, correction for full honesty: the final vectorStore is the raw-IDB wrapper; tests exercise the REAL IndexedDB semantics via fake-indexeddb: extraction→chunk→embed→index happy path, 25 MB rejection, duplicate detection at same scope (and allowed across scopes), progress reporting, **cancellation stores nothing**, deletion removes chunks, cross-user delete refused, `deleteAllUserData` scoped wipe, DB name = `shadowtalk-rag` (export contract), unit-length chunk embeddings.
- Retrieval: related query retrieves the right passage (calibrated: coverage 0.68–1.03 measured for on-topic, unrelated queries → null), cross-user isolation (bob → null), project scoping both directions, exclusion list, tiny-query guard, honest local/remote labels in the formatted context block, `[S1]` citations.

### MCP bridge (37 tests, Batch 3)
- **Companion integration over REAL wire traffic** (node env): the bridge spawns an actual stdio JSON-RPC MCP subprocess; tests drive real localhost HTTP: token auth (401 missing/wrong), non-loopback Host 403 (raw `node:http` — fetch cannot override Host), OPTIONS preflight refused without token (401) with NO CORS grant, CORS reflection granted only to token-bearing requests, real `tools/list` from the spawned server, real `tools/call` echo, `isError` surfacing, unknown server 404, **path traversal blocked** (`/etc/passwd`, `..` chains) and in-root read allowed, crash → honest 502/200-race then recovery, audit log contents (auth-fail/invoke/invoke-deny + arg summarization), no-shell argument passthrough.
- Client contracts: pairing persistence, health/list/invoke against the same real companion, typed auth/network errors, loopback-only URL refusal.
- Permissions: category derivation (annotations + execution names), needs-approval default, read-only allow-always + revoke, **write/execute persistent grants refused + stripped from hand-edited storage**, deny-always, activity ring buffer.
- Intent: git-branch question match, commit match, ambiguous → null, schema-driven arg extraction (path captured; no invented complex args).

### Firebase rules (emulator — CI)
- `conversation_compactions` isolation test added (cross-user read/update/delete denied, forgery denied, owner ok) — runs in the CI emulator job; skips locally without the emulator.

## Tier 2 — Simulated (real code paths, stand-in endpoints)

- The "fake MCP server" in bridge tests stands in for third-party MCP servers (git/filesystem) — the bridge ↔ server stdio protocol and the client ↔ bridge HTTP+auth path are REAL; only the server persona is synthetic. This is exactly what the config abstraction is for, but it is not a run against the official `@modelcontextprotocol/server-*` packages.
- Remote embeddings are exercised at the HTTP-shape level (request body/endpoint/response mapping against a mocked fetch) — no real provider was called.

## Tier 3 — Real provider / real device (NOT executed here)

Explicitly NOT verified in this sandbox; do not treat as done:
- Live embeddings against real OpenAI/Gemini/Mistral endpoints (needs the user's key).
- Live chat through real providers with the new usage parsing (verified against synthetic SSE only).
- The Anthropic cache_control behavior against the real API (breakpoint placement is tested structurally; cache HIT reporting needs a real key).
- Browser device checks: drag-drop ingestion on Android Chrome/iOS Safari, WebGPU presence paths, PWA + new UI at mobile widths (established Puppeteer capture flow can be reused), and a real MCP server (e.g. `@modelcontextprotocol/server-filesystem`) with the companion on a real machine.

## Full-suite gate at delivery

- `npx tsc --noEmit -p tsconfig.app.json` — clean.
- `npx vitest run src/lib/rag src/lib/tokenOptimizer src/lib/mcpBridge` — 101 passed / 0 failed.
- Full `npx vitest run` was green through Batches 1–2 (839 → 871) and the Batch 3/4 suites are green; a final consolidated full-suite + production build run is the last validation step before merging (the branch is NOT merged to `main`, per the mission).
