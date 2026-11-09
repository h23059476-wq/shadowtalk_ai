# Batch 3 Implementation Report — AI-Assisted Visual Intelligence

Branch: `feature/research-visualization` · Base: Batch 2 (`f05953cb`) · Code commit: `30ae2ba6` · Report/screenshot commit: see `git log` · Date: 2026-11-09

## Scope delivered

Builds directly on the Batch 1/2 architecture (resolved research context,
closed Zod `VisualizationSpec`, trusted renderers, `/visualize` pipeline,
MessageBubble embedding). No new dependencies; BYOK-only; offline behavior
and encrypted persistence unchanged.

1. **Conceptual spec contract** (`spec.ts`, `types.ts`)
   - Five new closed kinds: `mindmap`, `roadmap`, `decision-tree`,
     `architecture`, `framework` — label-only structures with NO numeric
     data surface, so an AI-authored conceptual spec can never present a
     fabricated number as chart fact.
   - Requested-type mapping: workflow / process-flow → `flowchart`
     (Batch 2 kind), hierarchy / org chart → `mindmap`, project plan →
     `roadmap`, SWOT / pillars → `framework`. `VizTypeHint` additions
     (`architecture`, `workflow`, `framework`, `hierarchy`, `project-plan`)
     plus `conceptualHintToKind` routing shared by planner and pipeline.
   - Per-kind cross-field validation: mindmap single root + unknown-parent +
     parent-cycle + depth caps; roadmap phase/item uniqueness + closed
     status enum; decision-tree decision-node requirement + edge refs;
     architecture cross-layer component uniqueness + connection refs;
     framework section uniqueness. Datasets optional for conceptual kinds,
     still REQUIRED for the 13 data kinds.

2. **AI-assisted generation** (`conceptual/modelBridge.ts`, `conceptual/prompts.ts`)
   - Model calls are injected (`ConceptModelCall` / `ConceptResearchCall`)
     and wired to the user's OWN key via `streamCloudChat` — BYOK-only
     preserved; nothing runs without an explicit user key.
   - The model authors **JSON spec candidates only** — never code, HTML or
     executable SVG. Candidates are extracted from the model output,
     normalization caps every string/array and strips unknown keys, then the
     full `validateVisualizationSpec` gate runs with one repair round and an
     honest refusal when still invalid.

3. **Gap-driven research** (`conceptual/gapAnalysis.ts`)
   - Deterministic sufficiency classification from the resolved research
     context: `sufficient` / `needs-research` / `cannot-derive`.
   - Gap-driven supplementary research goes through the cited `web_search`
     tool; results keep citations/timestamps/provider attribution. On
     failure the limitation is stated explicitly — missing facts are never
     invented and unverified numbers never become chart data (D3).
   - Deterministic builders derive roadmap / mindmap / architecture specs
     from structured research rows WITHOUT a model when the context is
     sufficient, preserving context provenance.

4. **Conceptual pipeline** (`conceptual/conceptualPipeline.ts`)
   - **Create flow**: resolve context → gap assessment → deterministic
     derivation first → optional cited research → model candidate →
     validation → provenance policy (sources attached = `ai-extracted` +
     synthesis note; none = `unverified` + gap note).
   - **Refine flow**: referenced-spec resolution (including kind-named
     references such as "the roadmap") → deterministic
     simplify/prune + explain-stages → model-assisted
     expand / add-branch / convert / dependencies / presentation edits —
     all re-validated through the same gate. Honest degradation without a
     BYOK key or when the referenced artifact is a data chart.

5. **Conversational intelligence** (`conceptual/refineOps.ts`, `intentDetector.ts`)
   - Shared op detector powers BOTH the intent layer and the pipeline, so
     they can never disagree. Precision-tuned classification for the eight
     instruction families: make more detailed, add another branch, turn
     into a decision tree, professional business roadmap, show
     dependencies, explain every stage, simplify for beginners, convert to
     presentation-style visual.
   - False-positive resistance: "I'm a beginner", "detailed explanation",
     "dependencies of X" stay normal chat.
   - `explain-stages` narration (`conceptExplain.ts`) is computed
     deterministically from the DISPLAYED spec — it cannot describe a node
     that is not shown.

6. **Trusted conceptual rendering** (`ConceptualDiagramRenderer.tsx`, 927 lines)
   - Spec-driven SVG for all five kinds: mirrored radial/tree mindmap,
     phase-column roadmap with status dots, layered decision tree with
     condition-labeled edges, stacked architecture bands with dashed
     connections, tone-colored quadrant/pillar frameworks.
   - Interactions: fit-to-container initial view, wheel/button zoom
     (0.25–3x) with live percentage, pointer-drag pan, click-to-collapse
     mindmap branches and architecture layers. Wired into
     `VisualizationContainer` (icons, labels, SpecBody) and lazy-loaded
     with the existing artifact card.
   - All labels are React-escaped SVG `<text>` — no HTML injection surface.

7. **Integration**
   - `chatPipeline.ts`: conceptual routing BEFORE Batch 2 flows;
     explain-stages narration for conceptual kinds; model/research calls
     flow through `PipelineInput`.
   - `ChatbotPage.tsx`: `vizModelCall` (`streamCloudChat`, structured
     output) + `vizResearchCall` (`executeShadowTool web_search`,
     citation-preserving) passed to the pipeline; persistence unchanged
     (same encrypted metadata gate, `wrapForStorage`).
   - `VizDemoPage.tsx`: five DEV-only conceptual scenarios pushed through
     the same validation gate for QA/screenshots.

8. **Security hardening found during testing**
   - `parseVisualizationSpec` now returns the SCHEMA-STRIPPED object
     instead of the raw input — injected unknown keys can no longer survive
     the parse boundary into renderers or persisted metadata (no-smuggling
     previously only held inside the validator).

## E2E conversational workflow — verified

Demo conversation (`/dev/viz-demo`, DEV-only) exercises the exact user
journey: research → line chart → dashboard transform → live comparison →
**"Turn this into a mind map of the USDT market"** → **"Make it a
professional business roadmap"** → **"Show dependencies between these
steps"** → **"Draw the architecture of a stablecoin data platform"** →
**"Give me a SWOT framework"** — every conceptual card carries its
provenance badge (`ai-extracted`), source count, zoom controls and
collapse/expand affordances, all inside the existing chat surface (no
separate visualization workspace).

Pipeline-level flows are covered in
`src/lib/visualization/__tests__/conceptualPipeline.test.ts` with mocked
model/research calls (create, refine, reference resolution, honest
degradation, provenance policy, gap-driven research failure).

## Screenshots

`docs/architecture/research-visualization/screenshots/`:

- `viz-6-concept-mindmap.png` — mind map card in chat (zoom 78%, radial
  layout, AI-EXTRACTED badge, follow-up suggestions)
- `viz-7-concept-roadmap.png` — phase-column roadmap with status dots
- `viz-8-concept-decision-tree.png` — layered decision tree, condition edges
- `viz-9-concept-architecture.png` — stacked architecture bands, dashed links
- `viz-10-concept-framework.png` — SWOT quadrant framework
- `viz-11-concept-mindmap-expanded.png` — expanded artifact dialog view

## Test results

- New Batch 3 tests: **65** (spec-conceptual 32, conceptualPipeline 26 with
  mocked model/research, ConceptualDiagramRenderer 7 incl. XSS-surface and
  collapse behavior).
- Full regression: **667 passed / 0 failed** (26 skipped incl. emulator and
  opt-in live tests). Typecheck clean. ESLint: 0 errors (91 pre-existing
  warnings only). Production build unchanged (`build` script untouched).

## Remaining limitations

- Conceptual labels are model-synthesized from the research context — they
  carry `ai-extracted` provenance and a verify-against-sources note, but
  they are not source-verified facts; `unverified` is used when no sources
  are attached.
- Refinement quality depends on the user's own BYOK model; without a key,
  only the deterministic ops (simplify/prune, explain-stages, kind
  conversion via builders) are available and the pipeline says so
  explicitly.
- Ambiguous refinement phrasing intentionally falls back to normal chat
  rather than guessing the referent; kind-named references ("the roadmap")
  resolve, but "make IT better" with several candidates resolves to the
  most recent conceptual diagram only.
- Expand/collapse and zoom state are session-local (not persisted with the
  encrypted message metadata).
- Conceptual diagram layout is deterministic (radial/phase/layered), not
  force-directed; very wide maps rely on zoom/pan rather than auto-wrapping.
- No export functionality or separate visualization collection (still out
  of scope per Batch 2 decision; D4 metadata approach retained).
