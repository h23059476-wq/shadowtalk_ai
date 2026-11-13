# Research-to-Visualization Investigation

Read-only engineering investigation of the Batch 3 conceptual (decision-tree) pipeline,
triggered by the `viz-8` test screenshot (`docs/architecture/research-visualization/screenshots/viz-8-concept-decision-tree.png`,
the "USDT exposure decision tree" card). No production code, schema or feature was modified.

## Method

- Static analysis of 21 pipeline files (exact line references at commit `77368ac0`, `feature/appearance-studio`).
- An executed 17-assertion vitest harness against the real modules (context resolver, gap analysis,
  conceptual pipeline, spec validator, renderer) with a mocked model; harness removed after the run.
- Full report: `ShadowTalk_ResearchToViz_Investigation_Report.docx` (+ `.pdf`), 18 pages,
  11 sections + 2 appendices, reproduction steps included.

## Verdict (summary)

Structurally safe but not yet semantically trustworthy. The closed-schema security model is solid
(zod gate, no injection surface, provenance ceiling at `ai-extracted`, honest refusals), but:

- The decision-tree graph contract (≥2 labelled branches per decision, connectivity, acyclicity)
  exists only in the prompt wording — `validateDecisionKind` does not enforce it → single-branch
  decisions and disconnected "floating" nodes validate cleanly and render in the root row (CD-1, CD-2).
- `assessGaps` treats any structured dataset captured anywhere in the session as sufficient context,
  regardless of topic (`topicOverlap || datasets.length > 0`), so later requests inherit the first
  research topic as grounding (CD-3); with no match at all, the resolver unconditionally injects the
  newest assistant message (CD-4).
- Model-attached source URLs are accepted without an allowlist, and prior-session citations feed the
  prompt's source list → cross-request provenance carry-over (CD-5) and fabricated-citation risk (CD-6).

8 confirmed defects (CD-1…CD-8), 4 suspected (SD-1…SD-4); prioritized fixes P0-1…P2-2 in Section 10
of the report.

**Status update:** all recommendations (P0-1…P2-2) are now IMPLEMENTED — the decision-tree graph
contract (≥2 labelled branches, no duplicate edges/self-loops/cycles, reachability from the entry,
acknowledged "unlinked" nodes), genuine topic-overlap for context sufficiency, the conditional
zero-candidate fallback, the source-URL allowlist, explicit node-kind inference, distinct rendering
of unlinked nodes, the START cue and deterministic layouts — with permanent regression tests in
`src/lib/visualization/__tests__/`, `src/lib/visualization/conceptual/__tests__/` and
`src/components/visualization/__tests__/`.

## Tooling (`tooling/`)

Generator and post-processors for the report document (`gen_report.js`, `patch_footers.py`,
`dedupe_toc.py`); output paths are sandbox-specific (`/home/z/my-project/…`), adapt before reuse.
