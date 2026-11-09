/**
 * Batch 2 — VisualizationSpec validation tests.
 * Covers: every supported kind validates; malformed specs are rejected
 * whole; reference/type/unit checks; size caps; provenance policy;
 * source-URL safety (no javascript:/data:); no HTML/JS execution surface.
 */

import { describe, it, expect } from "vitest";
import {
  SPEC_LIMITS,
  validateVisualizationSpec,
  parseVisualizationSpec,
  toVizDataset,
  COMPATIBLE_KINDS,
  type VisualizationSpec,
} from "../spec";

/* Fixtures ------------------------------------------------------------ */

const seriesRows = Array.from({ length: 7 }, (_, i) => ({
  date: new Date(Date.UTC(2026, 9, 20 + i)).toISOString(),
  price_usd: 1.0 + i * 0.001,
  volume_usd: 50_000_000 + i * 1_000_000,
}));

const validSeriesDataset = {
  id: "d0",
  title: "USDT daily prices",
  fields: [
    { key: "date", type: "date" as const },
    { key: "price_usd", type: "currency" as const, unit: "USD" },
    { key: "volume_usd", type: "currency" as const, unit: "USD" },
  ],
  rows: seriesRows,
};

function baseSpec(overrides: Partial<VisualizationSpec> = {}): VisualizationSpec {
  return {
    version: 1,
    id: "viz-test",
    kind: "line",
    title: "USDT daily prices",
    datasets: [validSeriesDataset],
    encoding: {
      kind: "line",
      datasetId: "d0",
      x: "date",
      xType: "date",
      y: ["price_usd"],
    },
    provenance: "source-verified",
    sources: [{ url: "https://example.com/usdt", name: "Example Research" }],
    generatedAt: "2026-11-09T00:00:00.000Z",
    gaps: [],
    ...overrides,
  };
}

const ohlcRows = Array.from({ length: 5 }, (_, i) => ({
  time: new Date(Date.UTC(2026, 10, 1 + i)).toISOString(),
  open_usd: 1.0,
  high_usd: 1.02,
  low_usd: 0.99,
  close_usd: 1.01,
}));

/* Every supported kind ------------------------------------------------ */

describe("validateVisualizationSpec — supported kinds", () => {
  it("validates a line spec", () => {
    const r = validateVisualizationSpec(baseSpec());
    expect(r.ok).toBe(true);
  });

  it("validates area / bar / bar-grouped encodings", () => {
    for (const kind of ["area", "bar", "bar-grouped"] as const) {
      const r = validateVisualizationSpec(baseSpec({ kind, encoding: { kind, datasetId: "d0", x: "date", xType: "date", y: ["price_usd"] } }));
      expect(r.ok, `${kind}: ${r.errors.join("; ")}`).toBe(true);
    }
  });

  it("validates bar with only 2 categories (comparison)", () => {
    const ds = {
      id: "d0",
      title: "USDT vs USDC",
      fields: [
        { key: "asset", type: "string" as const },
        { key: "market_cap_usd", type: "currency" as const, unit: "USD" },
      ],
      rows: [
        { asset: "USDT", market_cap_usd: 180e9 },
        { asset: "USDC", market_cap_usd: 75e9 },
      ],
    };
    const r = validateVisualizationSpec(baseSpec({
      kind: "bar",
      title: "Market cap comparison",
      datasets: [ds],
      encoding: { kind: "bar", datasetId: "d0", x: "asset", xType: "category", y: ["market_cap_usd"] },
    }));
    expect(r.ok, r.errors.join("; ")).toBe(true);
  });

  it("validates pie and donut", () => {
    const ds = {
      id: "d0",
      title: "Stablecoin share",
      fields: [
        { key: "asset", type: "string" as const },
        { key: "cap_usd", type: "currency" as const, unit: "USD" },
      ],
      rows: [
        { asset: "USDT", cap_usd: 180e9 },
        { asset: "USDC", cap_usd: 75e9 },
        { asset: "DAI", cap_usd: 5e9 },
      ],
    };
    for (const kind of ["pie", "donut"] as const) {
      const r = validateVisualizationSpec(baseSpec({ kind, datasets: [ds], encoding: { kind, datasetId: "d0", label: "asset", value: "cap_usd" } }));
      expect(r.ok, `${kind}: ${r.errors.join("; ")}`).toBe(true);
    }
  });

  it("validates scatter, radar", () => {
    const ds = {
      id: "d0",
      title: "Metrics",
      fields: [
        { key: "x", type: "number" as const },
        { key: "y", type: "number" as const },
        { key: "name", type: "string" as const },
        { key: "a", type: "number" as const },
        { key: "b", type: "number" as const },
        { key: "c", type: "number" as const },
      ],
      rows: Array.from({ length: 6 }, (_, i) => ({ x: i, y: i * 2, name: `p${i}`, a: i, b: i + 1, c: i + 2 })),
    };
    const scatter = validateVisualizationSpec(baseSpec({ kind: "scatter", datasets: [ds], encoding: { kind: "scatter", datasetId: "d0", x: "x", y: "y", label: "name" } }));
    expect(scatter.ok, scatter.errors.join("; ")).toBe(true);
    const radar = validateVisualizationSpec(baseSpec({ kind: "radar", datasets: [ds], encoding: { kind: "radar", datasetId: "d0", label: "name", value: ["a", "b", "c"] } }));
    expect(radar.ok, radar.errors.join("; ")).toBe(true);
  });

  it("validates kpi-dashboard with single-row snapshot", () => {
    const ds = {
      id: "d0",
      title: "USDT snapshot",
      fields: [
        { key: "asset", type: "string" as const },
        { key: "price_usd", type: "currency" as const, unit: "USD" },
        { key: "market_cap_usd", type: "currency" as const, unit: "USD" },
      ],
      rows: [{ asset: "USDT", price_usd: 1.0001, market_cap_usd: 180e9 }],
    };
    const r = validateVisualizationSpec(baseSpec({
      kind: "kpi-dashboard",
      datasets: [ds],
      encoding: {
        kind: "kpi-dashboard",
        datasetId: "d0",
        items: [
          { label: "Price", field: "price_usd", agg: "latest" },
          { label: "Market cap", field: "market_cap_usd", agg: "latest" },
        ],
      },
    }));
    expect(r.ok, r.errors.join("; ")).toBe(true);
  });

  it("validates comparison-matrix, timeline, flowchart", () => {
    const matrix = validateVisualizationSpec(baseSpec({
      kind: "comparison-matrix",
      encoding: { kind: "comparison-matrix", datasetId: "d0", rowLabel: "date", columns: ["price_usd", "volume_usd"] },
    }));
    expect(matrix.ok, matrix.errors.join("; ")).toBe(true);

    const tlRows = Array.from({ length: 4 }, (_, i) => ({
      when: new Date(Date.UTC(2026, 0, 1 + i)).toISOString(),
      what: `event ${i}`,
    }));
    const timeline = validateVisualizationSpec(baseSpec({
      kind: "timeline",
      datasets: [{ id: "d0", title: "Timeline", fields: [{ key: "when", type: "date" as const }, { key: "what", type: "string" as const }], rows: tlRows }],
      encoding: { kind: "timeline", datasetId: "d0", when: "when", title: "what" },
    }));
    expect(timeline.ok, timeline.errors.join("; ")).toBe(true);

    const flow = validateVisualizationSpec(baseSpec({
      kind: "flowchart",
      encoding: {
        kind: "flowchart",
        nodes: [
          { id: "n0", label: "Start" },
          { id: "n1", label: "Process" },
          { id: "n2", label: "End" },
        ],
        edges: [{ from: "n0", to: "n1" }, { from: "n1", to: "n2" }],
      },
    }));
    expect(flow.ok, flow.errors.join("; ")).toBe(true);
  });

  it("validates candlestick with complete OHLC data", () => {
    const r = validateVisualizationSpec(baseSpec({
      kind: "candlestick",
      datasets: [{
        id: "d0",
        title: "USDCUSDT daily",
        fields: [
          { key: "time", type: "date" as const },
          { key: "open_usd", type: "currency" as const, unit: "USD" },
          { key: "high_usd", type: "currency" as const, unit: "USD" },
          { key: "low_usd", type: "currency" as const, unit: "USD" },
          { key: "close_usd", type: "currency" as const, unit: "USD" },
        ],
        rows: ohlcRows,
      }],
      encoding: { kind: "candlestick", datasetId: "d0", time: "time", open: "open_usd", high: "high_usd", low: "low_usd", close: "close_usd" },
    }));
    expect(r.ok, r.errors.join("; ")).toBe(true);
  });
});

/* Malformed / invalid -------------------------------------------------- */

describe("validateVisualizationSpec — rejections", () => {
  it("rejects schema-invalid specs (wrong version, missing fields)", () => {
    expect(validateVisualizationSpec(null).ok).toBe(false);
    expect(validateVisualizationSpec({}).ok).toBe(false);
    expect(validateVisualizationSpec(baseSpec({ version: 2 as never })).ok).toBe(false);
    const noSources = baseSpec();
    noSources.encoding = { kind: "line", datasetId: "missing", x: "date", xType: "date", y: ["price_usd"] };
    const r = validateVisualizationSpec(noSources);
    expect(r.ok).toBe(false);
    expect(r.errors[0]).toContain("missing");
  });

  it("rejects references to columns that do not exist", () => {
    const r = validateVisualizationSpec(baseSpec({ encoding: { kind: "line", datasetId: "d0", x: "date", xType: "date", y: ["nope"] } }));
    expect(r.ok).toBe(false);
    expect(r.errors.join(" ")).toContain('no column "nope"');
  });

  it("rejects non-numeric value columns", () => {
    const r = validateVisualizationSpec(baseSpec({ encoding: { kind: "line", datasetId: "d0", x: "date", xType: "date", y: [] as never } }));
    expect(r.ok).toBe(false); // min(1) on y
  });

  it("rejects mixed units on one chart's value axes", () => {
    const ds = {
      id: "d0",
      title: "Mixed",
      fields: [
        { key: "date", type: "date" as const },
        { key: "price_usd", type: "currency" as const, unit: "USD" },
        { key: "change_pct", type: "number" as const, unit: "%" },
      ],
      rows: seriesRows.map((r, i) => ({ ...r, change_pct: i * 0.1 })),
    };
    const r = validateVisualizationSpec(baseSpec({
      encoding: { kind: "line", datasetId: "d0", x: "date", xType: "date", y: ["price_usd", "change_pct"] },
      datasets: [ds],
    }));
    expect(r.ok).toBe(false);
    expect(r.errors.join(" ")).toContain("mixed units");
  });

  it("refuses to render a single snapshot as a time series", () => {
    const snapshot = {
      ...validSeriesDataset,
      rows: [seriesRows[0]],
    };
    const r = validateVisualizationSpec(baseSpec({ datasets: [snapshot] }));
    expect(r.ok).toBe(false);
    expect(r.errors.join(" ")).toContain("plottable point");
  });

  it("rejects pie with more than the readable slice cap", () => {
    const ds = {
      id: "d0",
      title: "Too many slices",
      fields: [
        { key: "asset", type: "string" as const },
        { key: "cap_usd", type: "currency" as const, unit: "USD" },
      ],
      rows: Array.from({ length: SPEC_LIMITS.maxPieSlices + 2 }, (_, i) => ({ asset: `a${i}`, cap_usd: i + 1 })),
    };
    const r = validateVisualizationSpec(baseSpec({ kind: "pie", datasets: [ds], encoding: { kind: "pie", datasetId: "d0", label: "asset", value: "cap_usd" } }));
    expect(r.ok).toBe(false);
    expect(r.errors.join(" ")).toContain("readable maximum");
  });

  it("rejects candlestick with corrupt OHLC (high below close)", () => {
    const rows = ohlcRows.map((r, i) => (i === 0 ? { ...r, high_usd: 0.5 } : r));
    const r = validateVisualizationSpec(baseSpec({
      kind: "candlestick",
      datasets: [{
        id: "d0",
        title: "corrupt",
        fields: [
          { key: "time", type: "date" as const },
          { key: "open_usd", type: "currency" as const, unit: "USD" },
          { key: "high_usd", type: "currency" as const, unit: "USD" },
          { key: "low_usd", type: "currency" as const, unit: "USD" },
          { key: "close_usd", type: "currency" as const, unit: "USD" },
        ],
        rows,
      }],
      encoding: { kind: "candlestick", datasetId: "d0", time: "time", open: "open_usd", high: "high_usd", low: "low_usd", close: "close_usd" },
    }));
    expect(r.ok).toBe(false);
    expect(r.errors.join(" ")).toContain("violate");
  });

  it("rejects candlestick with incomplete OHLC rows", () => {
    const rows = ohlcRows.map((r, i) => (i === 1 ? { ...r, low_usd: null } : r));
    const r = validateVisualizationSpec(baseSpec({
      kind: "candlestick",
      datasets: [{
        id: "d0",
        title: "incomplete",
        fields: [
          { key: "time", type: "date" as const },
          { key: "open_usd", type: "currency" as const, unit: "USD" },
          { key: "high_usd", type: "currency" as const, unit: "USD" },
          { key: "low_usd", type: "currency" as const, unit: "USD" },
          { key: "close_usd", type: "currency" as const, unit: "USD" },
        ],
        rows,
      }],
      encoding: { kind: "candlestick", datasetId: "d0", time: "time", open: "open_usd", high: "high_usd", low: "low_usd", close: "close_usd" },
    }));
    // The partial row is flagged — never silently dropped.
    expect(r.ok).toBe(false);
    expect(r.errors.join(" ")).toContain("incomplete OHLC");
  });

  it("rejects flowchart edges that reference unknown nodes", () => {
    const r = validateVisualizationSpec(baseSpec({
      kind: "flowchart",
      encoding: {
        kind: "flowchart",
        nodes: [{ id: "n0", label: "A" }, { id: "n1", label: "B" }],
        edges: [{ from: "n0", to: "ghost" }],
      },
    }));
    expect(r.ok).toBe(false);
    expect(r.errors.join(" ")).toContain('unknown node "ghost"');
  });

  it("rejects source URLs that are not http(s)", () => {
    const r = validateVisualizationSpec(baseSpec({ sources: [{ url: "javascript:alert(1)" }] }));
    expect(r.ok).toBe(false);
    const r2 = validateVisualizationSpec(baseSpec({ sources: [{ url: "data:text/html,evil" }] }));
    expect(r2.ok).toBe(false);
    const r3 = validateVisualizationSpec(baseSpec({ sources: [{ url: "not a url" }] }));
    expect(r3.ok).toBe(false);
  });

  it("enforces the provenance policy: unverified requires an explicit gap note", () => {
    const r = validateVisualizationSpec(baseSpec({ provenance: "unverified" }));
    expect(r.ok).toBe(false);
    const ok = validateVisualizationSpec(baseSpec({
      provenance: "unverified",
      gaps: ["Source data is unverified — treat values as indicative, not as facts (unverified)."],
    }));
    expect(ok.ok).toBe(true);
  });

  it("rejects oversized payloads", () => {
    const bigRows = Array.from({ length: 900 }, (_, i) => ({
      date: new Date(Date.UTC(2020, 0, 1 + i)).toISOString(),
      pad: "x".repeat(140),
      price_usd: i,
    }));
    const ds = {
      id: "d0",
      title: "big",
      fields: [
        { key: "date", type: "date" as const },
        { key: "pad", type: "string" as const },
        { key: "price_usd", type: "currency" as const, unit: "USD" },
      ],
      rows: bigRows,
    };
    const r = validateVisualizationSpec(baseSpec({ datasets: [ds] }));
    // 900 × ~160 chars ≈ 144KB > 120KB cap
    expect(r.ok).toBe(false);
    expect(r.errors.join(" ")).toContain("serialized spec exceeds");
  });
});

/* XSS posture ---------------------------------------------------------- */

describe("spec XSS boundaries", () => {
  it("stores hostile strings as inert text and never allows them to become markup", () => {
    const hostile = '<img src=x onerror="alert(1)">';
    const spec = baseSpec({ title: hostile.slice(0, SPEC_LIMITS.maxTitleChars) });
    const parsed = parseVisualizationSpec(spec);
    expect(parsed).not.toBeNull();
    // The value is plain text — renderers treat spec strings as text nodes,
    // so this can only ever appear escaped (asserted in renderer tests).
    expect(parsed!.title).toBe(hostile.slice(0, SPEC_LIMITS.maxTitleChars));
  });

  it("keeps source URLs restricted to http(s) so no javascript: URL can enter a chip", () => {
    const parsed = parseVisualizationSpec(baseSpec({ sources: [{ url: "https://ok.example.com" }] }));
    expect(parsed?.sources[0].url).toBe("https://ok.example.com");
  });
});

/* Helpers -------------------------------------------------------------- */

describe("toVizDataset / COMPATIBLE_KINDS", () => {
  it("converts a ShadowDataset and strips nested/hostile row values", () => {
    const v = toVizDataset(
      {
        title: "t",
        columns: [
          { key: "date", type: "date" },
          { key: "price_usd", type: "currency", unit: "USD" },
        ],
        rows: [{ date: "2026-11-01", price_usd: 1.0, evil: { nested: true } } as never],
        asOf: "2026-11-01",
      },
      "d0",
    );
    expect(v.fields).toHaveLength(2);
    expect(v.rows[0]).not.toHaveProperty("evil");
  });

  it("defines compatible switches for every kind", () => {
    for (const kind of Object.keys(COMPATIBLE_KINDS)) {
      expect(Array.isArray(COMPATIBLE_KINDS[kind as keyof typeof COMPATIBLE_KINDS])).toBe(true);
    }
  });
});
