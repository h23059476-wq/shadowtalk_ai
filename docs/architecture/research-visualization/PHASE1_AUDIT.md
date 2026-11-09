# Research-to-Visualization System — Phase 1 Architecture Audit & Implementation Plan

> **Status:** Audit complete. No production code modified.
> **Branch:** `feature/research-visualization` (from `main` @ `69fdcdbe`)
> **Date:** 2026-11-09
> **Method:** Full source inspection of `src/`, `functions/`, `firestore.rules`, build/deploy config, and test suite. All findings below were verified against the actual code (file paths + line numbers included). This document is the authoritative basis for Batches 1–5.

---

## Part A — Audit Findings (the 10 required areas)

### A1. Existing research & web-search capabilities

| Mechanism | Status | Location | Notes |
|---|---|---|---|
| `research` chat mode | **No-op** | `src/components/chat/ModeSelector.tsx` | `getModePrompt("research")` returns `""`; no handler in `ChatbotPage` |
| `deep_research` / `web_search` tools | **Partial** | `src/lib/shadowTools/executeShadowTool.ts` (lines ~50, ~44) | Real web search **only** for BYOK **OpenRouter** (plugin `openrouter:web_search`) or **Perplexity** (native Sonar). On the shared path the `webSearch` flag is silently ignored |
| Shared-path web search | **Missing** | `functions/src/index.ts` (`chat`) | No `tools`/`plugins` key is ever sent upstream; `deepResearch` body param only appends one prompt sentence |
| Web fetch (URL read) | **Partial** | `src/lib/byok.ts` | OpenRouter-only (`openrouter:web_fetch`), BYOK only |
| Dedicated research page | **Stub** | `src/pages/ResearchPage.tsx` | Hardcoded empty results; button says "Research unavailable" |
| External data-provider APIs (market/crypto/etc.) | **None** | — | Zero hits for coingecko/coinmarketcap/tavily/exa/firecrawl/serp anywhere in `src/` or `functions/` |
| Dead tool endpoints | **Broken** | `executeShadowTool.ts` | `code-runner`, `file-manager`, `postgres-query`, `api-gateway` are invoked via `backend.functions.invoke(...)` but **do not exist** in `functions/src/index.ts` (404 at runtime) |
| `runChatCompletion` chatFlags | **Dead param** | `src/pages/ChatbotPage.tsx` | `chatFlags?: { webSearch?; searchQuery?; deepResearch?; researchQuery? }` accepted but never passed by either call site |

**Implication for this feature:** the only *real* research retrieval today is BYOK OpenRouter/Perplexity. Everything else is LLM free-generation that *looks* like research. The visualization pipeline must therefore treat "research" content by **provenance class**, not blindly (see Part E).

### A2. How research results, citations, URLs and source metadata are stored

**Critical gap — citations are destroyed at the SSE layer.** In `src/lib/byok.ts` the stream handler reads only:

```ts
const delta = parsed?.choices?.[0]?.delta?.content;
if (delta) { content += delta; opts.onDelta?.(content); }
```

OpenRouter's `annotations` / `url_citation` payloads (returned by `web_search`) are **silently dropped** — zero occurrences of `annotations` in the file. The only "sources" that survive are URLs the model happens to write into prose.

**Message type** (canonical, `src/pages/ChatbotPage.tsx` lines 118–134):

```ts
interface Message {
  id: string; type: "user" | "ai"; content: string; timestamp: Date;
  attachment?: { type: 'image' | 'file'; data: string; name: string; mimeType: string };
  imageUrl?: string;
  toolExecution?: { tool: string; status: string; result?: string; params?: Record<string, string> };
  isShadowTwin?: boolean; shadowTwinName?: string;
  source?: string;      // "byok" | "shared" | "local" | "omniroute"
  modelUsed?: string; provider?: string;
}
```

There is **no** `sources`, `citations`, `metadata`, or `mode` field. Narrower duplicate copies of this interface exist in `MessageBubble.tsx` (80–96) and `ChatMessages.tsx` (8–14) — any new field must be added to all three.

**URL chips** are render-time only: `MessageBubble.tsx:22` regex-extracts URLs from the text (`extractUrls`).

**Persistence** (`saveMessage`, `ChatbotPage.tsx` 846–882 → Firestore `messages`): inserts **only** `{ conversation_id, user_id, content, role, personality }`. On reload (`loadConversation`, 424–451) only `id/type/content/timestamp` are restored. **`toolExecution`, `imageUrl`, `source`, `modelUsed`, `provider` are all lost on reload.** Content goes through E2EE `wrapForStorage` (encrypt-or-null).

### A3. Conversation-context retrieval (the "turn your previous research into a chart" question)

Send flow: `handleSendMessage` → `runChatCompletion` builds:

1. System: `buildChatSystemPrompt({personality, businessMemory})` + `getModePrompt(chatMode)`
2. Memory prefixes: `buildMemoryContextForUser(user)` (≤500 chars from Firestore `user_memories`), doc-directive, Shadow-Twin prompt
3. History: **`routerMessages.slice(-14)`** (line 1112) — only the last 14 messages reach the LLM

Where prior research actually lives:

| Store | Contents | Limits |
|---|---|---|
| React `messages` state | **Full text of every message this session** — incl. the deep-research report | Not sent upstream beyond last 14; but it *is* available client-side |
| Firestore `messages` | `content` text only (E2EE-wrapped in private mode) | Metadata lost |
| `knowledge_entries` | Auto-extracted: title + first 2000 chars + tags (from AI replies ≥200 chars with headings) | Truncated |
| `ai_memories` / `user_memories` | Regex/heuristic facts | Lossy |
| IndexedDB `AdaptiveMemory` | 300 confidence-scored facts | `buildRecallPacket` **not used by ChatbotPage** (only by `useGlobalChat` fallback) |
| `strategy_reports` | Persisted strategy reports | Strategy flow only |

**Answer to the Phase-1 question:** *"Turn your previous research into a chart"* can be satisfied **without re-research** by having the visualization pipeline read the **client-side `messages` state directly** (the full session, not the 14-message LLM window), prioritizing messages flagged as research/tool output, then falling back to `knowledge_entries`/`strategy_reports` for prior sessions. What is missing and must be built: (a) structured capture of research data+citations at research time (Part E), (b) persistence of that structure so it survives reload (Part C/D).

### A4. AI provider & BYOK architecture

- `streamCloudChat(messages, opts): Promise<CloudChatResult>` (`src/lib/cloudChat.ts`) routes by access mode: `byok` → `streamByokChat` (16 providers, keys in `localStorage["shadowtalk.byok.v2.<uid>"]`), `shared` → Firebase Function `chat` (OpenRouter `openrouter/free`, server-side 100/day quota). Never throws for provider errors — returns `{ content, error?, source, modelUsed, provider }`.
- Local WebLLM path via `AIProviderRouter` (only when `prefer-local` + engine ready, or offline). Turbo path (`useTurboChat` → `turboComplete` → Groq/OpenAI) resolves **BYOK keys only, never shared keys**.
- `structuredOutput?: boolean` → `response_format: {type:"json_object"}` — honored on **shared** and **most BYOK** paths; **ignored** by Anthropic BYOK, local WebLLM, and dropped by `executeAIRequest`/OmniRoute.
- ChatbotPage calls `streamCloudChat` **directly** (does not use `executeAIRequest` or the provider router).
- Precedent for AI-emitted JSON: `src/hooks/useStrategyRunner.ts:95-118` — `structuredOutput: true` + schema-in-prompt + `content.match(/\{[\s\S]*\}/)?.[0]` + manual field checks. This is fragile (greedy regex) but is the established pattern; zod exists in `package.json` but is used exactly once (newsletter form).

### A5. Streaming & tool-calling mechanisms

- SSE streaming contract: `onDelta?: (accumulated: string) => void` (full accumulated text); per-frame React coalescing in ChatbotPage (`pushAssistant/flushAssistant/finalizeAssistant`); mid-stream `data:{error}` surfaces partial content **with** `error` set (both must be checked).
- Tool calling is **regex on user text** (`TOOL_PATTERNS`, `src/hooks/useToolOrchestrator.ts` — 11 patterns, priority-scored), intercepted in `handleSendMessage` at lines ~1406–1507 **before any LLM call**. Auto-execute tools terminate the turn (`executeShadowTool` returns `kind: "inline" | "ui" | "chat_flags" | "none"`); the result is rendered via `ToolExecutionCard` + markdown, and the text is saved as an assistant message. Tool output is **never fed back into a follow-up LLM call** — a `chat_flags` result kind exists but nothing produces it.
- `Message.toolExecution` is patched by message id: `setMessages(prev => prev.map(m => m.id === toolMessageId ? {...m, ...} : m))` — the exact pattern a visualization result should reuse.

### A6. Existing chart / visualization libraries

| Asset | Status | Notes |
|---|---|---|
| `recharts ^2.15.4` | **Installed** | Already in `package.json`; used by 8 admin Intelligence Center views with hand-rolled markup |
| `src/components/ui/chart.tsx` (shadcn Recharts wrapper: `ChartContainer`, `ChartTooltipContent`, `ChartLegend*`, `ChartStyle`) | **Installed, ZERO consumers** | Theme-token-native (`hsl(var(--…))`), `ResponsiveContainer`-based. Dead inventory, ready to adopt |
| `src/components/chat/Artifacts.tsx` | **Orphaned** | `Artifact` type already includes `'chart' \| 'table' \| 'mermaid'` — but `extractArtifacts()` is never called and chart/mermaid have no renderer |
| Mermaid | **Not installed** | No diagram engine exists. Conceptual diagrams need either a new dep or a custom spec-driven SVG renderer |

**No chart of any kind renders inside chat today.**

### A7. Message components & chat renderer

- `MessageBubble.tsx` (589 lines) renders via two-tier `LazyMarkdown` → `FullMarkdown` (react-markdown + remark-gfm; remark-math/rehype-katex lazy-loaded only when math is detected — the exact lazy pattern to copy for recharts).
- Custom renderers: code → `CodeBlock` (Launch/IDE/Canvas/Download/Copy; `isFullWebsite` detection), GFM tables, links, emoji callouts, task lists, images, `ToolExecutionCard`, `DocumentArtifact` (auto-detected via strict `detectDocumentArtifact`, lines 510–621 of `DocumentArtifact.tsx` — **the perfect precedent for a `detectVisualization` block**), URL source chips, provider-source label.
- **XSS safety is structural**: no `rehype-raw`, no `dangerouslySetInnerHTML` in the chat path — raw HTML in AI output is inert. The only DOMPurify usage in the app is for SVG artifacts (`Artifacts.tsx:75`).
- `MessageBubble` has a hand-written memo comparator (lines 575–588) — **new message fields must be added to it or re-renders will be dropped**.
- No virtualization; streaming-protection memoization walls throughout.

### A8. File & project persistence systems

- Backend facade: `backend` (`src/integrations/local/client.ts`) — a Supabase-shaped proxy over Firestore (`backend.from('<collection>').select().eq()...`). Collections are addressed by name.
- Firestore collections relevant here: `conversations`, `messages`, `knowledge_entries`, `strategy_reports`, `agent_tasks`, `shared_answers`, `workspaces` (IDE code-projects, **not** a user content library), `search_history` (write path dead).
- Sharing: `publishSharedAnswer` (`src/lib/growth/publishSharedAnswer.ts`) writes `{slug, user_id, title, prompt, answer, model, source, views: 0}` to publicly-readable `shared_answers`; `/s/:slug` renders markdown only (react-markdown, no raw HTML).
- Export engines that already exist: `worldClassDocumentExport.ts` (1,655 lines — jsPDF/print/markdown/txt/doc/html, hand-rolled `escape()` everywhere, pinned by `printExportXss.test`), `exportToPdf.ts` (chat transcript PDF — dead code, no button), WorkspaceExportImport (`.shadow` archives).
- Rules pattern for a new user-private collection: add the name to `isUserDataCollection()` in `firestore.rules` (lines 251–297); ownership = `user_id == request.auth.uid` enforced on create **and** update (`ownsExisting() && ownsIncoming()`). Rules tests exist (`firestore.rules.test.ts`, emulator-gated).

### A9. Existing image-generation functionality

- `src/lib/cloudImage.ts`: BYOK-only (OpenAI `gpt-image-1`, OpenRouter `google/gemini-2.5-flash-image`), watermarked, routed via the `image_generator` tool. Renders as `message.imageUrl` card — **state-only, lost on reload**.
- Verdict per spec Phase 10: image generation is **not** a dependency for this feature. Data charts/diagrams render as real components; image-gen remains available for illustrative graphics only.

### A10. Security & data-validation mechanisms

- **No eval on AI output anywhere**; `new Function` exists only in user-authored code sandboxes (`useCodeSandbox`, `AgenticIdePage`, `CodeCanvas`). A `securityContracts.test.ts` source-scan test pins such invariants — the same style will pin the visualization renderer.
- **No zod validation of AI JSON anywhere yet**; the ad-hoc precedent is `useStrategyRunner`.
- Firestore rules: explicit whitelist, unknown collections denied; `daily_usage` client-write:false (server-only rate limiter); App Check **not implemented** (roadmap item per rules comment).
- **Stealth Mode** (`src/lib/stealthNetworkGuard.ts`): monkey-patches `fetch`/XHR and blocks **all cross-origin** requests while engaged (allow-list: same-origin, localhost, `blob:`, `data:`). BYOK/research/export network calls fail in stealth mode — downloads via Blob are safe. A viz pipeline must respect `useStealthKillSwitch().isStealthMode`.
- **E2EE private mode**: `e2e:<iv>:<ciphertext>` in Firestore; keys memory-only (vault locks on reload); **encrypt-or-null** contract (`wrapForStorage` returns `null` → caller must skip the write). Plaintext exists in memory during an unlocked session, so visualization can read prior research in-session. Known pre-existing gap: `learnFromTurn` writes plaintext heuristics to `ai_memories`/`knowledge_entries` without a private-mode guard — **the visualization pipeline must not repeat this mistake** (any persistence must go through `wrapForStorage` or be session-only).
- ChatbotPage message state is plain `useState<Message[]>`; special content attaches via message fields (`toolExecution`, `imageUrl`) and id-based patching.

---

## Part B — Context-Resolution Design (how follow-ups avoid re-research)

Layered resolution, cheapest first, **never re-researches when valid context exists**:

```
ResearchContextResolver.resolve(userRequest, session)
 1. Active viz session (last VisualizationSpec in conversation, if the request
    is a refinement: "make it a line chart", "last 30 days")  → mutate spec
 2. Session messages scan (client-side, FULL history — not the 14-message
    LLM window): newest-first, prioritized by
      a. messages carrying structured ResearchDataBlocks (see Part E)
      b. messages with toolExecution ∈ {deep_research, web_search} completed
      c. messages whose citations[] is non-empty
      d. plain assistant text matching the request topic (AI-judged relevance)
 3. Cross-session stores: strategy_reports → knowledge_entries → ai_memories
    (title/tag/content match; data quality flagged lower)
 4. Only if resolution yields insufficient data for the requested visualization
    → emit a targeted "missing data" research request through the existing
    tool path (web_search/deep_research), scoped to the missing fields
    (e.g. "30-day USDT history"), never a blanket re-research.
```

The resolver returns a typed `ResearchContext { datasets, citations, textEvidence, provenanceClass, gaps[] }` consumed by the spec planner.

---

## Part C — Target Architecture (extends, does not duplicate)

All new code under `src/lib/visualization/` + `src/components/visualization/`. No new AI providers, no new research systems, no new backend.

```
User message ("show this as a chart")
  │
  ├─<existing> useToolOrchestrator: new `visualize` tool pattern + /visualize command
  │            (interception point: ChatbotPage.handleSendMessage, pre-LLM)
  ▼
VisualizationIntentDetector        (deterministic; AI-assisted classification only
  src/lib/visualization/intentDetector.ts   when regex is ambiguous)
  ▼
ResearchContextResolver            (Part B; reads messages state + stores)
  src/lib/visualization/contextResolver.ts
  ▼
ResearchDataExtractor              (harvests ResearchDataBlocks; else AI extraction
  src/lib/visualization/dataExtractor.ts    over cited evidence via streamCloudChat
                                            {structuredOutput:true} — provenance-tagged)
  ▼
DataNormalizer                     (units/currency normalization ONLY with explicit
  src/lib/visualization/normalize.ts        conversion rates from sources; missing-data
                                            markers; type coercion; size limits)
  ▼
VisualizationPlanner               (chooses chart vs dashboard vs diagram vs table;
  src/lib/visualization/planner.ts          NEVER forces a chart onto qualitative data)
  ▼
VisualizationSpec (JSON) ──► VisualizationSpecValidator (zod safeParse + integrity rules)
  src/lib/visualization/specSchema.ts        reject → actionable error message
  ▼
VisualizationRenderer (TRUSTED app components only)
  src/components/visualization/VisualizationCard.tsx
    ├─ data charts  → Recharts via existing src/components/ui/chart.tsx (lazy chunk)
    ├─ analytical   → KPI/dashboard/table/ranking components (tokens: --card/--primary…)
    └─ conceptual   → spec-driven SVG React renderer (custom layout, no mermaid dep)
  ▼
Message.visualization field → rendered by MessageBubble (memo comparator updated)
  ▼
Follow-ups: session viz context + spec mutation (Batch 3)
  ▼
Persistence: `visualizations` collection (+ rules), export service (Batch 4)
```

**Integration points reused (verified):** tool interception (`handleSendMessage`), `executeShadowTool` result kinds, `streamCloudChat` structured output, `ChartContainer`, `detectDocumentArtifact`-style inline card detection, `worldClassDocumentExport` escape-discipline for exports, `wrapForStorage` for private-mode persistence, `isUserDataCollection` rules whitelist, Blob-download pattern (stealth-safe).

### Message-schema extension (all three copies of `Message`)

```ts
interface Message {
  // …existing fields…
  citations?: Citation[];            // parsed from OpenRouter annotations at SSE layer
  visualization?: StoredVisualization; // { spec, provenance, createdAt, specVersion }
  researchData?: ResearchDataBlock[];  // structured datasets captured at research time
}
```

### ResearchDataBlock — structured capture at research time (Batch 1, the keystone)

`deep_research`/`web_search` prompts are extended to end with a machine-readable block:

````
```shadowdata
{
  "datasets": [{ "title": "USDT Market Snapshot", "columns": [...], "rows": [...],
                 "units": {...}, "asOf": "2026-11-09T12:00:00Z" }],
  "sources": [{ "url": "...", "name": "...", "retrievedAt": "...", "dataTimestamp": "..." }],
  "gaps": ["historical 30d prices not available from retrieved sources"]
}
```
````

The deterministic layer (`src/lib/visualization/dataDoc.ts`) extracts, zod-validates, and stores this block on the message (`researchData`) — so a later "visualize this" finds **typed data with provenance already attached**, and the LLM window limit becomes irrelevant. Blocks are best-effort: absent blocks fall back to AI extraction from cited text, which is then **provenance-tagged lower** (Part E).

---

## Part D — VisualizationSpec contract (v1)

One discriminated union, zod-validated; AI never produces executable code — only data + layout intent. Illustrative (final schema may adjust during Batch 2):

```ts
type VisualizationSpec = ChartSpec | AnalyticalSpec | DiagramSpec | ReportSpec;

interface SpecCommon {
  title: string;               // sanitized, ≤120 chars
  description?: string;
  dataset: { columns: { key: string; type: 'date'|'number'|'string'|'currency';
                        unit?: string; currency?: string }[];
             rows: Record<string, string | number | null>[] };   // ≤5,000 rows enforced
  sources: SourceRef[];        // { url, name?, retrievedAt?, dataTimestamp? } — required if dataset non-empty
  integrity: { freshness: 'realtime'|'daily'|'stale'|'unknown';
               missingData: string[];       // explicit gap declarations
               conflicts?: { field: string; values: { value: string; source: string }[] }[];
               estimates?: string[]; };     // anything not source-verified MUST be declared here
  metadata: { specVersion: 1; generatedAt: string;
              aiSource?: { source: string; modelUsed?: string; provider?: string } };
}

ChartSpec     { type: 'line'|'bar'|'bar-grouped'|'bar-stacked'|'pie'|'donut'|'area'|
                      'scatter'|'histogram'|'candlestick';  // candlestick ONLY with valid OHLC
                config: { x: string; y: string[]; timeRange?: ...; interactive?: boolean } }
AnalyticalSpec{ type: 'kpi-cards'|'comparison-dashboard'|'market-dashboard'|'ranking'|
                      'stat-summary'|'trend-analysis'; panels: Panel[] }   // panel = stat/table/mini-chart
DiagramSpec   { type: 'flowchart'|'process'|'architecture'|'mindmap'|'decision-tree'|
                      'timeline'|'roadmap'|'relationship';
                graph: { nodes: { id; label; kind? }[];          // labels rendered as React text only
                         edges: { from; to; label? }[];
                         layout?: 'auto'|'left-right'|'top-down' } }
ReportSpec    { type: 'research-summary'|'source-comparison'|'infographic'; blocks: Block[] }
```

Hard validator rules (deterministic, in addition to zod): no row with fabricated-looking fill values when a gap is declared (`null` + `missingData` entry instead); currency/unit mixing rejected unless explicit conversion with source; `candlestick` requires all of open/high/low/close; non-empty dataset requires ≥1 source; stale data (`dataTimestamp` older than declared freshness class) renders a visible staleness badge; conflicting sources must be surfaced, never silently averaged.

---

## Part E — Data-integrity & provenance model

Every dataset value carries one of three provenance classes, rendered visibly:

| Class | Meaning | Render |
|---|---|---|
| `source-verified` | Extracted from a cited source with URL + timestamp | Normal + source footer |
| `ai-extracted` | Parsed by AI from cited prose (no structured block) | "Extracted by AI from cited sources" note |
| `unverified` | No source / shared-path pseudo-research | **Refused for numeric charts by default**; user may explicitly opt in per-visualization, rendered with prominent warning |

Non-negotiables (enforced in `specSchema.ts` + `dataGuards.ts`, tested in Batch 5): never invent values; never interpolate silently; never mix units/currencies without explicit sourced conversion; never present estimates as facts; distinguish snapshot vs time-series (a single market snapshot is never charted as history); stale data identifiable; source disagreement surfaced.

**Known architecture constraint:** on the shared path, "research" is un-sourced LLM text today (A1). The pipeline handles this honestly: shared-path research yields no annotations → data class `unverified` → numeric charting requires either (a) BYOK OpenRouter/Perplexity research with real citations, or (b) a `shadowdata` block the model filled from its own knowledge, which is still `unverified` unless it carries real URLs that the user can inspect. **Decision point D2 below proposes an optional keyless market-data provider to make the USDT scenario real for all users.**

---

## Part F — Batch plan (each batch ends with changed-files + test report)

### Batch 1 — Architecture & research-context integration
- `src/lib/visualization/` skeleton: `types.ts`, `contextResolver.ts`, `dataDoc.ts` (+ zod schema for `shadowdata` blocks)
- Citation capture: extend `src/lib/byok.ts` SSE handler to parse OpenRouter `annotations` → `CloudChatResult.citations`; thread through ChatbotPage into `Message.citations`; render as chips (extend existing URL-chip UI)
- Extend `deep_research`/`web_search` prompts (in `executeShadowTool.ts`) to emit `shadowdata` blocks; capture on message (`Message.researchData`)
- Extend `Message` in all 3 copies + memo comparator; extend `saveMessage`/`loadConversation` with an E2EE-wrapped `metadata` field so citations/researchData/visualizations survive reload
- ResearchContextResolver (Part B) + tests
- **Tests:** citation parsing (SSE fixture with annotations), shadowdata extraction/validation, resolver prioritization, metadata persistence round-trip incl. encrypt-or-null

### Batch 2 — Specification, validation & rendering
- `specSchema.ts` (zod) + `dataGuards.ts` + `planner.ts` + `pipeline.ts`
- `VisualizationCard.tsx` + lazy `LazyVisualization` (recharts out of chat bundle, mirroring LazyMarkdown); adopt `ui/chart.tsx`; deterministic SVG renderer for diagrams (custom layout — no mermaid dependency, per "avoid unnecessary dependencies")
- `/visualize` slash command + `visualize` tool pattern + `executeShadowTool` case; MessageBubble renders `message.visualization` + fenced-block detection (`detectVisualization`, modeled on `detectDocumentArtifact`)
- **Tests:** spec validation matrix (valid/malformed/oversized/mixed-unit/OHLC-incomplete), renderer snapshot tests per type, "no eval" source-contract test, detection tests

### Batch 3 — Natural-language follow-ups & interactivity
- Session viz context; refinement grammar ("make it a line chart", "last 30 days", "compare with X", "make it interactive", "explain this chart")
- "Explain" generates narrative **from the stored dataset** (not from pixels); missing time-range data triggers scoped research through the existing tool path
- Interactivity: tooltips, series toggle, time-range select, zoom (Recharts-native), diagram node hover
- **Tests:** follow-up intent classification, spec-mutation determinism, explain-from-dataset, missing-data → scoped research request

### Batch 4 — Export, persistence & project integration
- `exportService.ts`: PNG (SVG→canvas serialize), SVG, CSV (dataset), PDF (jsPDF, following `worldClassDocumentExport` escape discipline); Blob downloads (stealth-safe)
- `visualizations` Firestore collection (owner-scoped; added to `isUserDataCollection`); save/reopen gallery; saved spec retains dataset + sources (not a screenshot); rules tests updated
- Optional: share public viz cards via `shared_answers` extension (sanitized, spec-driven render)
- **Tests:** export content correctness (CSV rows match dataset; PNG non-empty), save/reload round-trip, rules emulator tests, stealth-mode download safety

### Batch 5 — Security, regression & performance
- Source-contract tests: no `eval`/`new Function` in visualization modules; no `dangerouslySetInnerHTML` outside the DOMPurify-pinned SVG path; labels rendered as React text
- Fuzzing malformed AI JSON; dataset size caps (≤5,000 rows, ≤1MB spec); lazy render via existing perf tiers; error/loading states
- Private-mode audit: viz persistence honors `wrapForStorage`; no plaintext capture of private sessions (avoid the `learnFromTurn` leak pattern)
- Full existing suite green (471 tests baseline) + new suite
- **Tests:** XSS vector suite (labels/sources/descriptions), malformed-spec fuzz, bundle-size assertion (recharts chunk isolated)

---

## Part G — Decision points (need product sign-off before Batch 1 coding)

| # | Decision | Recommendation |
|---|---|---|
| D1 | **Conceptual diagrams: custom spec-driven SVG renderer vs adding Mermaid** | **Custom renderer.** No new dep (~"avoid unnecessary dependencies"), full token/theming control, deterministic layout for flowchart/timeline/mindmap/roadmap/decision-tree. Mermaid is heavier and hard to constrain to a validated spec |
| D2 | **Market/quantitative data provider for scenarios like Phase 5 (USDT)** | **Add a small keyless public provider module (e.g. CoinGecko public API)** behind the existing tool path, clearly provenance-tagged with retrieval timestamps, disabled in stealth/offline. Rationale: today *no* real numeric market data can reach shared-mode users (A1), so Phase 5 would be untestable end-to-end for them. Alternative: BYOK-OpenRouter-only research, accepting the limitation |
| D3 | **Unverified-data policy** | Numbers without any source are **refused** for numeric charts by default with a clear explanation + one-click "research this properly" action; qualitative diagrams remain allowed. (Strict reading of Phase 6 rule 1) |
| D4 | **Persistence location for saved visualizations** | New `visualizations` collection (owner-scoped, rules-whitelisted) rather than overloading `knowledge_entries`; messages additionally carry the spec in E2EE-wrapped `metadata` so in-chat viz survives reload |

## Risks & mitigations

| Risk | Mitigation |
|---|---|
| Shared-mode users have no real research data (A1) | Provenance classes + honest refusal (D3); D2 optional provider |
| Message-interface drift (3 copies) | Type the field once in a shared module; contract test asserting all copies |
| Chat streaming perf degradation | Lazy chunk for recharts; render after stream finalizes; memo comparator updated |
| E2EE regressions | All persistence through `wrapForStorage`; reuse `chatPrivateMode.security` test style |
| Prompt-injection via researched content | AI output is only ever a validated spec; deterministic validator + trusted renderers; no HTML path |
| Feature creep / UI clutter | Single visualization card with progressive disclosure; controls only where the spec supports them |

## Explicitly out of scope (per spec)
- Image-generation-based charts; new AI providers or shared keys; replacing existing research tools; unrelated UI changes; fake/mock market data.

---

*End of Phase 1 audit. Awaiting go-ahead for Batch 1 on branch `feature/research-visualization`.*
