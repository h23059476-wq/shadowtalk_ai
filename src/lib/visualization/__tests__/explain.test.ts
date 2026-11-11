/**
 * Batch 2 — deterministic explanation tests. Every number in the generated
 * text must come from the spec's dataset — nothing may be invented.
 */

import { describe, it, expect } from "vitest";
import { explainVisualization, formatNumber } from "../explain";
import { planVisualization, planComparison, type ComparisonAsset } from "../planner";
import type { ResearchContext, ShadowDataset, VizIntent } from "../types";

const series: ShadowDataset = {
  title: "USDT daily prices",
  columns: [
    { key: "date", type: "date" },
    { key: "price_usd", type: "currency", unit: "USD" },
  ],
  rows: Array.from({ length: 8 }, (_, i) => ({
    date: new Date(Date.UTC(2026, 10, 1 + i)).toISOString(),
    price_usd: 1.0 + i * 0.0005,
  })),
};

const snapshot: ShadowDataset = {
  title: "USDT snapshot",
  columns: [
    { key: "asset", type: "string" },
    { key: "price_usd", type: "currency", unit: "USD" },
    { key: "market_cap_usd", type: "currency", unit: "USD" },
  ],
  rows: [{ asset: "USDT", price_usd: 1.0001, market_cap_usd: 180_500_000_000 }],
};

function ctx(datasets: ShadowDataset[]): ResearchContext {
  return {
    datasets,
    citations: [{ url: "https://example.com/a", title: "Alpha" }],
    evidence: [],
    provenance: "source-verified",
    gaps: ["Historical volume not available."],
    hasNumericData: true,
    primaryMessageId: "m1",
  };
}

const intent: VizIntent = { kind: "create", confidence: 0.9 };

describe("explainVisualization", () => {
  it("explains a series using only computed values", () => {
    const planned = planVisualization({ context: ctx([series]), intent });
    if (planned.status !== "ok") throw new Error("fixture broken");
    const text = explainVisualization(planned.spec);
    expect(text).toContain("USDT daily prices");
    expect(text).toContain("8"); // 8 points
    // Latest value 1.0035 → formatted "1.0035"
    expect(text).toContain("1.0035");
    // Trend phrase from first→latest movement
    expect(text.toLowerCase()).toMatch(/up/);
    // Provenance + asOf
    expect(text).toContain("source-verified");
    expect(text).toContain("Sources");
    expect(text).toContain("https://example.com/a");
    // Declared gaps surface
    expect(text).toContain("Historical volume not available");
  });

  it("explains a KPI dashboard from its dataset", () => {
    const planned = planVisualization({ context: ctx([snapshot]), intent: { ...intent, requestedType: "dashboard" } });
    if (planned.status !== "ok") throw new Error("fixture broken");
    const text = explainVisualization(planned.spec);
    expect(text).toContain("KPI dashboard");
    expect(text).toContain("$180.50B");
    expect(text).toContain("$1.0001");
  });

  it("explains a comparison matrix by naming the column leader", () => {
    const assets: ComparisonAsset[] = [
      { symbol: "USDT", metrics: { market_cap_usd: 180e9 } },
      { symbol: "USDC", metrics: { market_cap_usd: 75e9 } },
    ];
    const planned = planComparison(assets, { provenance: "source-verified", sources: [{ url: "https://www.coingecko.com/en/api", name: "CoinGecko" }] });
    if (planned.status !== "ok") throw new Error("fixture broken");
    const text = explainVisualization(planned.spec);
    expect(text).toContain("USDT"); // leader
    expect(text).toContain("$180.00B");
    expect(text).toContain("2 rows");
  });

  it("never fabricates numbers absent from the dataset", () => {
    const planned = planVisualization({ context: ctx([series]), intent });
    if (planned.status !== "ok") throw new Error("fixture broken");
    const text = explainVisualization(planned.spec);
    // A number that is NOT derivable from 1.0..1.0035 series must not appear.
    expect(text).not.toContain("42.0");
    expect(text).not.toContain("999");
  });
});

describe("formatNumber", () => {
  it("formats large values compactly and small values precisely", () => {
    expect(formatNumber(180_500_000_000)).toBe("180.50B");
    expect(formatNumber(5_200_000)).toBe("5.20M");
    expect(formatNumber(1.0001)).toBe("1.0001");
    expect(formatNumber(0)).toBe("0");
  });
});
