/**
 * Batch 3 — conceptual spec validation tests.
 * Covers: all five conceptual kinds validate; malformed structures are
 * rejected whole; cycle/depth checks; size caps; provenance policy for
 * conceptual specs (no sources → unverified requires a gap note);
 * datasets are NOT required for conceptual kinds but ARE for data kinds;
 * security surface (labels are plain text, sources http(s)-only).
 */

import { describe, it, expect } from "vitest";
import {
  SPEC_LIMITS,
  validateVisualizationSpec,
  parseVisualizationSpec,
  COMPATIBLE_KINDS,
  VIZ_SPEC_KINDS,
  isConceptualKind,
  type VisualizationSpec,
} from "../spec";
import type { ShadowDataset } from "../types";

function conceptSpec(overrides: Partial<VisualizationSpec> = {}): VisualizationSpec {
  return {
    version: 1,
    id: "viz-concept-test",
    kind: "mindmap",
    title: "Test mind map",
    datasets: [],
    encoding: {
      kind: "mindmap",
      layout: "tree",
      nodes: [
        { id: "root", label: "USDT market" },
        { id: "b1", label: "Adoption", parent: "root" },
        { id: "b2", label: "Risks", parent: "root" },
      ],
    },
    provenance: "ai-extracted",
    sources: [{ url: "https://example.com/research", name: "Example research" }],
    generatedAt: "2026-11-09T12:00:00Z",
    gaps: ["Diagram structure synthesized by the model."],
    ...overrides,
  };
}

describe("conceptual kinds — registration", () => {
  it("registers the five conceptual kinds in the closed kind list", () => {
    for (const kind of ["mindmap", "roadmap", "decision-tree", "architecture", "framework"] as const) {
      expect(VIZ_SPEC_KINDS).toContain(kind);
      expect(isConceptualKind(kind)).toBe(true);
    }
    expect(isConceptualKind("line")).toBe(false);
  });

  it("conceptual kinds have no deterministic menu targets", () => {
    expect(COMPATIBLE_KINDS.mindmap).toEqual([]);
    expect(COMPATIBLE_KINDS.roadmap).toEqual([]);
    expect(COMPATIBLE_KINDS["decision-tree"]).toEqual([]);
    expect(COMPATIBLE_KINDS.architecture).toEqual([]);
    expect(COMPATIBLE_KINDS.framework).toEqual([]);
  });

  it("conceptual kinds do NOT require datasets; data kinds DO", () => {
    expect(validateVisualizationSpec(conceptSpec()).ok).toBe(true);
    const dataSpec = conceptSpec({
      kind: "line",
      encoding: { kind: "line", datasetId: "d0", x: "date", xType: "date", y: ["price_usd"] },
      datasets: [
        {
          id: "d0",
          title: "Series",
          fields: [
            { key: "date", type: "date" },
            { key: "price_usd", type: "currency", unit: "USD" },
          ],
          rows: Array.from({ length: 4 }, (_, i) => ({ date: `2026-11-0${i + 1}`, price_usd: 1 + i })),
        },
      ],
    });
    expect(validateVisualizationSpec(dataSpec).ok).toBe(true);
    const dataSpecNoDataset = conceptSpec({
      kind: "line",
      encoding: { kind: "line", datasetId: "d0", x: "date", xType: "date", y: ["price_usd"] },
    });
    const result = validateVisualizationSpec(dataSpecNoDataset);
    expect(result.ok).toBe(false);
    expect(result.errors[0]).toContain("requires at least one dataset");
  });
});

describe("mindmap validation", () => {
  it("validates a tree mindmap", () => {
    expect(validateVisualizationSpec(conceptSpec()).ok).toBe(true);
  });

  it("rejects more than one root", () => {
    const result = validateVisualizationSpec(
      conceptSpec({
        encoding: {
          kind: "mindmap",
          nodes: [
            { id: "r1", label: "Root one" },
            { id: "r2", label: "Root two" },
          ],
        },
      }),
    );
    expect(result.ok).toBe(false);
    expect(result.errors.join(" ")).toContain("exactly one root");
  });

  it("rejects unknown parents", () => {
    const result = validateVisualizationSpec(
      conceptSpec({
        encoding: {
          kind: "mindmap",
          nodes: [
            { id: "root", label: "Root" },
            { id: "b1", label: "Orphan", parent: "ghost" },
          ],
        },
      }),
    );
    expect(result.ok).toBe(false);
    expect(result.errors.join(" ")).toContain("unknown parent");
  });

  it("rejects parent cycles", () => {
    const cyclic = conceptSpec({
      encoding: {
        kind: "mindmap",
        nodes: [
          { id: "a", label: "A", parent: "b" },
          { id: "b", label: "B", parent: "a" },
        ],
      },
    });
    const cycleResult = validateVisualizationSpec(cyclic);
    expect(cycleResult.ok).toBe(false);
  });

  it("rejects over-deep branches", () => {
    const nodes: Array<{ id: string; label: string; parent?: string }> = [{ id: "root", label: "Root" }];
    let prev = "root";
    for (let i = 0; i <= SPEC_LIMITS.maxMindDepth + 1; i += 1) {
      nodes.push({ id: `n${i}`, label: `Level ${i}`, parent: prev });
      prev = `n${i}`;
    }
    const result = validateVisualizationSpec(conceptSpec({ encoding: { kind: "mindmap", nodes } }));
    expect(result.ok).toBe(false);
    expect(result.errors.join(" ")).toContain("depth exceeds");
  });

  it("rejects duplicate node ids", () => {
    const result = validateVisualizationSpec(
      conceptSpec({
        encoding: {
          kind: "mindmap",
          nodes: [
            { id: "root", label: "Root" },
            { id: "root", label: "Duplicate", parent: "root" },
          ],
        },
      }),
    );
    expect(result.ok).toBe(false);
  });

  it("rejects a mindmap with a single node", () => {
    const result = validateVisualizationSpec(
      conceptSpec({ encoding: { kind: "mindmap", nodes: [{ id: "root", label: "Only" }] } }),
    );
    expect(result.ok).toBe(false);
    expect(result.errors.join(" ")).toContain("at least 2");
  });
});

describe("roadmap validation", () => {
  it("validates phases with items", () => {
    const spec = conceptSpec({
      kind: "roadmap",
      encoding: {
        kind: "roadmap",
        phases: [
          {
            id: "p1",
            label: "Phase 1",
            timeframe: "Q1 2026",
            items: [
              { id: "i1", label: "Ship wallet audit", status: "done" },
              { id: "i2", label: "Launch dashboard" },
            ],
          },
        ],
      },
    });
    expect(validateVisualizationSpec(spec).ok).toBe(true);
  });

  it("rejects duplicate phase ids and item ids", () => {
    const result = validateVisualizationSpec(
      conceptSpec({
        kind: "roadmap",
        encoding: {
          kind: "roadmap",
          phases: [
            { id: "p1", label: "A", items: [{ id: "i1", label: "x" }] },
            { id: "p1", label: "B", items: [{ id: "i1", label: "y" }] },
          ],
        },
      }),
    );
    expect(result.ok).toBe(false);
  });

  it("rejects an invalid status value (closed enum)", () => {
    const result = validateVisualizationSpec({
      ...conceptSpec({ kind: "roadmap" }),
      encoding: {
        kind: "roadmap",
        phases: [{ id: "p1", label: "A", items: [{ id: "i1", label: "x", status: "finished-yesterday" }] }],
      },
    });
    expect(result.ok).toBe(false);
  });
});

describe("decision-tree validation", () => {
  it("validates a tree with a decision node and condition edges", () => {
    const spec = conceptSpec({
      kind: "decision-tree",
      encoding: {
        kind: "decision-tree",
        nodes: [
          { id: "d1", label: "Peg under $0.99?", kind: "decision" },
          { id: "y", label: "Review reserves", kind: "option" },
          { id: "n", label: "Hold", kind: "outcome" },
        ],
        edges: [
          { from: "d1", to: "y", label: "yes" },
          { from: "d1", to: "n", label: "no" },
        ],
      },
    });
    expect(validateVisualizationSpec(spec).ok).toBe(true);
  });

  it("requires at least one decision node", () => {
    const result = validateVisualizationSpec(
      conceptSpec({
        kind: "decision-tree",
        encoding: {
          kind: "decision-tree",
          nodes: [
            { id: "a", label: "A", kind: "option" },
            { id: "b", label: "B", kind: "outcome" },
          ],
          edges: [{ from: "a", to: "b" }],
        },
      }),
    );
    expect(result.ok).toBe(false);
    expect(result.errors.join(" ")).toContain("decision");
  });

  it("rejects edges referencing unknown nodes", () => {
    const result = validateVisualizationSpec(
      conceptSpec({
        kind: "decision-tree",
        encoding: {
          kind: "decision-tree",
          nodes: [
            { id: "d1", label: "Decision", kind: "decision" },
            { id: "b", label: "B" },
          ],
          edges: [{ from: "d1", to: "ghost" }],
        },
      }),
    );
    expect(result.ok).toBe(false);
  });
});

describe("architecture validation", () => {
  it("validates layers with components and connections", () => {
    const spec = conceptSpec({
      kind: "architecture",
      encoding: {
        kind: "architecture",
        layers: [
          { id: "l1", label: "Frontend", components: [{ id: "c1", label: "Chat UI" }] },
          { id: "l2", label: "Backend", components: [{ id: "c2", label: "Firestore" }] },
        ],
        connections: [{ from: "c1", to: "c2", label: "reads" }],
      },
    });
    expect(validateVisualizationSpec(spec).ok).toBe(true);
  });

  it("rejects duplicate component ids across layers", () => {
    const result = validateVisualizationSpec(
      conceptSpec({
        kind: "architecture",
        encoding: {
          kind: "architecture",
          layers: [
            { id: "l1", label: "A", components: [{ id: "c1", label: "X" }] },
            { id: "l2", label: "B", components: [{ id: "c1", label: "Y" }] },
          ],
        },
      }),
    );
    expect(result.ok).toBe(false);
  });

  it("rejects connections referencing unknown components", () => {
    const result = validateVisualizationSpec(
      conceptSpec({
        kind: "architecture",
        encoding: {
          kind: "architecture",
          layers: [{ id: "l1", label: "A", components: [{ id: "c1", label: "X" }] }],
          connections: [{ from: "c1", to: "ghost" }],
        },
      }),
    );
    expect(result.ok).toBe(false);
  });
});

describe("framework validation", () => {
  it("validates a SWOT-style quadrant framework", () => {
    const spec = conceptSpec({
      kind: "framework",
      encoding: {
        kind: "framework",
        layout: "quadrant",
        sections: [
          { id: "s", label: "Strengths", tone: "positive", items: ["Deep liquidity", "Wide listing coverage"] },
          { id: "w", label: "Weaknesses", tone: "negative", items: ["Centralized custody"] },
        ],
      },
    });
    expect(validateVisualizationSpec(spec).ok).toBe(true);
  });

  it("rejects fewer than two sections", () => {
    const result = validateVisualizationSpec(
      conceptSpec({
        kind: "framework",
        encoding: {
          kind: "framework",
          sections: [{ id: "s", label: "Only", items: ["one"] }],
        },
      }),
    );
    expect(result.ok).toBe(false);
  });
});

describe("conceptual provenance & security policy", () => {
  it("an unverified conceptual spec requires an explicit gap note", () => {
    const result = validateVisualizationSpec(conceptSpec({ provenance: "unverified", gaps: [] }));
    expect(result.ok).toBe(false);
    expect(result.errors[0]).toContain("unverified");
    const ok = validateVisualizationSpec(
      conceptSpec({ provenance: "unverified", gaps: ["No citable sources were available (unverified)."] }),
    );
    expect(ok.ok).toBe(true);
  });

  it("rejects javascript: source URLs (no executable surface)", () => {
    const result = validateVisualizationSpec(
      conceptSpec({
        sources: [{ url: "javascript:alert(1)", name: "evil" }],
      }),
    );
    expect(result.ok).toBe(false);
  });

  it("labels are length-capped plain text — oversized labels rejected", () => {
    const result = validateVisualizationSpec(
      conceptSpec({
        encoding: {
          kind: "mindmap",
          nodes: [
            { id: "root", label: "x".repeat(SPEC_LIMITS.maxLabelChars + 1) },
            { id: "b", label: "B", parent: "root" },
          ],
        },
      }),
    );
    expect(result.ok).toBe(false);
  });

  it("survives a persistence round-trip via parseVisualizationSpec", () => {
    const spec = conceptSpec();
    const parsed = parseVisualizationSpec(JSON.parse(JSON.stringify(spec)));
    expect(parsed).not.toBeNull();
    expect(parsed?.kind).toBe("mindmap");
  });

  it("strips unknown encoding keys (no smuggling — injected keys never reach renderers)", () => {
    const smuggled: Record<string, unknown> = JSON.parse(JSON.stringify(conceptSpec()));
    (smuggled.encoding as Record<string, unknown>).injectedScript = "<img onerror=alert(1)>";
    const result = validateVisualizationSpec(smuggled);
    // The spec still validates — the unknown key is STRIPPED, not passed
    // through, so the renderer never sees it.
    expect(result.ok).toBe(true);
    const parsed = parseVisualizationSpec(smuggled)!;
    expect((parsed.encoding as Record<string, unknown>).injectedScript).toBeUndefined();
  });
});

/* gapAnalysis deterministic builder fixtures ------------------------- */

import { buildConceptFromDatasets, assessGaps, buildContextDigest } from "../conceptual/gapAnalysis";
import type { ResearchContext } from "../types";

const structuredRoadmapDataset: ShadowDataset = {
  title: "Launch plan",
  columns: [
    { key: "phase", type: "string" },
    { key: "task", type: "string" },
    { key: "status", type: "string" },
  ],
  rows: [
    { phase: "Phase 1", task: "Security audit", status: "done" },
    { phase: "Phase 1", task: "Beta launch", status: "in-progress" },
    { phase: "Phase 2", task: "Mobile app", status: "planned" },
  ],
};

const emptyContext: ResearchContext = {
  datasets: [],
  citations: [],
  evidence: [],
  provenance: "unverified",
  gaps: [],
  hasNumericData: false,
};

describe("gapAnalysis — deterministic conceptual builders", () => {
  it("builds a roadmap from structured phase/task rows without a model", () => {
    const result = buildConceptFromDatasets(
      { ...emptyContext, datasets: [structuredRoadmapDataset], provenance: "source-verified" },
      { id: "viz-x", title: "Launch roadmap", generatedAt: "2026-11-09T12:00:00Z" },
    );
    expect(result).not.toBeNull();
    expect(result!.spec.kind).toBe("roadmap");
    expect(result!.spec.encoding.kind === "roadmap" && result!.spec.encoding.phases).toBeTruthy();
    expect(result!.spec.provenance).toBe("source-verified");
    expect(validateVisualizationSpec(result!.spec).ok).toBe(true);
  });

  it("returns null for datasets without a conceptual shape", () => {
    const numericOnly: ShadowDataset = {
      title: "Prices",
      columns: [
        { key: "date", type: "date" },
        { key: "price", type: "currency", unit: "USD" },
      ],
      rows: [{ date: "2026-11-01", price: 1.0 }],
    };
    expect(
      buildConceptFromDatasets({ ...emptyContext, datasets: [numericOnly] }, { id: "v", title: "t", generatedAt: "g" }),
    ).toBeNull();
  });
});

describe("gapAnalysis — sufficiency classification", () => {
  it("classifies an empty context without research as cannot-derive", () => {
    const assessment = assessGaps(emptyContext, "Build a roadmap for USDT adoption", false);
    expect(assessment.verdict).toBe("cannot-derive");
    expect(assessment.missing.length).toBeGreaterThan(0);
  });

  it("classifies an empty context with research available as needs-research", () => {
    const assessment = assessGaps(emptyContext, "Build a roadmap for USDT adoption", true);
    expect(assessment.verdict).toBe("needs-research");
    expect(assessment.researchQuery).toBeTruthy();
  });

  it("classifies a matching context as sufficient", () => {
    const context: ResearchContext = {
      ...emptyContext,
      datasets: [structuredRoadmapDataset],
      evidence: [{ messageId: "m1", excerpt: "USDT adoption roadmap phase 1 task security audit beta launch mobile app", priority: "research-data" }],
      provenance: "source-verified",
    };
    const assessment = assessGaps(context, "Show the USDT adoption roadmap", false);
    expect(assessment.verdict).toBe("sufficient");
  });
});

describe("gapAnalysis — context digest", () => {
  it("formats datasets and evidence for prompting", () => {
    const digest = buildContextDigest({ ...emptyContext, datasets: [structuredRoadmapDataset] });
    expect(digest.datasets[0]).toContain("Launch plan");
    expect(digest.datasets[0]).toContain("phase");
  });
});
