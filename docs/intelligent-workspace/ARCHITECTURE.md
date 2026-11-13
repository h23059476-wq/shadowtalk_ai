# ShadowTalk AI — Intelligent Workspace Architecture

> Initiative: Stealth RAG · Dynamic Token Optimizer · Native MCP Bridge
> Branch: `feature/intelligent-workspace` (based on `main` @ `5a84ca69`)
> Status: Phase 0 report — written **before** implementation, grounded in a full repository audit.

---

## 1. Purpose and scope

This initiative adds three capabilities that make ShadowTalk an intelligent workspace:

1. **Stealth RAG** — documents provided by the user are ingested, indexed and automatically retrieved during conversations, with no manual retrieval configuration.
2. **Dynamic Token Optimizer** — provider-aware context budgeting, non-destructive conversation compaction, provider prompt caching where documented, and honest token/cost telemetry.
3. **Native MCP Bridge** — discovery and intent-based invocation of authorized local tools through a user-run local companion process, with granular permissions and explicit approvals.

Non-goals (explicitly excluded by the mission): Multi-Model Consensus, Multi-User Key Pool, silent provider switching, fabricated savings/privacy claims, unnecessary paid infrastructure.

Product principles honored throughout: minimal configuration, intent-based automation, ambient contextual UI, user-controlled autonomy, privacy by design, transparent costs, BYOK compatibility.

---

## 2. What the repository already has (Phase 0 audit)

### 2.1 Chat architecture

- Main surface: `src/pages/ChatbotPage.tsx` (~2,720 lines). Messages live in local React state (`messages` at :232, `messagesRef` at :335); conversations/messages persist to Firestore collections `conversations` and `messages` (insert :845/:940, load :437–:475).
- Send flow `handleSendMessage` (:1631): auth gate → AI access mode (`loadAiAccessMode`, default `"byok"`) → optimistic append → visualization intent short-circuit (:1700–:1716) → **tool interception** (:1722–:1838, regex `detectToolSync` in `src/hooks/useToolOrchestrator.ts:233` → `src/lib/shadowTools/executeShadowTool.ts:31`; tool results are terminal — the LLM is *never* called after a tool) → conversation resolve/persist → history assembly (:1861–:1870) → attachment processing (:1872–:2019) → `runChatCompletion` (:1046–:1379).
- `runChatCompletion`: memory injection (`buildMemoryContextForUser` :1070–:1073, business memory `getChatDefaults().systemHintAddon` + `getMemoryContext()` :1128–:1130), directive/Shadow-Twin prompt prepends, **fixed history truncation `routerMessages.slice(-14)` at :1209** (the only context management that exists), system prompt `buildChatSystemPrompt` + `getModePrompt` (:1211–:1217, `src/lib/shadowTalkPersona.ts:119`), optional local WebLLM branch (:1238–:1302), then **one** provider call `streamCloudChat(cloudMessages, { signal, temperature: 0.7, maxTokens: 8192, onDelta })` at :1304–:1313.
- Token accounting today is char-based estimation (`Math.ceil(len / 4)`, :1355–:1356) and the cost tracker is called with a **hard-coded `"gpt-4o-mini"`** model string (:1311, :1357) even though the real provider/model is captured at :1317–:1319.

### 2.2 Providers and BYOK

- Registry: `src/lib/byok.ts` — 16 providers in `BYOK_PROVIDERS` (:87–:104): openai, groq, openrouter, gemini, anthropic, mistral, deepseek, together, fireworks, perplexity, cohere, xai, cerebras, hyperbolic, novita, deepinfra. Keys stored in `localStorage` (`shadowtalk.byok.v2.{uid}`, :106–:136) — plaintext by design, device-local.
- Requests: direct browser `fetch`. OpenAI-compatible SSE via `streamByokChat` (:291); Anthropic has a dedicated path with role alternation and `max_tokens` default 4096 (:182–:204). Dispatch by access mode in `streamCloudChat` (`src/lib/cloudChat.ts:71`): `"byok"` → direct; `"shared"` → Firebase Cloud Function `chat` (`functions/src/index.ts:302`, OpenRouter proxy with server-side `daily_usage` rate limiting).
- **Gaps relevant to this initiative:** SSE `usage` payloads are parsed nowhere (`parsed.usage` is dropped at `cloudChat.ts:182` and `byok.ts:367–:374`); there is **no per-provider/model context-window metadata** anywhere; no tokenizer dependency exists. Anthropic's provider-specific request shaping (`byok.ts:146–:180`) is the established template for provider-aware work.

### 2.3 Documents, extraction, embeddings

- Extraction is **complete and local** in `src/lib/documentIntelligence.ts` (693 lines): PDF via `pdfjs-dist` (worker bundled, :92–:156; scanned-page render :159–:190), DOCX via `mammoth` (:196–:223), PPTX/XLSX/ODT via `fflate` + DOMParser over Office XML (:225–:288), TXT/MD/CSV/JSON/code via UTF-8 (:293–:334). Limits: 25 MB file, 500 K chars, 200 PDF pages.
- Chunking exists (`chunkDocument`, 30 K-char chunks, PDF page-aware, :440–:525) plus keyword-overlap retrieval (`selectRelevantChunks`, 60 K-char budget, max 5 chunks, :556–:643). These serve *per-message attachments only* — extracted text is transient; **nothing is persisted or indexed**.
- Chat attachments (`src/components/chat/FileUpload.tsx`): file-picker only, no drag-and-drop, no paste; base64 data URL in React state, never uploaded (no Firebase Storage usage in the chat/doc path) and not persisted with the message.
- Embeddings: `src/lib/shadowtalkModel/embedding.ts` is a **stub returning 384 zeros** — the `@huggingface/transformers` implementation was deliberately removed for bundle size (documented in `docs/audit/CLAIMS_REALITY_REPORT.md` P0-8c). Downstream consumers (`learner.ts`, `kMeans.ts`) currently operate on meaningless vectors.
- TF-IDF "offline" knowledge base exists (`src/lib/local-knowledge-base.ts`, IndexedDB `shadow-knowledge-base`) but is consumed only by `KnowledgeGraphPage`, not chat.
- A dormant IndexedDB export contract exists: `src/hooks/useWorkspaceExport.ts:44,67` reads databases **`shadowtalk-db`** and **`shadowtalk-rag`** ("vectors") for workspace export/import — **no module creates `shadowtalk-rag` today**. This initiative fulfills that contract.
- Relevant installed deps: `pdfjs-dist`, `mammoth`, `fflate`, `idb@8`. Not installed (and not assumed): `@huggingface/transformers`, `onnxruntime-*`, `@modelcontextprotocol/sdk`, `tiktoken`/`gpt-tokenizer`, `localforage`, `dexie`, `ws`.

### 2.4 MCP and local execution

- `src/lib/mcp/index.ts` defines an MCP-*shaped* internal server config (`McpServerConfig`/`McpTool` with `inputSchema`, `annotations.readOnlyHint`, handlers returning `{ content, structuredContent }`) with 4 read-only product-info tools (`answer_faq`, `list_features`, `get_changelog`, `get_product_overview`). **It is imported by nothing — dead code**, not connected to chat.
- The only in-chat tool path today is regex detection → `executeShadowTool` (cloud tools or honest "Cloud Function not deployed" stubs). There is **no provider function-calling** anywhere (`tools:` is used only for OpenRouter's `web_search`/`web_fetch` plugins).
- **The app is browser-only.** No Electron/Tauri/Capacitor shell ships: `window.shadowtalkDesktop` is a fully typed preload contract (`src/types/shadowtalk-desktop.d.ts`) with **no shell behind it**; `src/lib/bridge/desktopBridge.ts` is a commented-out Tauri stub; `capacitor.config.ts` exists with `@capacitor/core` only. `DownloadPage.tsx` honestly shows Windows desktop as "Coming soon".
- Local runtimes that DO exist: WebLLM offline inference in a Web Worker (`src/offline/LocalInferenceEngine.ts`, Llama-3.2-1B q4f16, 4096 ctx — the only context-length metadata in the repo, `src/ai/ModelRegistry.ts:16–:27`); WebContainer in-browser Node runtime (`src/hooks/useCodeSandbox.ts`, requires cross-origin isolation; fallback path is console-proxied eval). No `WebSocket` usage, no localhost sidecar, anywhere in the codebase.

### 2.5 Backend, security, tests, CI

- Firebase: Auth (email/Google/anonymous), Firestore, Storage, v2 `onRequest` functions. Supabase-style adapter (`src/integrations/firebase/adapter.ts`) — client writes must carry `user_id`; Firestore rules (`firestore.rules`) enforce `ownsExisting()`/`ownsIncoming()` and a per-user collection whitelist `isUserDataCollection()` (:251–:322) that already includes `conversations`, `messages`, `knowledge_*`, `user_memories`, `ai_memories`, etc. Storage rules: per-user namespaced, 25 MB cap.
- Tests: vitest + happy-dom, 94 test files (~793 tests), backend auto-mocked in `src/test/setup.ts`; security-contract tests are an established convention. Firestore rules tests (`src/integrations/firebase/firestore.rules.test.ts`) use `@firebase/rules-unit-testing` and **skip unless the emulator is running** (CI runs it in the `test` job with `firebase-tools emulators:exec`).
- CI (`.github/workflows/ci.yml`): typecheck → lint → build (+ functions build); emulator test job; `npm audit` (continue-on-error). Push to `main` deploys hosting **and** firestore rules (`firebase-hosting-merge.yml`) — rules drift has caused incidents before (2026-11-09), so rule changes are treated as production-critical here.

---

## 3. Gap analysis → what this initiative builds

| Capability | Status before | Built by this initiative |
|---|---|---|
| Document text extraction (PDF/DOCX/TXT/MD/code/CSV) | ✅ exists (`documentIntelligence.ts`) | reused, not duplicated |
| Chat attachment handling | picker-only, ephemeral | + drag-and-drop, + ingestion into persistent index |
| Document chunking for retrieval | 30 K-char attachment chunks | new semantic chunker (~1,600 chars, overlap) sized for embeddings |
| Embeddings | stub (384 zeros) | real pluggable providers: local hash embeddings (default) + BYOK remote embeddings (opt-in, disclosed); WebGPU neural path documented as follow-up |
| Vector index | none (dormant `shadowtalk-rag` export contract) | IndexedDB vector store in `shadowtalk-rag` (documents/chunks/meta), per-user + per-project isolation |
| Automatic retrieval in chat | only per-attachment keyword selection | auto-retrieval on send with thresholds, source references, exclusion UI, context indicator |
| Context budget | `slice(-14)` + hard-coded `maxTokens: 8192` | provider-aware budget assembly (model registry, reserved output, priority allocation) |
| Compaction | none (reflection engine is an explicit stub) | non-destructive extractive compaction with source-message traceability, persisted separately |
| Continuity protection | none | protected-class preservation (decisions/requirements/constraints/tasks/files) |
| Usage telemetry | dropped SSE `usage`; hard-coded model | real usage parsing (OpenAI-compatible + Anthropic), estimation fallback labeled as estimated |
| Prompt caching | none | Anthropic explicit `cache_control`; OpenAI/DeepSeek automatic — reported only when provider confirms |
| MCP | dead internal registry, no client, no function-calling | local companion process (Node, zero-dep), localhost HTTP JSON-RPC transport, discovery, permissions, approvals, audit log, intent-based invocation |
| Local execution host | none (browser-only app) | designed + implemented as user-run companion; browser never claims direct local access |

---

## 4. Key design decisions and rationale

### 4.1 Embeddings: local hash embeddings + opt-in BYOK remote (no neural model bundled)

- `@huggingface/transformers` (transformers.js, WebGPU/WASM) is the canonical way to run neural embeddings in-browser, but it was **deliberately stripped** from this codebase for bundle size, and re-adding it would put ~10 MB+ of onnxruntime WASM into every PWA precache (the service-worker config was tuned only days ago to fix install reliability). That trade-off belongs to a future decision, not a side effect of this initiative.
- Therefore RAG ships with two **working** embedding providers behind one interface (`EmbeddingProvider`):
  - **`local-hash` (default, always available):** deterministic feature-hashing embeddings (token + character n-gram hashing into a fixed 512-dim vector, sublinear TF weighting, L2 normalization). Zero network, zero cost, works in every browser. Honest labeling: *local lexical embeddings — not a neural model*; retrieval quality is lexical/semantic-hybrid and measured in the test report.
  - **`remote-byok` (opt-in per provider):** documented embeddings endpoints of providers whose APIs actually expose them (OpenAI `text-embedding-3-small`, Gemini, Mistral, Cohere, Together, Fireworks, DeepInfra, Novita, Hyperbolic, SiliconFlow-compatible OpenAI-shape endpoints), called with the user's **existing BYOK key**. First use requires explicit opt-in; the context indicator shows *remote* processing whenever this path produced the index for the chunks being used. No silent provider switching: embeddings use the user's configured provider only if it supports embeddings, otherwise the user is told and nothing is sent.
- The interface leaves room for a future `webgpu-neural` provider (transformers.js) without re-plumbing callers; that is documented as follow-up, **not** shipped or claimed.
- Estimation honesty: because the default path is lexical, retrieval quality thresholds are calibrated in tests against the actual implementation rather than asserted from marketing.

### 4.2 Vector store: IndexedDB `shadowtalk-rag`, strictly user/project-scoped

- New DB **`shadowtalk-rag`** with stores `documents`, `chunks`, `meta` — deliberately named to fulfill the dormant `useWorkspaceExport` export/import contract (its reader exports every store generically).
- Every record carries `user_id` and `project_id`; **every read/write filters by the authenticated user id** and, where applicable, the active project. Cross-user isolation is enforced in the data layer (not by DB-per-user naming alone) and covered by dedicated tests. Chat-attached documents without a project scope to the user (`project_id: null`).
- Processing stays out of the UI thread's critical path: ingestion is async chunk-by-chunk with `AbortSignal` cancellation; hash embedding is synchronous math between yields; remote embedding is network-bound and progress-reported. Nothing blocks typing or streaming.
- Deletion of a document removes its chunks and embeddings in the same operation; export/import round-trip covered by the existing workspace export surface.

### 4.3 Token optimizer: provider-aware, non-destructive, cost-free by default

- **Budget registry** (`src/lib/tokenOptimizer/`): per-provider context windows with known-model overrides and conservative defaults for unknown models; budget = window − system/persona − project memory − reserved output (`maxTokens`, provider-capped) − safety margin. History + retrieved context are allocated by priority: protected messages → recent messages → retrieved chunks → older history.
- **Token counting:** documented `chars/4` estimation for all providers (no tokenizer dependency ships; provider-specific counting is adopted only where the provider returns real usage — see telemetry). Every displayed number is labeled *estimated* unless it came from the provider.
- **Compaction:** when the assembled context exceeds budget, older, non-protected messages are replaced in the *outgoing request only* by an extractive summary. Original messages are never mutated, deleted or overwritten — summaries persist separately (Firestore `conversation_compactions`, user-owned, added to the rules whitelist) with `sourceMessageIds` for full traceability and recovery/inspection.
- **Continuity protection:** a scoring pass marks decisions, requirements/constraints, unresolved questions, unfinished tasks, and file/research references as protected before any compaction, regardless of message age. A short message with critical content is preserved — budget pressure alone never drops it.
- **Summarization is extractive and local** (sentence scoring over the compacted range) — no hidden provider calls, no unexpected API cost. Provider-generated summaries would be a cost decision surfaced to the user, not a side effect.
- **Caching (provider-documentation-driven only):** Anthropic requests get explicit `cache_control` breakpoints on the system prompt and the last message (documented mechanism, ≤4 breakpoints, 5-min TTL); OpenAI and DeepSeek automatic caching needs no request changes and is **reported only when the provider returns cached-token counts**. Nothing is claimed that the provider did not confirm.
- **Telemetry:** `runChatCompletion` stops dropping SSE `usage` — OpenAI-compatible `stream_options: { include_usage: true }` and Anthropic `message_start`/`message_delta` usage events are parsed; the hard-coded `"gpt-4o-mini"` calls into `useTokenCostTracker` are replaced with the actual provider/model captured from the response path; estimation is labeled. The UI shows a subtle per-conversation popover (input/output, cached when reported, compacted ranges, est./actual cost) instead of fabricated "saved $" messages.

### 4.4 MCP bridge: local companion process, not fake browser omnipotence

- The mission is explicit: a browser tab cannot inspect arbitrary local software. The app today ships **no desktop shell**. Inventing `window.shadowtalkDesktop` calls would be a fake UI implementation.
- Therefore the shipped architecture is a **user-run local companion** (`companion/shadowtalk-mcp-bridge.mjs`, Node ≥ 18, **zero npm dependencies** — the MCP stdio wire protocol is JSON-RPC 2.0 and implemented by hand at the three methods the bridge needs: `initialize`, `tools/list`, `tools/call`):
  - spawns user-configured MCP servers (git, filesystem, postgres, docker — examples in `companion/config.example.json`) as stdio subprocesses;
  - exposes a **localhost-only HTTP JSON-RPC API** (`127.0.0.1`, ephemeral or configured port) with: pairing token required on every request (Bearer), Origin/Host validation plus a required custom header (browser cross-origin requests cannot satisfy both without CORS approval, and none is granted), per-server allowlist, path canonicalization + allowed-roots containment for file args, argv-array-only process spawning (no shell), timeouts, crash isolation, and a local JSONL audit log;
  - prints the pairing token in the terminal so the user consciously pairs the app once.
- Client (`src/lib/mcpBridge/`): typed client, discovery (servers → tools → annotations), **granular permission categories** (read-only / file-read / repo-read / db-read / dev-env / file-write / repo-write / db-write / command-exec) derived from server annotations + user grants, read/write separation, sensitive actions behind explicit `AlertDialog` approval (the established ChatToolbar pattern), revocation, recent-activity list, and honest connection states (disconnected/timeout/crash are surfaced, never papered over).
- **Intent-based invocation:** tool metadata is included in the chat system context for authorized servers; an intent matcher maps natural-language requests onto authorized tools ("check my latest git branch status" → `git_status`); every invocation passes the permission gate; results render through the existing `toolExecution` message-card pipeline with clear failure explanations. Write/execute categories always require confirmation — there is no autonomous destructive path.
- The old internal `src/lib/mcp` registry stays untouched (it is unwired dead code; removal is out of scope under "no unrelated refactoring").

### 4.5 Backend surface changes: minimal and rules-tested

Exactly one Firestore capability is added: `conversation_compactions` (user-owned, `user_id == request.auth.uid`, same whitelist pattern and rule strength as `conversations`/`messages`). RAG indexes and MCP permissions live in IndexedDB/localStorage (device-local by design); no new Cloud Functions; no Storage changes. The rules change ships with a rules test in the established emulator suite.

### 4.6 Unified experience

Integration lives inside the existing chat surface, not new dashboards: drag-and-drop ingestion with progress toasts; a context indicator (docs count, local/remote label, inspect/exclude popover); a token telemetry popover; a bridge-status affordance in the chat toolbar; approval cards inline in the message flow. All components follow the established glass utilities, shadcn primitives, 44 px touch targets, dual-header mobile conventions and non-hover-only actions; user-facing strings follow the existing (partial) i18n convention of the surfaces they touch.

---

## 5. Build order and why

1. **Batch 1 — Token Optimizer** first: it is the most self-contained, fixes concrete live gaps (usage parsing, hard-coded model, `slice(-14)`), and defines the `ContextBudget` API that RAG context injection consumes.
2. **Batch 2 — Stealth RAG** second: ingestion → embeddings → index → auto-retrieval, using the budget API from Batch 1 to place retrieved context honestly within limits.
3. **Batch 3 — MCP Bridge** third: companion + client + permissions, independent of 1–2 except for the chat invocation slot.
4. **Batch 4 — Unified experience**: the three capabilities converge in `ChatbotPage` with ambient UI.
5. **Batch 5 — documentation + full validation** (typecheck, lint, full vitest suite, production build), then delivery.

Each batch lands as its own commit(s) with tests; nothing merges to `main` from this branch; no push happens until the complete implementation has passed the agreed checks.

---

## 6. Companion documents

- `STEALTH_RAG.md` — pipeline, embedding providers, retrieval algorithm, privacy rules, UI contract.
- `TOKEN_OPTIMIZER.md` — budget model, compaction algorithm, caching matrix, telemetry semantics.
- `MCP_BRIDGE.md` — companion protocol, permissions, invocation flow, failure modes.
- `SECURITY_MODEL.md` — threat model across the three features, rules impact, secrets handling.
- `TEST_RESULTS.md` — what was verified how (automated / simulated / real-device), with honest limitations.
