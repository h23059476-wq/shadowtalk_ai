/**
 * Batch 1 (Research-to-Visualization) — ResearchContextResolver contract.
 *
 * Pins the answer to the core Phase-1 question: "turn your previous research
 * into a chart" must resolve prior research from the FULL session WITHOUT
 * re-researching, prioritizing structured shadowdata > research tools >
 * citations > text match, and must report provenance + gaps honestly.
 */

import { describe, it, expect } from "vitest";
import { resolveResearchContext } from "../contextResolver";
import type { ResolverMessage } from "../types";

function usdtResearchDataMessage(id: string, overrides: Partial<ResolverMessage> = {}): ResolverMessage {
  return {
    id,
    type: "ai",
    content: "USDT market research: price, market capitalization and volume overview.",
    toolExecution: { tool: "deep_research", status: "completed" },
    researchData: [
      {
        datasets: [
          {
            title: "USDT Market Snapshot",
            columns: [
              { key: "metric", type: "string" },
              { key: "value", type: "currency", currency: "USD" },
            ],
            rows: [
              { metric: "price", value: 1.0001 },
              { metric: "market_cap", value: 140_000_000_000 },
            ],
            asOf: "2026-11-09T12:00:00Z",
          },
        ],
        sources: [{ url: "https://www.coingecko.com/en/cards/tether", name: "CoinGecko" }],
        gaps: ["historical 30-day prices not available"],
        capturedAt: "2026-11-09T12:00:00Z",
      },
    ],
    ...overrides,
  };
}

describe("ResearchContextResolver — prioritization contract", () => {
  it("prefers the structured research-data message over plain text matches", () => {
    const messages: ResolverMessage[] = [
      { id: "u1", type: "user", content: "Research the current USDT market." },
      { id: "ai-text", type: "ai", content: "USDT is a stablecoin pegged to the US dollar with wide market usage." },
      usdtResearchDataMessage("ai-research"),
    ];
    const ctx = resolveResearchContext({ messages, request: "show this as a chart" });
    expect(ctx.primaryMessageId).toBe("ai-research");
    expect(ctx.evidence[0].priority).toBe("research-data");
    expect(ctx.datasets).toHaveLength(1);
    expect(ctx.datasets[0].rows).toHaveLength(2);
  });

  it("uses keyword relevance to pick the RIGHT research among several", () => {
    const messages: ResolverMessage[] = [
      usdtResearchDataMessage("ai-usdt"),
      usdtResearchDataMessage("ai-btc", { content: "BTC market research: bitcoin dominance and volume." }),
    ];
    const ctx = resolveResearchContext({
      messages,
      request: "visualize the USDT data",
    });
    expect(ctx.primaryMessageId).toBe("ai-usdt");
  });

  it("falls back to the newest AI message when the request has no keywords at all", () => {
    const messages: ResolverMessage[] = [
      { id: "ai-old", type: "ai", content: "Earlier discussion about the weather." },
      { id: "ai-new", type: "ai", content: "The latest answer with some numbers in it." },
    ];
    const ctx = resolveResearchContext({ messages, request: "show me this visually" });
    expect(ctx.primaryMessageId).toBe("ai-new");
    expect(ctx.provenance).toBe("unverified");
  });

  it("ignores user messages as evidence", () => {
    const messages: ResolverMessage[] = [
      { id: "u1", type: "user", content: "USDT market data USDT USDT" },
    ];
    const ctx = resolveResearchContext({ messages, request: "USDT" });
    expect(ctx.evidence).toHaveLength(0);
    expect(ctx.primaryMessageId).toBeUndefined();
  });
});

describe("ResearchContextResolver — provenance contract (D3)", () => {
  it("marks source-verified when a captured block carries sources", () => {
    const ctx = resolveResearchContext({
      messages: [usdtResearchDataMessage("ai-research")],
      request: "chart it",
    });
    expect(ctx.provenance).toBe("source-verified");
    expect(ctx.hasNumericData).toBe(true);
  });

  it("marks ai-extracted when only citations exist (no structured block)", () => {
    const ctx = resolveResearchContext({
      messages: [
        {
          id: "ai-cited",
          type: "ai",
          content: "USDT trades near its peg according to sources.",
          citations: [{ url: "https://example.com/usdt" }],
        },
      ],
      request: "visualize USDT",
    });
    expect(ctx.provenance).toBe("ai-extracted");
    expect(ctx.datasets).toHaveLength(0);
    expect(ctx.hasNumericData).toBe(false);
    expect(ctx.citations).toHaveLength(1);
  });

  it("marks unverified when there is no source evidence at all", () => {
    const ctx = resolveResearchContext({
      messages: [{ id: "ai-plain", type: "ai", content: "USDT numbers from memory." }],
      request: "USDT",
    });
    expect(ctx.provenance).toBe("unverified");
  });

  it("surfaces declared gaps plus derived gaps instead of filling them", () => {
    const ctx = resolveResearchContext({
      messages: [usdtResearchDataMessage("ai-research")],
      request: "chart it",
    });
    expect(ctx.gaps).toContain("historical 30-day prices not available");
    // Citations exist via block sources → no "no sources" derived gap.
    expect(ctx.gaps.some((g) => g.startsWith("No source URLs"))).toBe(false);
  });

  it("derives explicit gaps when nothing usable was captured", () => {
    const ctx = resolveResearchContext({
      messages: [{ id: "ai-plain", type: "ai", content: "Hello." }],
      request: "chart",
    });
    expect(ctx.gaps.some((g) => g.includes("No structured research datasets"))).toBe(true);
    expect(ctx.gaps.some((g) => g.includes("No source URLs"))).toBe(true);
  });
});

describe("ResearchContextResolver — determinism and caps", () => {
  it("dedupes citations by URL and respects the cap", () => {
    const ctx = resolveResearchContext({
      messages: [
        {
          id: "ai-cited",
          type: "ai",
          content: "Research with repeated citations.",
          citations: [
            { url: "https://a.example/1" },
            { url: "https://a.example/1", title: "dup" },
            { url: "https://b.example/2" },
          ],
        },
      ],
      request: "chart",
    });
    expect(ctx.citations).toHaveLength(2);
  });

  it("breaks ties newest-first within the same priority class", () => {
    const older = usdtResearchDataMessage("ai-older");
    const newer = usdtResearchDataMessage("ai-newer");
    const ctx = resolveResearchContext({ messages: [older, newer], request: "show as chart" });
    expect(ctx.primaryMessageId).toBe("ai-newer");
  });
});
