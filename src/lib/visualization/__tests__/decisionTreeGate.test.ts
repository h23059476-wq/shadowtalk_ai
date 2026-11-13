/**
 * Permanent regression tests — P2-2 promotion of the investigation harness
 * (case A + E at the validation layer) plus the P0-1/P0-4/P1-1 fix
 * behaviours. References: docs/investigation/…Report.docx, Tables 2–3.
 *
 *  - A1: well-formed trees pass (baseline);
 *  - A2/A3/A4 (CD-1 fixed): decisions with <2 branches, dead-end decisions
 *    and unlabeled decision edges are now REJECTED;
 *  - A5 (CD-7 fixed): raw untyped specs are rejected at the gate; the model
 *    bridge infers explicit kinds (recorded) before validation;
 *  - A6/A7 (CD-8 fixed): duplicate edges, self-loops and cycles rejected;
 *  - E1 (CD-2 fixed): unlinked nodes need an explicit "unlinked" gap note;
 *    unreachable-but-linked nodes are always rejected;
 *  - P0-4 (CD-6 fixed): model-attached urls outside the prompt allowlist
 *    are dropped with a gap note.
 */
import { describe, expect, it } from "vitest";

import { validateVisualizationSpec, type VisualizationSpec } from "../spec";
import { normalizeConceptCandidate, validateConceptCandidate } from "../conceptual/modelBridge";

function dtSpec(
  encoding: { nodes: Array<Record<string, unknown>>; edges: Array<Record<string, unknown>> },
  gaps: string[] = [],
) {
  return {
    version: 1,
    id: "dt-test",
    kind: "decision-tree",
    title: "USDT exposure decision tree",
    datasets: [],
    encoding: { kind: "decision-tree", nodes: encoding.nodes, edges: encoding.edges },
    provenance: "ai-extracted",
    sources: [],
    generatedAt: "2026-11-13T00:00:00Z",
    gaps,
  } as unknown as VisualizationSpec;
}

/** The corrected shape of the viz-8 tree: every decision has 2 labelled branches. */
const WELL_FORMED = {
  nodes: [
    { id: "peg", label: "Peg under $0.99?", kind: "decision" },
    { id: "reserves", label: "Reserves verified?", kind: "decision" },
    { id: "hold", label: "Hold allocation", kind: "outcome" },
    { id: "reduce", label: "Reduce exposure", kind: "outcome" },
    { id: "maintain", label: "Maintain with alerts", kind: "outcome" },
  ],
  edges: [
    { from: "peg", to: "reserves", label: "yes" },
    { from: "peg", to: "hold", label: "no" },
    { from: "reserves", to: "reduce", label: "no" },
    { from: "reserves", to: "maintain", label: "yes" },
  ],
};

describe("P0-1 / CD-1 — decision-branch contract enforced", () => {
  it("A1: a well-formed tree passes", () => {
    const result = validateVisualizationSpec(dtSpec(WELL_FORMED));
    expect(result.ok).toBe(true);
  });

  it("A2: a decision with a single outgoing edge is rejected", () => {
    const spec = dtSpec({
      nodes: WELL_FORMED.nodes,
      edges: WELL_FORMED.edges.filter((e) => !(e.from === "peg" && e.to === "hold")),
    });
    const result = validateVisualizationSpec(spec);
    expect(result.ok).toBe(false);
    expect(result.errors.join("\n")).toContain(`decision node "peg" has 1 outgoing edge(s)`);
  });

  it("A3: a dead-end decision (zero outgoing edges) is rejected", () => {
    const spec = dtSpec({
      nodes: WELL_FORMED.nodes.map((n) => (n.id === "peg" ? { ...n, label: "Peg under $0.99?" } : n)),
      edges: WELL_FORMED.edges.filter((e) => e.from !== "peg"),
    });
    const result = validateVisualizationSpec(spec);
    expect(result.ok).toBe(false);
    expect(result.errors.join("\n")).toContain(`decision node "peg" has 0 outgoing edge(s)`);
  });

  it("A4: unlabeled decision edges are rejected", () => {
    const spec = dtSpec({
      nodes: WELL_FORMED.nodes,
      edges: WELL_FORMED.edges.map((e) => (e.from === "peg" && e.to === "hold" ? { from: e.from, to: e.to } : e)),
    });
    const result = validateVisualizationSpec(spec);
    expect(result.ok).toBe(false);
    expect(result.errors.join("\n")).toContain(`"peg" → "hold" is missing its condition label`);
  });
});

describe("P1-1 / CD-7 — explicit node kinds", () => {
  it("A5 (raw): a fully untyped node list is rejected at the gate", () => {
    const spec = dtSpec({
      nodes: WELL_FORMED.nodes.map(({ id, label }) => ({ id, label })),
      edges: WELL_FORMED.edges,
    });
    const result = validateVisualizationSpec(spec);
    expect(result.ok).toBe(false);
    expect(result.errors.join("\n")).toContain('explicit kind "decision"');
  });

  it("A5 (bridge): normalizeConceptCandidate infers explicit kinds and records it", () => {
    const candidate = normalizeConceptCandidate(
      {
        kind: "decision-tree",
        title: "Inferred tree",
        gaps: [],
        nodes: WELL_FORMED.nodes.map(({ id, label }) => ({ id, label })),
        edges: WELL_FORMED.edges,
      },
      { id: "dt-inf", generatedAt: "2026-11-13T00:00:00Z" },
    );
    expect(candidate).not.toBeNull();
    const enc = candidate!.encoding;
    if (enc.kind !== "decision-tree") throw new Error("wrong kind");
    expect(enc.nodes.every((n) => n.kind)).toBe(true);
    expect(enc.nodes.find((n) => n.id === "peg")!.kind).toBe("decision");
    expect(enc.nodes.find((n) => n.id === "hold")!.kind).toBe("outcome");
    expect(candidate!.gaps.some((g) => g.includes("Node kinds were inferred"))).toBe(true);
    const result = validateVisualizationSpec(candidate!);
    expect(result.ok).toBe(true);
  });
});

describe("P0-1 / CD-8 — graph structural integrity", () => {
  it("A6: duplicate edges and self-loops are rejected", () => {
    const spec = dtSpec({
      nodes: WELL_FORMED.nodes,
      edges: [...WELL_FORMED.edges, { from: "peg", to: "hold", label: "maybe" }, { from: "peg", to: "peg", label: "loop" }],
    });
    const result = validateVisualizationSpec(spec);
    expect(result.ok).toBe(false);
    const joined = result.errors.join("\n");
    expect(joined).toContain('duplicate edge "peg->hold"');
    expect(joined).toContain("self-loop");
  });

  it("A7: a cyclic tree is rejected", () => {
    const spec = dtSpec({
      nodes: WELL_FORMED.nodes,
      edges: [
        { from: "peg", to: "hold", label: "no" },
        { from: "peg", to: "reserves", label: "yes" },
        { from: "reserves", to: "peg", label: "review again" },
        { from: "reserves", to: "reduce", label: "no" },
      ],
    });
    const result = validateVisualizationSpec(spec);
    expect(result.ok).toBe(false);
    expect(result.errors.join("\n")).toContain("contains a cycle");
  });
});

describe("P0-1 / CD-2 — connectivity and acknowledged unlinked nodes", () => {
  it("E1: an unlinked node passes ONLY with an 'unlinked' gap note", () => {
    const withNote = dtSpec(
      { nodes: [...WELL_FORMED.nodes, { id: "notes", label: "Review reserve reports", kind: "option" }], edges: WELL_FORMED.edges },
      ["Includes an unlinked side note 'Review reserve reports' (unlinked) — intentionally outside the flow."],
    );
    expect(validateVisualizationSpec(withNote).ok).toBe(true);

    const withoutNote = dtSpec({
      nodes: [...WELL_FORMED.nodes, { id: "notes", label: "Review reserve reports", kind: "option" }],
      edges: WELL_FORMED.edges,
    });
    const result = validateVisualizationSpec(withoutNote);
    expect(result.ok).toBe(false);
    expect(result.errors.join("\n")).toContain(`node "notes" has no edges`);
  });

  it("a linked-but-unreachable node is always rejected (no acknowledgment path)", () => {
    const spec = dtSpec({
      nodes: [...WELL_FORMED.nodes, { id: "orphan", label: "Orphan branch", kind: "decision" }],
      edges: [...WELL_FORMED.edges, { from: "orphan", to: "reduce", label: "why" }],
    }, ["Unlinked acknowledged (unlinked)."]);
    const result = validateVisualizationSpec(spec);
    expect(result.ok).toBe(false);
    expect(result.errors.join("\n")).toContain(`"orphan" is not reachable from the entry decision`);
  });
});

describe("P0-4 / CD-6 — source allowlist", () => {
  const SUPPLIED = ["https://tether.to/usdt-reserve-report-q4"];

  it("drops model-attached urls that were never supplied, with a gap note", () => {
    const result = validateConceptCandidate(
      {
        kind: "decision-tree",
        title: "USDT exposure decision tree",
        gaps: [],
        nodes: WELL_FORMED.nodes,
        edges: WELL_FORMED.edges,
        sources: [
          { url: "https://tether.to/usdt-reserve-report-q4", name: "USDT reserve report" },
          { url: "https://made-up-source.example.org/report.pdf", name: "Fabricated" },
        ],
      },
      { targetKind: "decision-tree", generatedAt: "2026-11-13T00:00:00Z", allowedUrls: SUPPLIED },
    );
    expect(result.ok).toBe(true);
    expect(result.spec!.sources.map((s) => s.url)).toEqual(SUPPLIED);
    expect(result.spec!.gaps.join(" ")).toContain("not supplied in the prompt");
  });

  it("keeps all supplied urls when the model complies", () => {
    const candidate = normalizeConceptCandidate(
      {
        kind: "decision-tree",
        title: "Tree",
        gaps: [],
        nodes: WELL_FORMED.nodes,
        edges: WELL_FORMED.edges,
        sources: [{ url: "https://tether.to/usdt-reserve-report-q4" }],
      },
      { allowedUrls: SUPPLIED },
    );
    expect(candidate!.sources).toHaveLength(1);
    expect(candidate!.gaps.join(" ")).not.toContain("not supplied");
  });
});
