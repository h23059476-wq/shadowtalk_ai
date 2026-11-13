/**
 * Permanent regression tests — P2-2 promotion of the investigation harness
 * (case B end-to-end, with a mocked model) plus the P0-2/P0-4/P1-3 pipeline
 * behaviours. References: docs/investigation/…Report.docx, Tables 2–3.
 *
 *  - B4 (CD-3/CD-5 fixed): the unrelated architecture request no longer
 *    produces a card carrying the old USDT source — the flow refuses
 *    honestly (cannot-derive) instead of inheriting the session topic;
 *  - B5 (CD-6 fixed): a model attaching a never-supplied url gets it
 *    dropped at the normalization allowlist;
 *  - P1-3: the spec records WHICH conversation evidence grounded it
 *    (message ids + verdict + topic overlap) in its gaps;
 *  - P0-1 integration: an invalid tree (single branch) is repaired by the
 *    model using the exact gate errors, and the repaired tree ships.
 */
import { describe, expect, it, vi } from "vitest";

import { handleConceptualRequest, type ConceptualPipelineInput } from "../conceptualPipeline";
import type { ResearchDataBlock, ShadowDataset } from "../../types";

const USDT_DATASET: ShadowDataset = {
  title: "USDT reserve composition",
  columns: [
    { key: "asset", type: "string" },
    { key: "allocation_pct", type: "number", unit: "%" },
  ],
  rows: [
    { asset: "US Treasuries", allocation_pct: 84 },
    { asset: "Cash equivalents", allocation_pct: 12 },
  ],
  asOf: "2026-10-31",
};

const USDT_BLOCK: ResearchDataBlock = {
  datasets: [USDT_DATASET],
  sources: [{ url: "https://tether.to/usdt-reserve-report-q4", name: "USDT reserve report" }],
  gaps: [],
  capturedAt: "2026-11-13T12:30:00Z",
};

const usdtSession: ConceptualPipelineInput["messages"] = [
  {
    id: "msg-usdt",
    type: "ai",
    content:
      "USDT exposure research: reserves are concentrated in US Treasuries (84%) and cash equivalents (12%). Allocation decisions depend on whether the peg holds and whether reserve reports are verified.",
    researchData: [USDT_BLOCK],
    citations: [{ url: "https://tether.to/usdt-reserve-report-q4", title: "USDT reserve report" }],
  },
];

const VALID_TREE = {
  kind: "decision-tree",
  title: "USDT exposure decision tree",
  gaps: [],
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
  sources: [
    { url: "https://tether.to/usdt-reserve-report-q4", name: "USDT reserve report" },
    { url: "https://made-up-source.example.org/report.pdf", name: "Fabricated" },
  ],
};

function pipelineInput(over: Partial<ConceptualPipelineInput>): ConceptualPipelineInput {
  return {
    intent: { kind: "create", confidence: 1 },
    request: "visualize this research as a decision tree",
    messages: usdtSession,
    ...over,
  };
}

describe("B4 / CD-3+CD-5 fixed — no cross-request provenance carry-over", () => {
  it("an unrelated architecture request refuses honestly instead of shipping the USDT source", async () => {
    const model = vi.fn();
    const outcome = await handleConceptualRequest(
      pipelineInput({
        request: "Draw the architecture of a stablecoin data platform.",
        model,
      }),
    );
    expect(outcome.kind).toBe("text");
    expect(outcome.content).toMatch(/can't build|honestly/i);
    expect(model).not.toHaveBeenCalled(); // never reaches generation
  });
});

describe("B5 / CD-6 fixed — allowlist end-to-end + P1-3 grounding trace", () => {
  it("drops the fabricated source and records the grounding evidence ids", async () => {
    const model = vi.fn().mockResolvedValue({ content: JSON.stringify(VALID_TREE) });
    const outcome = await handleConceptualRequest(pipelineInput({ model }));
    expect(outcome.kind).toBe("spec");
    if (outcome.kind !== "spec") throw new Error("expected a spec outcome");
    const spec = outcome.spec;
    expect(spec.sources.map((s) => s.url)).toEqual(["https://tether.to/usdt-reserve-report-q4"]);
    expect(spec.gaps.join(" ")).toContain("not supplied in the prompt");
    // P1-3: context provenance is inspectable on the card.
    expect(spec.gaps.join(" ")).toMatch(/Grounded in conversation message\(s\) msg-usdt/);
    expect(spec.gaps.join(" ")).toContain("context verdict: sufficient");
    // Citations for the message chips mirror the (filtered) spec sources.
    expect(outcome.citations?.map((c) => c.url)).toEqual(["https://tether.to/usdt-reserve-report-q4"]);
  });
});

describe("P0-1 integration — invalid tree triggers the repair round", () => {
  it("single-branch tree is rejected first, repaired with the gate errors, then ships", async () => {
    const broken = {
      ...VALID_TREE,
      edges: VALID_TREE.edges.filter((e) => !(e.from === "peg" && e.to === "hold")),
      sources: VALID_TREE.sources.slice(0, 1),
    };
    const model = vi
      .fn()
      .mockResolvedValueOnce({ content: JSON.stringify(broken) })
      .mockResolvedValueOnce({ content: JSON.stringify({ ...VALID_TREE, sources: VALID_TREE.sources.slice(0, 1) }) });
    const outcome = await handleConceptualRequest(pipelineInput({ model }));
    expect(model).toHaveBeenCalledTimes(2);
    const repairPrompt = model.mock.calls[1][0].user as string;
    expect(repairPrompt).toContain("failed validation");
    expect(repairPrompt).toContain(`decision node "peg" has 1 outgoing edge(s)`);
    expect(outcome.kind).toBe("spec");
  });
});
