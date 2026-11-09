/**
 * Batch 2 — CRITICAL end-to-end scenario test (the exact conversation from
 * the Batch 2 spec):
 *
 *   1. "Research the current USDT market."   → research reply w/ sources
 *   2. "Show me this visually."              → chart rendered from research
 *   3. "Make it a dashboard."                → KPI dashboard transform
 *   4. "Compare USDT with USDC."             → live comparison, sources kept
 *   5. "Explain this chart."                 → explains the ACTUAL dataset
 *   6. Snapshot-only + "last 30 days"        → real history or explicit refusal
 *
 * The chat pipeline runs true end-to-end: real intent detector, real context
 * resolver, real planner, real market-data adapter — with only the network
 * (global fetch) mocked.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SHADOWDATA_LANGUAGE, extractResearchDataBlocks } from "../dataDoc";
import { detectVisualizationIntent } from "../intentDetector";
import {
  handleVisualizationRequest,
  lastVisualizationSpec,
  type PipelineMessage,
} from "../chatPipeline";
import { __resetMarketDataStateForTests } from "@/lib/marketData";
import { detectToolSync } from "@/hooks/useToolOrchestrator";

/* ------------------------------------------------------------------ */
/* Network fixtures                                                    */
/* ------------------------------------------------------------------ */

const fetchMock = vi.fn();

function jsonResponse(status: number, body: unknown, headers: Record<string, string> = {}) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: (k: string) => headers[k.toLowerCase()] ?? null },
    json: async () => body,
  };
}

const usdtQuote = {
  tether: {
    usd: 1.0001,
    usd_24h_change: 0.02,
    usd_market_cap: 180_500_000_000,
    usd_24h_vol: 90_000_000_000,
    last_updated_at: 1_760_000_000,
  },
};

const usdcQuote = {
  "usd-coin": {
    usd: 0.9999,
    usd_24h_change: -0.01,
    usd_market_cap: 75_200_000_000,
    usd_24h_vol: 12_000_000_000,
    last_updated_at: 1_760_000_100,
  },
};

const history30 = {
  prices: Array.from({ length: 31 }, (_, i) => [(1_757_000_000 + i * 86_400) * 1000, 1.0002 - i * 0.000001]),
};

/** The research reply the deep_research tool would produce (shadowdata contract). */
const RESEARCH_CONTENT = `### USDT market research

Tether (USDT) trades near its dollar peg. Current market capitalization is approximately $180.5B with 24h volume around $90B.

\`\`\`${SHADOWDATA_LANGUAGE}
{
  "datasets": [{
    "title": "USDT market overview",
    "description": "Snapshot from cited sources",
    "columns": [
      {"key": "date", "type": "date"},
      {"key": "price_usd", "type": "currency", "unit": "USD"},
      {"key": "market_cap_usd", "type": "currency", "unit": "USD"},
      {"key": "volume_24h_usd", "type": "currency", "unit": "USD"}
    ],
    "rows": [
      {"date": "2026-11-09T00:00:00Z", "price_usd": 1.0001, "market_cap_usd": 180500000000, "volume_24h_usd": 90000000000},
      {"date": "2026-11-08T00:00:00Z", "price_usd": 1.0000, "market_cap_usd": 180100000000, "volume_24h_usd": 88000000000},
      {"date": "2026-11-07T00:00:00Z", "price_usd": 0.9999, "market_cap_usd": 179800000000, "volume_24h_usd": 85000000000},
      {"date": "2026-11-06T00:00:00Z", "price_usd": 0.9998, "market_cap_usd": 179400000000, "volume_24h_usd": 84000000000},
      {"date": "2026-11-05T00:00:00Z", "price_usd": 0.9997, "market_cap_usd": 179000000000, "volume_24h_usd": 83000000000}
    ],
    "asOf": "2026-11-09T00:00:00Z"
  }],
  "sources": [
    {"url": "https://www.coingecko.com/en/coins/tether", "name": "CoinGecko — Tether", "retrievedAt": "2026-11-09T12:00:00Z", "dataTimestamp": "2026-11-09T00:00:00Z"},
    {"url": "https://coinmarketcap.com/currencies/tether/", "name": "CoinMarketCap — Tether", "retrievedAt": "2026-11-09T12:00:00Z"}
  ],
  "gaps": ["30-day historical volume unavailable from the cited sources."]
}
\`\`\``;

function researchMessages(): PipelineMessage[] {
  // Mirror the real ChatbotPage capture: shadowdata fences are extracted
  // deterministically (Batch 1 layer) and attached to the message.
  const blocks = extractResearchDataBlocks(RESEARCH_CONTENT).blocks;
  expect(blocks.length).toBe(1);
  return [
    { id: "u1", type: "user", content: "Research the current USDT market." },
    {
      id: "a1",
      type: "ai",
      content: RESEARCH_CONTENT,
      toolExecution: { tool: "deep_research", status: "completed" },
      researchData: blocks,
      citations: [
        { url: "https://www.coingecko.com/en/coins/tether", title: "CoinGecko — Tether" },
        { url: "https://coinmarketcap.com/currencies/tether/", title: "CoinMarketCap — Tether" },
      ],
    },
  ];
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal("fetch", fetchMock);
  __resetMarketDataStateForTests();
  fetchMock.mockReset();
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

async function settle<T>(promise: Promise<T>, ms = 20_000): Promise<T> {
  const state: { v?: T; e?: unknown; done?: boolean } = {};
  void promise.then(
    (v) => {
      state.v = v;
      state.done = true;
    },
    (e) => {
      state.e = e;
      state.done = true;
    },
  );
  await vi.advanceTimersByTimeAsync(ms);
  if (!state.done) throw new Error("settle: operation did not finish in the allotted fake time");
  if (state.e !== undefined) throw state.e;
  return state.v as T;
}

/* ------------------------------------------------------------------ */

describe("E2E — the USDT conversation", () => {
  it("step 0: 'Research the current USDT market.' routes to deep_research", () => {
    const detection = detectToolSync("Research the current USDT market.");
    expect(detection.tool).toBe("deep_research");
    expect(detection.autoExecute).toBe(true);
  });

  it("step 1: 'Show me this visually.' renders the researched data without re-researching", async () => {
    const intent = detectVisualizationIntent("Show me this visually.");
    expect(intent?.kind).toBe("create");
    const outcome = await settle(handleVisualizationRequest({ intent: intent!, request: "Show me this visually.", messages: researchMessages() }));
    expect(outcome.kind).toBe("spec");
    const spec = outcome.spec!;
    expect(spec.kind).toBe("line"); // dated series → line
    expect(spec.provenance).toBe("source-verified");
    expect(spec.datasets[0].rows).toHaveLength(5);
    expect(spec.sources.map((s) => s.url)).toContain("https://www.coingecko.com/en/coins/tether");
    expect(spec.asOf).toBe("2026-11-09T00:00:00Z");
    expect(outcome.citations?.length).toBeGreaterThan(0);
    // The pipeline never called the network — the research was reused.
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("step 2: 'Make it a dashboard.' transforms the visualization", async () => {
    const first = await settle(handleVisualizationRequest({
      intent: detectVisualizationIntent("Show me this visually.")!,
      request: "Show me this visually.",
      messages: researchMessages(),
    }));
    const messages: PipelineMessage[] = [...researchMessages(), { id: "a2", type: "ai", content: first.content, visualization: first.spec }];
    const intent = detectVisualizationIntent("Make it a dashboard.");
    expect(intent?.kind).toBe("create");
    const outcome = await settle(handleVisualizationRequest({ intent: intent!, request: "Make it a dashboard.", messages }));
    expect(outcome.kind).toBe("spec");
    expect(outcome.spec!.kind).toBe("kpi-dashboard");
    const enc = outcome.spec!.encoding;
    if (enc.kind !== "kpi-dashboard") throw new Error("wrong encoding");
    const labels = enc.items.map((i) => i.label.toLowerCase());
    expect(labels.some((l) => l.includes("price") || l.includes("market") || l.includes("volume"))).toBe(true);
    // Sources carried through the transform.
    expect(outcome.spec!.sources.length).toBeGreaterThan(0);
  });

  it("step 3: 'Compare USDT with USDC.' retrieves live data and preserves sources", async () => {
    fetchMock.mockImplementation(async (url: string) => {
      if (url.includes("simple/price") && url.includes("ids=tether")) return jsonResponse(200, usdtQuote);
      if (url.includes("simple/price") && url.includes("ids=usd-coin")) return jsonResponse(200, usdcQuote);
      throw new Error("unexpected fetch: " + url);
    });
    const messages: PipelineMessage[] = [...researchMessages()];
    const intent = detectVisualizationIntent("/visualize compare USDT and USDC");
    expect(intent?.kind).toBe("create");
    expect(intent?.compareTarget?.toLowerCase()).toBe("usdc");
    const outcome = await settle(handleVisualizationRequest({ intent: intent!, request: "/visualize compare USDT and USDC", messages }), 30_000);
    expect(outcome.kind).toBe("spec");
    const spec = outcome.spec!;
    expect(spec.kind).toBe("comparison-matrix");
    const rows = spec.datasets[0].rows;
    expect(rows.map((r) => r.asset)).toEqual(["USDT", "USDC"]);
    // REAL retrieved values flow into the dataset.
    expect(rows[0].market_cap_usd).toBe(180_500_000_000);
    expect(rows[1].market_cap_usd).toBe(75_200_000_000);
    // Provider attribution + retrieval timestamps preserved.
    expect(spec.sources.some((s) => s.url === "https://www.coingecko.com/en/api")).toBe(true);
    expect(spec.sources.every((s) => s.retrievedAt && s.dataTimestamp)).toBe(true);
    expect(spec.provenance).toBe("source-verified");
    // Honest gap: nothing missing here (both quotes had market caps).
    expect(outcome.content).toContain("Live retrieval");
  });

  it("step 3b: bare 'Compare USDT with USDC.' refines when a chart is on screen", async () => {
    fetchMock.mockImplementation(async (url: string) => {
      if (url.includes("ids=tether")) return jsonResponse(200, usdtQuote);
      if (url.includes("ids=usd-coin")) return jsonResponse(200, usdcQuote);
      throw new Error("unexpected fetch: " + url);
    });
    const first = await settle(handleVisualizationRequest({
      intent: detectVisualizationIntent("Show me this visually.")!,
      request: "Show me this visually.",
      messages: researchMessages(),
    }));
    const messages: PipelineMessage[] = [...researchMessages(), { id: "a2", type: "ai", content: first.content, visualization: first.spec }];
    // Bare compare (no chart noun) → null from the detector; the chat wiring
    // promotes it to a comparison refinement when a spec is live.
    expect(detectVisualizationIntent("Compare USDT with USDC.")).toBeNull();
    const outcome = await settle(handleVisualizationRequest({
      intent: { kind: "refine", compareTarget: "USDC", confidence: 0.7 },
      request: "Compare USDT with USDC.",
      messages,
    }), 30_000);
    expect(outcome.kind).toBe("spec");
    expect(outcome.spec!.kind).toBe("comparison-matrix");
    expect(outcome.spec!.datasets[0].rows.map((r) => r.asset)).toEqual(["USDT", "USDC"]);
  });

  it("step 4: 'Explain this chart.' describes the actual displayed dataset", async () => {
    const first = await settle(handleVisualizationRequest({
      intent: detectVisualizationIntent("Show me this visually.")!,
      request: "Show me this visually.",
      messages: researchMessages(),
    }));
    const messages: PipelineMessage[] = [...researchMessages(), { id: "a2", type: "ai", content: first.content, visualization: first.spec }];
    const intent = detectVisualizationIntent("Explain this chart.");
    expect(intent?.kind).toBe("explain");
    const outcome = await settle(handleVisualizationRequest({ intent: intent!, request: "Explain this chart.", messages }));
    expect(outcome.kind).toBe("text");
    expect(outcome.content).toContain("USDT market overview");
    // Values read from the dataset (latest price 1.0001, 5 points).
    expect(outcome.content).toContain("1.0001");
    expect(outcome.content).toContain("source-verified");
    expect(outcome.content).toContain("https://www.coingecko.com/en/coins/tether");
    // Declared gap carried into the explanation.
    expect(outcome.content).toContain("30-day historical volume unavailable");
  });

  it("step 5: snapshot-only context + 'last 30 days' → retrieves REAL history", async () => {
    fetchMock.mockImplementation(async (url: string) => {
      if (url.includes("/market_chart")) return jsonResponse(200, history30);
      throw new Error("unexpected fetch: " + url);
    });
    // Session holds only the single-snapshot visualization (no series).
    const snapshotMessages: PipelineMessage[] = [
      { id: "u1", type: "user", content: "What is the USDT price?" },
      {
        id: "a1",
        type: "ai",
        content: "USDT trades at $1.0001.",
        citations: [{ url: "https://www.coingecko.com/en/coins/tether", title: "CoinGecko" }],
      },
    ];
    const intent = detectVisualizationIntent("/visualize as line chart last 30 days");
    const outcome = await settle(handleVisualizationRequest({
      intent: intent ?? { kind: "create", timeRange: "last 30 days", requestedType: "line", confidence: 0.9 },
      request: "USDT last 30 days",
      messages: snapshotMessages,
    }), 30_000);
    expect(outcome.kind).toBe("spec");
    const spec = outcome.spec!;
    expect(spec.kind).toBe("line");
    expect(spec.datasets[0].rows.length).toBe(31);
    expect(spec.gaps.join(" ")).toContain("History retrieved live");
  });

  it("step 5b: when history retrieval fails the refusal is EXPLICIT", async () => {
    fetchMock.mockResolvedValue(jsonResponse(429, {}, { "retry-after": "1" }));
    const snapshotMessages: PipelineMessage[] = [
      { id: "a1", type: "ai", content: "USDT trades at $1.0001.", citations: [{ url: "https://x.example.com", title: "X" }] },
    ];
    const outcome = await settle(handleVisualizationRequest({
      intent: { kind: "create", timeRange: "last 30 days", requestedType: "line", confidence: 0.9 },
      request: "show USDT for the last 30 days",
      messages: snapshotMessages,
    }), 60_000);
    expect(outcome.kind).toBe("text");
    expect(outcome.content).toMatch(/rate.?limit|unavailable/i);
    // The refusal must say the snapshot was NOT stretched into history.
    expect(outcome.content).toMatch(/don't fabricate history|cannot be presented/i);
  });

  it("step 6: with NO research in the session the response guides instead of hallucinating", async () => {
    const outcome = await settle(handleVisualizationRequest({
      intent: detectVisualizationIntent("Show me this visually.")!,
      request: "Show me this visually.",
      messages: [{ id: "u1", type: "user", content: "hello" }],
    }));
    expect(outcome.kind).toBe("text");
    expect(outcome.content).toMatch(/no research|no structured numeric/i);
    expect(outcome.content).toMatch(/research a topic first/i);
  });
});

describe("E2E — spec integrity across the workflow", () => {
  it("every spec produced in the conversation revalidates and is reload-safe", async () => {
    fetchMock.mockImplementation(async (url: string) => {
      if (url.includes("ids=tether")) return jsonResponse(200, usdtQuote);
      if (url.includes("ids=usd-coin")) return jsonResponse(200, usdcQuote);
      throw new Error("unexpected fetch: " + url);
    });
    const first = await settle(handleVisualizationRequest({
      intent: detectVisualizationIntent("Show me this visually.")!,
      request: "Show me this visually.",
      messages: researchMessages(),
    }));
    const messages: PipelineMessage[] = [...researchMessages(), { id: "a2", type: "ai", content: first.content, visualization: first.spec }];
    const dash = await settle(handleVisualizationRequest({
      intent: detectVisualizationIntent("Make it a dashboard.")!,
      request: "Make it a dashboard.",
      messages,
    }));
    expect(dash.spec).toBeTruthy();
    // lastVisualizationSpec (reload path) finds and re-validates the artifact.
    const restored = lastVisualizationSpec([{ id: "a3", type: "ai", content: dash.content, visualization: JSON.parse(JSON.stringify(dash.spec)) }]);
    expect(restored).not.toBeNull();
    expect(restored!.kind).toBe("kpi-dashboard");
  });
});
