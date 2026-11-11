# Batch 2 Implementation Report — Visualization Specification, Validation, Rendering & /visualize

Branch: `feature/research-visualization` · Base: Batch 1 (`ebf7d14f`) · Date: 2026-11-09

## Scope delivered

1. **Typed visualization contract** (`src/lib/visualization/spec.ts`)
   - Closed Zod schema + hand-written TS contract (the repo's `strict: false`
     tsconfig degrades `z.infer` to all-optional — the same pitfall Batch 1
     documents; zod is runtime-validation only, results are cast after parse).
   - 13 kinds: `line`, `area`, `bar`, `bar-grouped`, `pie`, `donut`,
     `scatter`, `radar`, `kpi-dashboard`, `comparison-matrix`, `timeline`,
     `flowchart`, `candlestick`.
   - Cross-field validation: every encoding key must exist in the referenced
     dataset; value axes must be numeric and share ONE unit; time series need
     ≥3 plottable points (bars may have 1–2 categories); pie ≤8 slices;
     timeline ≤60 dated events; flow edges must reference known nodes.
   - Candlestick is implemented ONLY for complete, sane OHLC (high ≥ max(open,
     close), low ≤ min(open, close)); rows with partial OHLC are REJECTED —
     never silently dropped.
   - Security: source URLs restricted to http(s) (`javascript:`/`data:` are
     rejected at validation); string fields length-capped; serialization cap
     120k chars; "unverified" provenance requires an explicit gap note (D3).
   - No HTML/JS execution surface: renderers treat spec strings as React text
     nodes / SVG `<text>` only; ChartConfig keys are fixed series indices so
     no spec-controlled string reaches ui/chart's CSS interpolator.

2. **Deterministic planner** (`planner.ts`) — context+intent → validated spec.
   Default kind by data shape (snapshot → KPI dashboard, dated series → line,
   multi-metric → comparison matrix), type hints honored when feasible with
   explicit fallback notes, refinements (`transformKind`, `applyTimeRange`
   with explicit "snapshot cannot be presented as history" refusals),
   comparison planning from an intersection of metrics.

3. **Deterministic explanation** (`explain.ts`) — "explain this chart" reads
   ONLY computed values from the displayed dataset (min/max/latest/avg in
   chronological order), plus provenance/asOf/sources/gaps. `$` characters are
   escaped so deterministic narration never pairs into the chat's KaTeX
   pipeline.

4. **Public market-data adapter** (`src/lib/marketData/index.ts`) — approved
   D2 scope, provider-independent, AI-auth-independent:
   - **CoinGecko** keyless (quotes w/ market cap, daily `market_chart`
     history) — ~5–15 calls/min; **CoinPaprika** keyless (tickers w/ market
     cap) — ~20 calls/min; **Binance** public (24hr ticker, true OHLCV
     klines) — IP-rate-limited, no market cap.
   - Verified limitations surfaced explicitly: CoinPaprika's free plan now
     restricts OHLCV history beyond ~1 day ("not allowed in this plan",
     verified 2026-11) → mapped to `key_required`; CoinGecko Pro granularity
     is never called.
   - Rate limiting per provider (min spacing + `Retry-After` backoff), TTL
     caches (quote 60s, history 10min) with transparent `freshness:
     "cached"` + age; expired data is NEVER served after a failed refresh.
   - Privacy: requests carry only public asset ids — no session/user data.
   - Errors: `rate_limited`, `key_required`, `stealth_blocked` (works with
     the existing stealthNetworkGuard), `not_found`, `invalid_symbol`.

5. **Renderers** (`src/components/visualization/`) — Recharts + shadcn
   `ChartContainer`/`ChartTooltipContent`/`ChartLegendContent`; custom SVG for
   candlestick and flowchart; premium-dark palette derived from the existing
   theme tokens (primary 195°, secondary 270°, accent 315°). No separate
   design system. `VisualizationCard` (tiny) lazy-loads
   `VisualizationContainer` + all renderers in one async chunk — verified in
   the production build (`AreaChart-*.js`, `ResponsiveContainer-*.js`,
   `VisualizationContainer-*.js`; main bundle clean).
   Capabilities: inline view, expand dialog, dataset inspector (≤200 rows
   shown), sources + retrieved/data timestamps, provider attribution, kind
   switcher (compatible transforms wired to persistence), known-gaps panel.

6. **Chat integration**
   - `chatPipeline.ts`: deterministic handler for create/refine/explain
     (no model call, no cost, works offline and in guest mode).
   - `ChatbotPage`: runs BEFORE tool interception (`/visualize` is never
     hijacked); natural-language requests via the Batch 1 intent detector; a
     bare "compare X with Y" becomes a comparison refinement ONLY when a
     visualization is already on screen (context disambiguates).
   - Persistence (D4): specs ride the existing encrypt-or-null metadata gate
     (`visualizations` field, max 1/message, re-validated on decode);
     restored on reload; type switches update the stored row via
     `.update().eq('id', …)` — never plaintext (skip on encryption failure).
   - `deep_research` detector widened ("Research the current USDT market."
     now routes to research); pure `detectToolSync` extracted for tests.
   - `MessageBubble` renders `VisualizationCard` after document artifacts;
     memo comparator extended; citations chips unaffected.

7. **Dev-only demo route** `/dev/viz-demo` (`import.meta.env.DEV`-guarded;
   prod redirects to `/chatbot`) — renders the REAL chat stack with the E2E
   scenario; used for the committed screenshots.

## E2E USDT workflow — verified

Automated (`chatPipeline.e2e.test.ts`, network mocked at the fetch boundary):
research → visualize → dashboard transform → compare (live quotes) → explain
→ 30-day history retrieval → explicit refusal when providers are unavailable
→ guidance when no research exists → reload-safety of every spec.

LIVE (`LIVE_MARKET_DATA=1 npx vitest run src/lib/marketData/__tests__/live.e2e.test.ts`,
real network, no mocks):
- USDT quote $0.999103 via CoinGecko (live), USDC $1.001 via Binance (live
  fallback) → comparison spec "Comparison: USDT vs USDC — rows=2" built from
  real values with provider attribution.
- History refusal path exercised explicitly when providers are unavailable
  (shared CI IP rate limits) — no invented history, ever.
- In-browser behavior differs from the sandbox only in CORS: CoinGecko and
  CoinPaprika send `access-control-allow-origin: *` (verified) so real
  browsers reach them.

Screenshots: `docs/architecture/research-visualization/screenshots/`
(line chart in chat, KPI dashboard, comparison matrix, expanded dialog,
dataset inspector, full conversation).

## Test results

- New Batch 2 tests: 82 (spec validation 24, planner 12, explain 6,
  market-data 15, chat-pipeline E2E 10, renderers 9, metadata viz 6).
- Full regression: **602 passed / 0 failed** (26 skipped incl. rules tests
  requiring emulator + opt-in live tests). Typecheck clean. ESLint: 0 errors
  (1 pre-existing-style warning: fast-refresh on a helper export in
  DataChartRenderer.tsx). Production build succeeds.

## Remaining limitations

- Candlestick requires an OHLC dataset; with CoinPaprika's free history now
  key-gated, keyless daily OHLC currently comes from Binance pairs only
  (USDT itself has no Binance/USD pair — its history needs CoinGecko, which
  may rate-limit shared IPs).
- Intraday granularity is impossible without provider keys (documented, not
  faked).
- `/visualize` + long (>500 char) messages fall back to normal chat (Batch 1
  precision rule); mindmap/roadmap/decision-tree hints wait for Batch 3's
  structured outline planner.
- Type-switch persistence updates the stored row's metadata; in private mode
  an encryption failure skips the update (the pre-transform spec is restored
  on reload — never plaintext).
- Historian expectations: "last N days" relative to NOW, while research
  snapshots may be older — the range filter measures against wall-clock time
  and refuses when <3 points remain (explicit message).
- No export functionality or separate visualization collection (out of Batch
  2 scope per instructions; D4 metadata approach retained).
