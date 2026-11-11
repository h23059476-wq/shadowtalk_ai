/**
 * Batch 3 — AI-assisted conceptual pipeline tests (model & research mocked).
 * Covers: gap-driven create flow (deterministic-first, research fallback,
 * honest refusal), model candidate → validation gate (invalid candidates
 * NEVER render), one repair round, provenance policy, refinement ops
 * (deterministic simplify, explain-stages, model edits), referenced-spec
 * resolution, and BYOK-absence degradation.
 */

import { describe, it, expect, vi } from "vitest";
import { handleConceptualRequest, resolveReferencedSpec, pruneConceptSpec } from "../conceptual/conceptualPipeline";
import { extractJsonCandidate, validateConceptCandidate, normalizeConceptCandidate } from "../conceptual/modelBridge";
import { detectConceptRefineOp } from "../conceptual/refineOps";
import { explainConceptual } from "../conceptual/conceptExplain";
import type { ConceptModelCall } from "../conceptual/modelBridge";
import type { PipelineMessage } from "../chatPipeline";
import type { VisualizationSpec } from "../spec";
import { validateVisualizationSpec } from "../spec";

/* Fixtures ------------------------------------------------------------ */

const MINDMAP_CANDIDATE = {
  kind: "mindmap",
  title: "USDT market mind map",
  description: "Structure of the researched USDT market",
  layout: "radial",
  nodes: [
    { id: "root", label: "USDT market" },
    { id: "adoption", label: "Adoption", parent: "root" },
    { id: "risks", label: "Risks", parent: "root" },
    { id: "regulation", label: "Regulation", parent: "risks" },
  ],
  gaps: ["Reserve composition not covered by the captured research."],
  sources: [{ url: "https://example.com/usdt", name: "Example research" }],
};

const RESEARCH_MESSAGES: PipelineMessage[] = [
  {
    id: "m1",
    type: "user",
    content: "Research the current USDT market",
  },
  {
    id: "m2",
    type: "ai",
    content: "USDT research: adoption is broad, risks include regulatory pressure.",
    citations: [{ url: "https://example.com/usdt", title: "Example research" }],
    researchData: [
      {
        datasets: [
          {
            title: "USDT market overview",
            columns: [
              { key: "topic", type: "string" },
              { key: "detail", type: "string" },
            ],
            rows: [
              { topic: "USDT market", detail: "adoption" },
              { topic: "Risks", detail: "regulatory pressure" },
            ],
          },
        ],
        sources: [{ url: "https://example.com/usdt", name: "Example research" }],
        gaps: [],
        capturedAt: "2026-11-09T12:00:00Z",
      },
    ],
  },
];

function specMessage(spec: VisualizationSpec): PipelineMessage {
  return { id: "m3", type: "ai", content: "diagram", visualization: spec };
}

function modelReturning(candidate: unknown, failFirst = false): ConceptModelCall & { calls: number } {
  const state = { calls: 0 };
  const call = (async () => {
    state.calls += 1;
    if (failFirst && state.calls === 1) {
      return { content: JSON.stringify({ kind: "nonsense-kind", nodes: [] }) };
    }
    return { content: JSON.stringify(candidate) };
  }) as unknown as ConceptModelCall & { calls: number };
  Object.defineProperty(call, "calls", { get: () => state.calls });
  return call;
}

const BASE_INPUT = {
  intent: { kind: "create" as const, requestedType: "mindmap" as const, confidence: 0.9 },
  request: "visualize this research as a mind map",
  messages: RESEARCH_MESSAGES,
  now: new Date("2026-11-09T12:00:00Z"),
};

/* modelBridge --------------------------------------------------------- */

describe("modelBridge", () => {
  it("extracts JSON from fenced and prose-wrapped output", () => {
    expect(extractJsonCandidate('```json\n{"a":1}\n```')).toEqual({ a: 1 });
    expect(extractJsonCandidate('Here you go: {"a":1} — done.')).toEqual({ a: 1 });
    expect(extractJsonCandidate("no json at all")).toBeNull();
  });

  it("normalizes kind synonyms and caps sizes", () => {
    const normalized = normalizeConceptCandidate({
      kind: "mind map",
      title: "x".repeat(500),
      nodes: [
        { id: "root", label: "R" },
        { id: "b", label: "B", parent: "root" },
      ],
    });
    expect(normalized?.kind).toBe("mindmap");
    expect(normalized?.title.length).toBeLessThanOrEqual(160);
  });

  it("rejects candidates that cannot become a supported kind", () => {
    expect(validateConceptCandidate({ kind: "spreadsheet" }).ok).toBe(false);
    expect(validateConceptCandidate("not an object").ok).toBe(false);
  });

  it("drops non-http(s) source urls from candidates", () => {
    const validation = validateConceptCandidate(MINDMAP_CANDIDATE, { generatedAt: "2026-11-09T12:00:00Z" });
    expect(validation.ok).toBe(true);
    const candidateSources = (JSON.parse(JSON.stringify(validation.spec)) as VisualizationSpec).sources;
    expect(candidateSources.every((s) => /^https?:/i.test(s.url))).toBe(true);
  });
});

/* create flow ---------------------------------------------------------- */

describe("conceptual create flow", () => {
  it("generates a validated mindmap from the research context (model-assisted)", async () => {
    const model = modelReturning(MINDMAP_CANDIDATE);
    const outcome = await handleConceptualRequest({ ...BASE_INPUT, model });
    expect(outcome.kind).toBe("spec");
    expect(outcome.spec?.kind).toBe("mindmap");
    // Provenance: sources attached → ai-extracted (labelled), never source-verified.
    expect(outcome.spec?.provenance).toBe("ai-extracted");
    expect(outcome.spec?.gaps.join(" ")).toContain("synthesized by the model");
    // Citations flow to the message chips.
    expect(outcome.citations?.[0]?.url).toBe("https://example.com/usdt");
  });

  it("repairs an invalid first candidate with the validation errors", async () => {
    const model = modelReturning(MINDMAP_CANDIDATE, true);
    const outcome = await handleConceptualRequest({ ...BASE_INPUT, model });
    expect(outcome.kind).toBe("spec");
    expect(model.calls).toBeGreaterThanOrEqual(2);
  });

  it("refuses honestly when the model keeps returning invalid candidates", async () => {
    const model: ConceptModelCall = async () => ({
      content: JSON.stringify({ kind: "mindmap", nodes: [{ id: "only", label: "one node" }] }),
    });
    const outcome = await handleConceptualRequest({ ...BASE_INPUT, model });
    expect(outcome.kind).toBe("text");
    expect(outcome.content).toContain("validation");
    expect(outcome.content).not.toMatch(/\*\*USDT market mind map\*\*/);
  });

  it("degrades honestly when no BYOK model call is available", async () => {
    const outcome = await handleConceptualRequest(BASE_INPUT);
    expect(outcome.kind).toBe("text");
    expect(outcome.content).toContain("BYOK");
  });

  it("prefers the deterministic builder when structured research data exists", async () => {
    const structured: PipelineMessage[] = [
      {
        id: "u1",
        type: "user",
        content: "plan the launch",
      },
      {
        id: "a1",
        type: "ai",
        content: "launch plan captured",
        researchData: [
          {
            datasets: [
              {
                title: "Launch plan",
                columns: [
                  { key: "phase", type: "string" },
                  { key: "task", type: "string" },
                ],
                rows: [
                  { phase: "Phase 1", task: "Audit" },
                  { phase: "Phase 2", task: "Beta" },
                ],
              },
            ],
            sources: [{ url: "https://example.com/plan", name: "Plan" }],
            gaps: [],
            capturedAt: "2026-11-09T12:00:00Z",
          },
        ],
      },
    ];
    const model = vi.fn();
    const outcome = await handleConceptualRequest({
      ...BASE_INPUT,
      intent: { kind: "create", requestedType: "roadmap", confidence: 0.9 },
      request: "visualize the launch plan as a roadmap",
      messages: structured,
      model: model as unknown as ConceptModelCall,
    });
    expect(outcome.kind).toBe("spec");
    expect(outcome.spec?.kind).toBe("roadmap");
    expect(model).not.toHaveBeenCalled();
    // Deterministic derivation from structured research data → the context
    // provenance (source-verified) is preserved; no model synthesis note.
    expect(outcome.spec?.provenance).toBe("source-verified");
    expect(outcome.spec?.gaps.join(" ")).not.toContain("synthesized by the model");
  });

  it("reports cannot-derive honestly when there is no context and no research", async () => {
    const outcome = await handleConceptualRequest({
      ...BASE_INPUT,
      messages: [{ id: "u", type: "user", content: "visualize the Q3 budget as a mind map" }],
    });
    expect(outcome.kind).toBe("text");
    expect(outcome.content).toContain("can't build");
    expect(outcome.content).toContain("don't fabricate");
  });

  it("runs gap-driven research and merges citations when context is missing", async () => {
    const research = vi.fn().mockResolvedValue({
      content: "USDT adoption research findings",
      citations: [{ url: "https://example.com/found", title: "Found research" }],
    });
    const model = modelReturning(MINDMAP_CANDIDATE);
    const outcome = await handleConceptualRequest({
      ...BASE_INPUT,
      messages: [{ id: "u", type: "user", content: "visualize the USDT market as a mind map" }],
      model,
      research,
    });
    expect(research).toHaveBeenCalled();
    expect(outcome.kind).toBe("spec");
    expect(outcome.spec?.gaps.join(" ")).toContain("Additional research");
  });

  it("reports research failure as an explicit limitation, not fabricated data", async () => {
    const research = vi.fn().mockRejectedValue(new Error("offline"));
    const model = modelReturning(MINDMAP_CANDIDATE);
    const outcome = await handleConceptualRequest({
      ...BASE_INPUT,
      messages: [{ id: "u", type: "user", content: "visualize the USDT market as a mind map" }],
      model,
      research,
    });
    expect(outcome.kind).toBe("spec");
    expect(outcome.spec?.gaps.join(" ")).toContain("research failed");
  });
});

/* refine flow ---------------------------------------------------------- */

const EXISTING_MINDMAP: VisualizationSpec = {
  version: 1,
  id: "viz-existing",
  kind: "mindmap",
  title: "USDT market mind map",
  datasets: [],
  encoding: {
    kind: "mindmap",
    layout: "tree",
    nodes: [
      { id: "root", label: "USDT market" },
      { id: "adoption", label: "Adoption", parent: "root" },
      { id: "risks", label: "Risks", parent: "root" },
      { id: "r1", label: "Regulation", parent: "risks" },
      { id: "r2", label: "Depeg events", parent: "risks" },
    ],
  },
  provenance: "ai-extracted",
  sources: [{ url: "https://example.com/usdt", name: "Example research" }],
  generatedAt: "2026-11-09T11:00:00Z",
  gaps: ["Diagram structure synthesized by the model."],
};

describe("conceptual refine flow", () => {
  it("explains every stage deterministically (no model call)", async () => {
    const model = vi.fn();
    const outcome = await handleConceptualRequest({
      ...BASE_INPUT,
      intent: { kind: "refine", confidence: 0.9 },
      request: "Explain every stage.",
      messages: [...RESEARCH_MESSAGES, specMessage(EXISTING_MINDMAP)],
      model: model as unknown as ConceptModelCall,
    });
    expect(outcome.kind).toBe("text");
    expect(outcome.content).toContain("USDT market");
    expect(outcome.content).toContain("Adoption");
    expect(model).not.toHaveBeenCalled();
  });

  it("simplifies deterministically without a model", async () => {
    const outcome = await handleConceptualRequest({
      ...BASE_INPUT,
      intent: { kind: "refine", confidence: 0.9 },
      request: "Simplify this for beginners.",
      messages: [...RESEARCH_MESSAGES, specMessage(EXISTING_MINDMAP)],
    });
    expect(outcome.kind).toBe("spec");
    const enc = outcome.spec?.encoding as { nodes?: Array<{ label: string }> } | undefined;
    const nodes = enc?.nodes ?? [];
    // Prune keeps depth ≤ 2 and caps children — Regulation/Depeg survive at depth 2.
    expect(nodes.length).toBeLessThanOrEqual((EXISTING_MINDMAP.encoding as unknown as { nodes: unknown[] }).nodes.length);
    expect(outcome.spec?.gaps.join(" ")).toContain("Simplified");
  });

  it("edits the diagram via the model for add-branch and re-validates", async () => {
    const edited = JSON.parse(JSON.stringify(EXISTING_MINDMAP)) as VisualizationSpec;
    edited.encoding = {
      kind: "mindmap",
      layout: "tree",
      nodes: [
        ...(edited.encoding as unknown as { nodes: Array<{ id: string; label: string; parent?: string }> }).nodes,
        { id: "liquidity", label: "Liquidity depth", parent: "root" },
      ],
    };
    const model = modelReturning(edited);
    const outcome = await handleConceptualRequest({
      ...BASE_INPUT,
      intent: { kind: "refine", confidence: 0.9 },
      request: "Add another branch about liquidity depth.",
      messages: [...RESEARCH_MESSAGES, specMessage(EXISTING_MINDMAP)],
      model,
    });
    expect(outcome.kind).toBe("spec");
    const enc2 = outcome.spec?.encoding as { nodes?: Array<{ label: string }> } | undefined;
    expect((enc2?.nodes ?? []).some((n) => n.label === "Liquidity depth")).toBe(true);
    expect(outcome.spec?.gaps.join(" ")).toContain("Edited:");
  });

  it("keeps the original diagram when the model edit fails validation", async () => {
    const model: ConceptModelCall = async () => ({
      content: JSON.stringify({ kind: "mindmap", title: "Broken", nodes: [{ id: "x", label: "orphan", parent: "ghost" }] }),
    });
    const outcome = await handleConceptualRequest({
      ...BASE_INPUT,
      intent: { kind: "refine", confidence: 0.9 },
      request: "Add another branch.",
      messages: [...RESEARCH_MESSAGES, specMessage(EXISTING_MINDMAP)],
      model,
    });
    expect(outcome.kind).toBe("text");
    expect(outcome.content).toContain("validation");
  });

  it("refuses conceptual ops on a data chart honestly and suggests conversion", async () => {
    const dataSpec: VisualizationSpec = {
      version: 1,
      id: "viz-data",
      kind: "bar",
      title: "Prices",
      datasets: [
        {
          id: "d0",
          title: "Prices",
          fields: [
            { key: "date", type: "date" },
            { key: "price", type: "currency", unit: "USD" },
          ],
          rows: [
            { date: "2026-11-01", price: 1 },
            { date: "2026-11-02", price: 1.1 },
            { date: "2026-11-03", price: 1.2 },
          ],
        },
      ],
      encoding: { kind: "bar", datasetId: "d0", x: "date", xType: "date", y: ["price"] },
      provenance: "source-verified",
      sources: [],
      generatedAt: "2026-11-09T11:00:00Z",
      gaps: [],
    };
    const outcome = await handleConceptualRequest({
      ...BASE_INPUT,
      intent: { kind: "refine", confidence: 0.9 },
      request: "Make this more detailed.",
      messages: [...RESEARCH_MESSAGES, specMessage(dataSpec)],
    });
    expect(outcome.kind).toBe("text");
    expect(outcome.content).toContain("turn this into a mind map");
  });

  it("tells the user what to ask when the instruction is not an op", async () => {
    const outcome = await handleConceptualRequest({
      ...BASE_INPUT,
      intent: { kind: "refine", confidence: 0.9 },
      request: "hmm interesting",
      messages: [...RESEARCH_MESSAGES, specMessage(EXISTING_MINDMAP)],
    });
    expect(outcome.kind).toBe("text");
    expect(outcome.content).toContain("Tell me what to change");
  });

  it("reports no existing visualization honestly", async () => {
    const outcome = await handleConceptualRequest({
      ...BASE_INPUT,
      intent: { kind: "refine", confidence: 0.9 },
      request: "Add another branch.",
      messages: RESEARCH_MESSAGES,
    });
    expect(outcome.kind).toBe("text");
    expect(outcome.content).toContain("no visualization");
  });
});

/* referenced-spec resolution + op detection + prune --------------------- */

describe("resolveReferencedSpec", () => {
  it("returns the most recent spec by default", () => {
    const newer = { ...EXISTING_MINDMAP, id: "viz-newer", kind: "roadmap" as const, encoding: { kind: "roadmap" as const, phases: [{ id: "p1", label: "P", items: [{ id: "i", label: "I" }] }] } };
    const messages = [...RESEARCH_MESSAGES, specMessage(EXISTING_MINDMAP), specMessage(newer)];
    expect(resolveReferencedSpec(messages, "make it more detailed")?.id).toBe("viz-newer");
  });

  it("prefers the spec whose kind is named in the request", () => {
    const newer = { ...EXISTING_MINDMAP, id: "viz-newer", kind: "roadmap" as const, encoding: { kind: "roadmap" as const, phases: [{ id: "p1", label: "P", items: [{ id: "i", label: "I" }] }] } };
    const messages = [...RESEARCH_MESSAGES, specMessage(EXISTING_MINDMAP), specMessage(newer)];
    expect(resolveReferencedSpec(messages, "change the mindmap")?.id).toBe("viz-existing");
  });
});

describe("detectConceptRefineOp — precision", () => {
  it("classifies all eight example instructions", () => {
    expect(detectConceptRefineOp("Make this more detailed.")?.op).toBe("expand");
    expect(detectConceptRefineOp("Add another branch.")?.op).toBe("add-branch");
    expect(detectConceptRefineOp("Turn this into a decision tree.")?.op).toBe("convert");
    expect(detectConceptRefineOp("Turn this into a decision tree.")?.targetKind).toBe("decision-tree");
    expect(detectConceptRefineOp("Make it a professional business roadmap.")?.op).toBe("convert");
    expect(detectConceptRefineOp("Show dependencies between these steps.")?.op).toBe("dependencies");
    expect(detectConceptRefineOp("Explain every stage.")?.op).toBe("explain-stages");
    expect(detectConceptRefineOp("Simplify this for beginners.")?.op).toBe("simplify");
    expect(detectConceptRefineOp("Convert this into a presentation-style visual.")?.op).toBe("presentation");
  });

  it("extracts the subject of an add request", () => {
    expect(detectConceptRefineOp("Add a branch about regulatory risk.")?.subject).toContain("regulatory risk");
  });

  it("does NOT hijack normal chat questions", () => {
    expect(detectConceptRefineOp("What are the dependencies of USDT on the banking system?")).toBeNull();
    expect(detectConceptRefineOp("I'm a beginner, explain stablecoins")).toBeNull();
    expect(detectConceptRefineOp("Give me a detailed explanation of the USDT market")).toBeNull();
    expect(detectConceptRefineOp(null as unknown as string)).toBeNull();
  });
});

describe("pruneConceptSpec", () => {
  it("keeps the tree valid and marks the simplification", () => {
    const pruned = pruneConceptSpec(EXISTING_MINDMAP);
    expect(pruned).not.toBeNull();
    const validation = validateVisualizationSpec(pruned!);
    expect(validation.ok).toBe(true);
    expect(pruned!.gaps.join(" ")).toContain("Simplified");
  });
});

describe("explainConceptual", () => {
  it("narrates structure without inventing content", () => {
    const text = explainConceptual(EXISTING_MINDMAP);
    expect(text).toContain("USDT market");
    expect(text).toContain("Adoption");
    expect(text).toContain("2 sub-branches");
    // It must not contain a node that isn't in the spec.
    expect(text).not.toContain("Moon base");
  });
});
