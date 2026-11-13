/**
 * Permanent regression tests — P2-2 promotion of the investigation harness
 * (cases B/C/D) plus the P0-2/P0-3 fix behaviours. References:
 * docs/investigation/ShadowTalk_ResearchToViz_Investigation_Report.docx,
 * Sections 5 (Table 2) and 10.
 *
 * Cases covered here:
 *  - B1/B3: session-scoped resolution delivers the USDT context + digest
 *    for a genuinely overlapping request (works as designed);
 *  - B2 (CD-3 fixed): a topic-UNRELATED request is no longer classified
 *    "sufficient" just because a dataset exists somewhere in the session;
 *  - C1: explicit referential request resolves research-data evidence;
 *  - D1 (CD-4 fixed): unrelated plain-text answers are never injected as
 *    grounding into a fresh topic request;
 *  - D2: empty session → no evidence, provenance unverified.
 */
import { describe, expect, it } from "vitest";

import { resolveResearchContext, type ResolveResearchContextInput } from "../contextResolver";
import { assessGaps, buildContextDigest, formatDigestForPrompt } from "../conceptual/gapAnalysis";
import { isReferentialRequest } from "../referential";
import type { ResearchDataBlock, ResolverMessage, ShadowDataset } from "../types";

const USDT_DATASET: ShadowDataset = {
  title: "USDT reserve composition",
  columns: [
    { key: "asset", type: "string" },
    { key: "allocation_pct", type: "number", unit: "%" },
  ],
  rows: [
    { asset: "US Treasuries", allocation_pct: 84 },
    { asset: "Cash equivalents", allocation_pct: 12 },
    { asset: "Other", allocation_pct: 4 },
  ],
  asOf: "2026-10-31",
};

const USDT_BLOCK: ResearchDataBlock = {
  datasets: [USDT_DATASET],
  sources: [{ url: "https://tether.to/usdt-reserve-report-q4", name: "USDT reserve report" }],
  gaps: ["Custodian breakdown not yet captured."],
  capturedAt: "2026-11-13T12:30:00Z",
};

const usdtMessage: ResolverMessage = {
  id: "msg-usdt",
  type: "ai",
  content:
    "USDT exposure research: reserves are concentrated in US Treasuries (84%) and cash equivalents (12%). Allocation decisions depend on whether the peg holds and whether reserve reports are verified.",
  researchData: [USDT_BLOCK],
  citations: [{ url: "https://tether.to/usdt-reserve-report-q4", title: "USDT reserve report" }],
};

const danteMessage: ResolverMessage = {
  id: "msg-dante",
  type: "ai",
  content:
    "Dante Alighieri wrote the Divine Comedy in the early 14th century. The poem has three cantiche: Inferno, Purgatorio and Paradiso.",
};

function resolve(messages: ResolverMessage[], request: string) {
  return resolveResearchContext({ messages, request } as ResolveResearchContextInput);
}

describe("P0-3 / CD-4 — conditional zero-candidate fallback", () => {
  it("D1: never injects unrelated plain text into a topic-specific request", () => {
    const ctx = resolve([danteMessage], "Draw a decision tree for launching a product.");
    expect(ctx.evidence).toHaveLength(0);
    expect(ctx.primaryMessageId).toBeUndefined();
    expect(ctx.citations).toHaveLength(0);
    expect(ctx.provenance).toBe("unverified");
  });

  it("D2: an empty session produces no evidence and unverified provenance", () => {
    const ctx = resolve([], "visualize this research");
    expect(ctx.evidence).toHaveLength(0);
    expect(ctx.datasets).toHaveLength(0);
    expect(ctx.provenance).toBe("unverified");
    expect(ctx.gaps.some((g) => g.includes("No structured research datasets"))).toBe(true);
  });

  it("referential request ('visualize this') still resolves the newest answer", () => {
    const ctx = resolve([danteMessage], "visualize this");
    expect(ctx.evidence).toHaveLength(1);
    expect(ctx.evidence[0].messageId).toBe("msg-dante");
    expect(ctx.evidence[0].priority).toBe("text-match");
  });

  it("a request with zero topic tokens still resolves the newest answer", () => {
    const ctx = resolve([danteMessage], "Show me this visually.");
    expect(ctx.evidence).toHaveLength(1);
    expect(ctx.primaryMessageId).toBe("msg-dante");
  });
});

describe("P0-2 / CD-3 — sufficiency requires genuine topic overlap", () => {
  it("B2: unrelated architecture request is NOT sufficient despite the USDT dataset", () => {
    const ctx = resolve([usdtMessage], "Draw the architecture of a stablecoin data platform.");
    expect(ctx.datasets.length).toBe(1); // research-data messages always resolve
    const assessment = assessGaps(ctx, "Draw the architecture of a stablecoin data platform.", true);
    expect(assessment.verdict).toBe("needs-research");
    expect(assessment.topicOverlap).toBe(false);
    expect(assessment.referential).toBe(false);
  });

  it("B1/B3: overlapping request resolves USDT evidence and the digest carries it", () => {
    const ctx = resolve([usdtMessage], "Show USDT exposure as a decision tree.");
    const assessment = assessGaps(ctx, "Show USDT exposure as a decision tree.", true);
    expect(assessment.verdict).toBe("sufficient");
    expect(assessment.topicOverlap).toBe(true);
    const digest = buildContextDigest(ctx, assessment);
    expect(digest.evidenceMessageIds).toContain("msg-usdt");
    expect(digest.topicOverlap).toBe(true);
    const prompt = formatDigestForPrompt(digest);
    expect(prompt).toContain("USDT reserve composition");
    expect(prompt).toContain("Custodian breakdown not yet captured");
  });

  it("C1: 'decision tree from the previous research' resolves as referential + sufficient", () => {
    const request = "decision tree from the previous research";
    expect(isReferentialRequest(request)).toBe(true);
    const ctx = resolve([usdtMessage], request);
    expect(ctx.evidence[0].priority).toBe("research-data");
    const assessment = assessGaps(ctx, request, true);
    expect(assessment.verdict).toBe("sufficient");
    expect(assessment.referential).toBe(true);
  });

  it("cannot-derive when context exists, topic mismatches and research is unavailable", () => {
    const ctx = resolve([usdtMessage], "Draw the architecture of a stablecoin data platform.");
    const assessment = assessGaps(ctx, "Draw the architecture of a stablecoin data platform.", false);
    expect(assessment.verdict).toBe("cannot-derive");
  });
});

describe("isReferentialRequest — deterministic contract", () => {
  it("explicit references to prior content", () => {
    expect(isReferentialRequest("visualize this research as a mind map")).toBe(true);
    expect(isReferentialRequest("decision tree from the previous research")).toBe(true);
    expect(isReferentialRequest("turn the above data into a chart")).toBe(true);
  });
  it("topic-bearing requests are not referential", () => {
    expect(isReferentialRequest("Draw the architecture of a stablecoin data platform.")).toBe(false);
    expect(isReferentialRequest("decision tree for launching a product")).toBe(false);
  });
});
