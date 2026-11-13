# Stealth RAG — Automatic Contextual Retrieval

> Batch 2 of the Intelligent Workspace initiative. Architecture context: `ARCHITECTURE.md`.

## What it does

Users provide documents (drag-and-drop into chat, or the composer paperclip for attachments); ShadowTalk extracts, chunks, embeds and indexes them locally, then automatically retrieves relevant passages into the conversation — no embedding configuration, no chunk-size settings, no retrieval pipeline exposed.

## Pipeline (`src/lib/rag/`)

1. **Validate** — 25 MB cap, non-empty, extraction supported.
2. **Extract** — reuses `documentIntelligence.ts` (PDF via pdfjs-dist, DOCX via mammoth, PPTX/XLSX/ODT via fflate+DOMParser, TXT/MD/CSV/JSON/code via UTF-8). No duplicate extraction infrastructure.
3. **Chunk** — `chunker.ts`: ~1,600-char target with paragraph-aware ~200-char overlap; giant paragraphs split by sentence; deterministic.
4. **Embed** — pluggable `EmbeddingProvider`:
   - `local-hash` (default): on-device feature hashing (tokens + bigrams → signed 512-dim vector, sublinear TF, L2-normalized). Zero network, zero cost, works offline. HONESTLY a lexical embedder, not a neural model.
   - `remote:<provider>` (explicit opt-in in Settings → Local Tools): documented `/embeddings` endpoints (OpenAI, Gemini, Mistral, Together, Fireworks, Novita, DeepInfra, Hyperbolic) using the user's OWN BYOK key. Providers without documented embeddings APIs are refused (`EMBEDDING_CAPABLE_PROVIDERS`) — no guessed endpoints, no silent provider switching.
   - WebGPU neural (transformers.js): investigated, deliberately NOT shipped — the dep was removed from this codebase for bundle size and re-adding it would put ~10 MB of onnxruntime WASM into every PWA precache. The interface leaves room for a future opt-in; nothing claims it.
5. **Index** — IndexedDB `shadowtalk-rag` (fulfills the dormant `useWorkspaceExport` export contract), raw-IDB micro-wrapper (the `idb` package's type declarations poisoned global TS resolution in app code — see commit history). Documents + chunks in one transaction; duplicates detected by content hash at the same scope.
6. **Associate** — every record carries `user_id` + `project_id` (null = user-level chat scope). ALL reads filter by authenticated user. Deletion removes document + chunks atomically.

## Retrieval (`retrieval.ts`)

On message send (non-fatal on any failure; RAG module dynamically imported so it stays out of the initial chat bundle):

- Query embedded with the SAME provider family as the index; mixed-provider scopes fall back to the matching provider's chunks or return nothing.
- **Relevance gate**: term-coverage (fraction of query content-words present in the chunk) ≥ **0.4** — calibrated against measured score distributions; raw cosine of short queries vs long chunks is diluted (~0.15 for a clearly relevant hit) and overlaps noise. Cosine (0.1 weight) breaks ranking ties. Remote neural path uses plain cosine (≥ 0.35).
- Top-K (5) within a 4,000-char budget; excluded documents respected.
- Injected as ONE system block with `[S1]`/`[S2]` source references and an explicit processing label ("processed locally on this device" vs "processed remotely via …") — the label reflects the actual index records.
- The block flows through the token optimizer as a system message (never compacted, counted in the budget).

## Privacy rules

- Text + embeddings never leave the device unless the user enabled remote embeddings — then chunk text goes to THEIR provider at ingestion, disclosed in the UI and in the returned provenance.
- Cross-user isolation enforced at the data layer and proven by tests (`pipeline.test.ts`: bob sees nothing of alice's index; project scopes never bleed).
- No "Zero Cloud Retention" claims: document text transits the user's chosen chat provider as context, and (with remote embeddings) the embeddings provider. What IS true: ShadowTalk's own servers store none of it (IndexedDB only).

## Known limitations

- Local lexical retrieval is weaker than neural retrieval on paraphrases; the coverage gate keeps precision high (bad passages rejected) at some recall cost.
- Chat-level scope only (`project_id: null`); workspace project wiring is a follow-up (the store and tests already support project scoping).
- Scanned PDFs (no text layer) are rejected with guidance; extraction caps: 25 MB / 500K chars / 200 PDF pages.
