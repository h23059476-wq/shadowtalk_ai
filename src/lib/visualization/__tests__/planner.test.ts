/**
 * Batch 2 — planner tests: deterministic spec building from research
 * contexts, kind hints + fallbacks, refinements (kind switch, time range),
 * and comparison planning.
 */

import { describe, it, expect } from "vitest";
import { planVisualization, planComparison, transformKind, applyTimeRange, buildComparisonDataset, type ComparisonAsset } from "../planner";
import { validateVisualizationSpec } from "../spec";
import type { ResearchContext, VizIntent, ShadowDataset } from "../types";

const days = (n: number, start = Date.UTC(2026, 9, 1)): string[] =>
  Array.from({ length: n }, (_, i) => new Date(start + i * 86_400_000).toISOString());

const usdtSeries: ShadowDataset = {
  title: "USDT daily prices",
  description: "From web research",
  columns: [
    { key: "date", type: "date" },
    { key: "price_usd", type: "currency", unit: "USD" },
  ],
  rows: days(10).map((d, i) => ({ date: d, price_usd: 0.9995 + i * 0.0001 })),
  asOf: days(10).at(-1),
};

const usdtSnapshot: ShadowDataset = {
  title: "USDT market snapshot",
  columns: [
    { key: "asset", type: "string" },
    { key: "price_usd", type: "currency", unit: "USD" },
    { key: "market_cap_usd", type: "currency", unit: "USD" },
    { key: "change_24h_pct", type: "number", unit: "%" },
  ],
  rows: [{ asset: "USDT", price_usd: 1.0001, market_cap_usd: 180e9, change_24h_pct: 0.01 }],
  asOf: "2026-11-09T00:00:00Z",
};

function context(datasets: ShadowDataset[], provenance: ResearchContext["provenance"] = "source-verified"): ResearchContext {
  return {
    datasets,
    citations: [{ url: "https://example.com/src", title: "Example" }],
    evidence: [{ messageId: "m1", excerpt: "…", priority: "research-data" }],
    provenance,
    gaps: [],
    hasNumericData: true,
    primaryMessageId: "m1",
  };
}

const baseIntent: VizIntent = { kind: "create", confidence: 0.9 };

describe("planVisualization — defaults by data shape", () => {
  it("builds a line chart from a dated series", () => {
    const r = planVisualization({ context: context([usdtSeries]), intent: baseIntent });
    expect(r.status).toBe("ok");
    if (r.status !== "ok") return;
    expect(r.spec.kind).toBe("line");
    expect(validateVisualizationSpec(r.spec).ok).toBe(true);
    expect(r.spec.provenance).toBe("source-verified");
    expect(r.spec.sources.some((s) => s.url === "https://example.com/src")).toBe(true);
    expect(r.spec.asOf).toBe(usdtSeries.asOf);
  });

  it("builds a KPI dashboard from a single-row snapshot (never a fake series)", () => {
    const r = planVisualization({ context: context([usdtSnapshot]), intent: baseIntent });
    expect(r.status).toBe("ok");
    if (r.status !== "ok") return;
    expect(r.spec.kind).toBe("kpi-dashboard");
    expect(validateVisualizationSpec(r.spec).ok).toBe(true);
  });

  it("reports no-data explicitly when nothing numeric was captured", () => {
    const empty: ShadowDataset = {
      title: "Prose only",
      columns: [{ key: "summary", type: "string" }],
      rows: [{ summary: "USDT is a stablecoin." }],
    };
    const r = planVisualization({ context: context([empty]), intent: baseIntent });
    expect(r.status).toBe("no-data");
    if (r.status !== "no-data") return;
    expect(r.reason).toMatch(/no structured numeric/i);
    expect(r.gaps.length).toBeGreaterThan(0);
  });

  it("downgrades unverified provenance to ai-extracted and declares the gap", () => {
    const r = planVisualization({ context: context([usdtSeries], "unverified"), intent: baseIntent });
    expect(r.status).toBe("ok");
    if (r.status !== "ok") return;
    expect(r.spec.provenance).toBe("ai-extracted");
  });
});

describe("planVisualization — requested types and fallbacks", () => {
  it("honors a requested bar chart over categories", () => {
    const intent: VizIntent = { ...baseIntent, requestedType: "bar" };
    const r = planVisualization({ context: context([usdtSnapshot]), intent });
    expect(r.status).toBe("ok");
    if (r.status !== "ok") return;
    expect(r.spec.kind).toBe("bar");
  });

  it("falls back with a note when the requested kind is infeasible", () => {
    // candlestick needs OHLC columns — the price series has none.
    const intent: VizIntent = { ...baseIntent, requestedType: "candlestick" };
    const r = planVisualization({ context: context([usdtSeries]), intent });
    expect(r.status).toBe("ok");
    if (r.status !== "ok") return;
    expect(r.spec.kind).not.toBe("candlestick");
    expect(r.notes.join(" ").length).toBeGreaterThan(0);
  });

  it("maps dashboard/table hints to supported kinds", () => {
    const dash = planVisualization({ context: context([usdtSnapshot]), intent: { ...baseIntent, requestedType: "dashboard" } });
    expect(dash.status === "ok" && dash.spec.kind).toBe("kpi-dashboard");
    const matrix = planVisualization({ context: context([usdtSnapshot]), intent: { ...baseIntent, requestedType: "table" } });
    expect(matrix.status === "ok" && matrix.spec.kind).toBe("comparison-matrix");
  });
});

describe("refinements", () => {
  it("switches kinds compatibly and keeps validation green", () => {
    const created = planVisualization({ context: context([usdtSeries]), intent: baseIntent });
    if (created.status !== "ok") throw new Error("fixture broken");
    const result = transformKind(created.spec, "area", new Date("2026-11-09"));
    expect(result.status).toBe("ok");
    if (result.status !== "ok") return;
    expect(result.spec.kind).toBe("area");
    expect(validateVisualizationSpec(result.spec).ok).toBe(true);
  });

  it("rejects incompatible switches with a clear reason", () => {
    const created = planVisualization({ context: context([usdtSnapshot]), intent: baseIntent });
    if (created.status !== "ok") throw new Error("fixture broken");
    expect(created.spec.kind).toBe("kpi-dashboard");
    const result = transformKind(created.spec, "pie", new Date("2026-11-09"));
    expect(result.status).toBe("unavailable");
    if (result.status !== "unavailable") return;
    expect(result.reason.length).toBeGreaterThan(10);
  });

  it("applies a time range when a real dated series covers it", () => {
    const created = planVisualization({ context: context([usdtSeries]), intent: baseIntent });
    if (created.status !== "ok") throw new Error("fixture broken");
    // The series is 10 days ending 2026-10-10; "last 7 days" relative to that.
    const result = applyTimeRange(created.spec, "last 7 days", new Date("2026-10-10T12:00:00Z"));
    expect(result.status).toBe("ok");
    if (result.status !== "ok") return;
    const ds = result.spec.datasets[0];
    expect(ds.rows.length).toBeLessThan(10);
    expect(result.spec.gaps.some((g) => g.includes("Filtered"))).toBe(true);
  });

  it("refuses to stretch a snapshot into history", () => {
    const created = planVisualization({ context: context([usdtSnapshot]), intent: baseIntent });
    if (created.status !== "ok") throw new Error("fixture broken");
    const result = applyTimeRange(created.spec, "last 30 days", new Date("2026-11-09"));
    expect(result.status).toBe("unavailable");
    if (result.status !== "unavailable") return;
    expect(result.reason).toMatch(/time range filter|snapshot|dated axis/i);
  });
});

describe("comparison planning", () => {
  const assets: ComparisonAsset[] = [
    { symbol: "USDT", metrics: { price_usd: 1.0001, market_cap_usd: 180e9, volume_24h_usd: 90e9 }, asOf: "2026-11-09T00:00:00Z" },
    { symbol: "USDC", metrics: { price_usd: 0.9999, market_cap_usd: 75e9, volume_24h_usd: 12e9 }, asOf: "2026-11-09T00:00:00Z" },
  ];

  it("builds a comparison dataset from the intersection of metrics", () => {
    const ds = buildComparisonDataset(assets, "USDT vs USDC");
    expect(ds).not.toBeNull();
    expect(ds!.rows).toHaveLength(2);
    expect(ds!.columns.some((c) => c.key === "market_cap_usd")).toBe(true);
  });

  it("plans a validated comparison-matrix spec with sources", () => {
    const r = planComparison(assets, {
      provenance: "source-verified",
      sources: [{ url: "https://www.coingecko.com/en/api", name: "Data powered by CoinGecko" }],
    });
    expect(r.status).toBe("ok");
    if (r.status !== "ok") return;
    expect(r.spec.kind).toBe("comparison-matrix");
    expect(validateVisualizationSpec(r.spec).ok).toBe(true);
    expect(r.spec.sources[0].url).toBe("https://www.coingecko.com/en/api");
    expect(r.spec.title).toContain("USDT");
  });

  it("returns bar comparisons when requested", () => {
    const r = planComparison(assets, { requestedType: "bar", provenance: "source-verified", sources: [] });
    expect(r.status).toBe("ok");
    if (r.status !== "ok") return;
    expect(["bar", "bar-grouped", "comparison-matrix"]).toContain(r.spec.kind);
  });

  it("fails explicitly when fewer than two assets are given", () => {
    const r = planComparison([assets[0]], { provenance: "source-verified", sources: [] });
    expect(r.status).toBe("no-data");
  });
});
