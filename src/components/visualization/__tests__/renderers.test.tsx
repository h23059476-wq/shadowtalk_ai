/**
 * Batch 2 — renderer tests.
 * HTML/SVG-based renderers (KPI, matrix, timeline, flowchart, candlestick)
 * are asserted on real content. Recharts-based views render inside
 * ResponsiveContainer, which needs layout — happy-dom provides none, so for
 * those we assert mount + container presence (visual checks are done in the
 * browser screenshots instead).
 */

import { describe, expect, it, vi, beforeEach } from "vitest";
import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { KpiDashboardRenderer } from "../KpiDashboardRenderer";
import { ComparisonMatrixRenderer } from "../ComparisonMatrixRenderer";
import { TimelineDiagramRenderer } from "../TimelineDiagramRenderer";
import { FlowchartDiagramRenderer } from "../FlowchartDiagramRenderer";
import { CandlestickChart, DataChartRenderer } from "../DataChartRenderer";
import { VisualizationCard } from "../VisualizationCard";
import type { VisualizationSpec } from "@/lib/visualization/spec";

// ResizeObserver mock is provided globally in src/test/setup.ts, but recharts
// requires a constructible class on window — happy-dom needs this override.
beforeEach(() => {
  class MockResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  vi.stubGlobal("ResizeObserver", MockResizeObserver);
});

const lineSpec: VisualizationSpec = {
  version: 1,
  id: "viz-line",
  kind: "line",
  title: "USDT daily prices",
  datasets: [
    {
      id: "d0",
      title: "USDT daily prices",
      fields: [
        { key: "date", type: "date" },
        { key: "price_usd", type: "currency", unit: "USD" },
      ],
      rows: Array.from({ length: 5 }, (_, i) => ({
        date: new Date(Date.UTC(2026, 10, 1 + i)).toISOString(),
        price_usd: 1.0001 + i * 0.0001,
      })),
    },
  ],
  encoding: { kind: "line", datasetId: "d0", x: "date", xType: "date", y: ["price_usd"] },
  provenance: "source-verified",
  sources: [{ url: "https://example.com", name: "Example" }],
  generatedAt: "2026-11-09T00:00:00.000Z",
  gaps: [],
};

const hostileTitle = '<img src=x onerror="window.__pwned=1">';
const hostileSpec: VisualizationSpec = {
  ...lineSpec,
  id: "viz-hostile",
  title: hostileTitle,
};

describe("KpiDashboardRenderer", () => {
  it("renders one card per KPI with formatted values", () => {
    const spec: VisualizationSpec = {
      version: 1,
      id: "viz-kpi",
      kind: "kpi-dashboard",
      title: "USDT snapshot",
      datasets: [
        {
          id: "d0",
          title: "USDT snapshot",
          fields: [
            { key: "asset", type: "string" },
            { key: "price_usd", type: "currency", unit: "USD" },
            { key: "market_cap_usd", type: "currency", unit: "USD" },
          ],
          rows: [
            { asset: "USDT", price_usd: 1.0000, market_cap_usd: 180e9 },
            { asset: "USDT", price_usd: 1.0001, market_cap_usd: 180.5e9 },
          ],
        },
      ],
      encoding: {
        kind: "kpi-dashboard",
        datasetId: "d0",
        items: [
          { label: "Price", field: "price_usd", agg: "latest" },
          { label: "Market cap", field: "market_cap_usd", agg: "latest" },
        ],
      },
      provenance: "source-verified",
      sources: [],
      generatedAt: "2026-11-09T00:00:00.000Z",
      gaps: [],
    };
    render(<KpiDashboardRenderer spec={spec} />);
    expect(screen.getByText("Price")).toBeTruthy();
    expect(screen.getByText("Market cap")).toBeTruthy();
    // Latest (chronologically last) value rendered, with $ prefix and no
    // redundant "USD" suffix for currency fields.
    expect(screen.getByText("$1.0001")).toBeTruthy();
    expect(screen.getByText("$180.50B")).toBeTruthy();
    // Delta vs previous present
    expect(screen.getAllByText(/vs previous/).length).toBe(2);
  });
});

describe("ComparisonMatrixRenderer", () => {
  it("renders rows/columns and highlights the column max", () => {
    const spec: VisualizationSpec = {
      version: 1,
      id: "viz-matrix",
      kind: "comparison-matrix",
      title: "USDT vs USDC",
      datasets: [
        {
          id: "d0",
          title: "USDT vs USDC",
          fields: [
            { key: "asset", type: "string" },
            { key: "market_cap_usd", type: "currency", unit: "USD" },
            { key: "change_24h_pct", type: "number", unit: "%" },
          ],
          rows: [
            { asset: "USDT", market_cap_usd: 180e9, change_24h_pct: 0.02 },
            { asset: "USDC", market_cap_usd: 75e9, change_24h_pct: -0.01 },
          ],
        },
      ],
      encoding: { kind: "comparison-matrix", datasetId: "d0", rowLabel: "asset", columns: ["market_cap_usd", "change_24h_pct"] },
      provenance: "source-verified",
      sources: [],
      generatedAt: "2026-11-09T00:00:00.000Z",
      gaps: [],
    };
    render(<ComparisonMatrixRenderer spec={spec} />);
    expect(screen.getByText("USDT")).toBeTruthy();
    expect(screen.getByText("USDC")).toBeTruthy();
    // Labels fall back to humanized keys when fields carry no label.
    expect(screen.getByText(/Market Cap/i)).toBeTruthy();
    expect(screen.getByText("$180.00B")).toBeTruthy();
    expect(screen.getByText("$75.00B")).toBeTruthy();
  });
});

describe("TimelineDiagramRenderer", () => {
  it("renders events sorted chronologically", () => {
    const spec: VisualizationSpec = {
      version: 1,
      id: "viz-tl",
      kind: "timeline",
      title: "Timeline",
      datasets: [
        {
          id: "d0",
          title: "Timeline",
          fields: [
            { key: "when", type: "date" },
            { key: "what", type: "string" },
          ],
          rows: [
            { when: "2026-11-05T00:00:00Z", what: "Peg deviation reported" },
            { when: "2026-11-02T00:00:00Z", what: "Volume spike" },
          ],
        },
      ],
      encoding: { kind: "timeline", datasetId: "d0", when: "when", title: "what" },
      provenance: "source-verified",
      sources: [],
      generatedAt: "2026-11-09T00:00:00.000Z",
      gaps: [],
    };
    const { container } = render(<TimelineDiagramRenderer spec={spec} />);
    const text = container.textContent ?? "";
    expect(text.indexOf("Volume spike")).toBeLessThan(text.indexOf("Peg deviation reported"));
  });
});

describe("FlowchartDiagramRenderer (SVG)", () => {
  it("renders nodes and edges as SVG text/shapes", () => {
    const spec: VisualizationSpec = {
      version: 1,
      id: "viz-flow",
      kind: "flowchart",
      title: "Flow",
      datasets: [],
      encoding: {
        kind: "flowchart",
        nodes: [
          { id: "n0", label: "Start research" },
          { id: "n1", label: "Extract data" },
          { id: "n2", label: "Render chart" },
        ],
        edges: [{ from: "n0", to: "n1" }, { from: "n1", to: "n2", label: "validated" }],
      },
      provenance: "source-verified",
      sources: [],
      generatedAt: "2026-11-09T00:00:00.000Z",
      gaps: [],
    };
    const { container } = render(<FlowchartDiagramRenderer spec={spec} />);
    const svg = container.querySelector("svg");
    expect(svg).toBeTruthy();
    expect(container.textContent).toContain("Start research");
    expect(container.textContent).toContain("Render chart");
    expect(container.textContent).toContain("validated");
    expect(container.querySelectorAll("rect").length).toBe(3);
  });
});

describe("CandlestickChart (custom SVG)", () => {
  it("renders one wick+body group per candle", () => {
    const spec: VisualizationSpec = {
      version: 1,
      id: "viz-candle",
      kind: "candlestick",
      title: "USDCUSDT",
      datasets: [
        {
          id: "d0",
          title: "USDCUSDT",
          fields: [
            { key: "time", type: "date" },
            { key: "open_usd", type: "currency", unit: "USD" },
            { key: "high_usd", type: "currency", unit: "USD" },
            { key: "low_usd", type: "currency", unit: "USD" },
            { key: "close_usd", type: "currency", unit: "USD" },
          ],
          rows: [
            { time: "2026-11-01T00:00:00Z", open_usd: 1.001, high_usd: 1.002, low_usd: 1.0, close_usd: 1.0015 },
            { time: "2026-11-02T00:00:00Z", open_usd: 1.0015, high_usd: 1.003, low_usd: 1.001, close_usd: 1.002 },
            { time: "2026-11-03T00:00:00Z", open_usd: 1.002, high_usd: 1.0025, low_usd: 1.0008, close_usd: 1.001 },
          ],
        },
      ],
      encoding: { kind: "candlestick", datasetId: "d0", time: "time", open: "open_usd", high: "high_usd", low: "low_usd", close: "close_usd" },
      provenance: "source-verified",
      sources: [],
      generatedAt: "2026-11-09T00:00:00.000Z",
      gaps: [],
    };
    const { container } = render(<CandlestickChart spec={spec} />);
    expect(container.querySelector("svg")).toBeTruthy();
    // 3 candles → 3 bodies (rect)
    expect(container.querySelectorAll("rect").length).toBe(3);
  });
});

describe("DataChartRenderer (Recharts)", () => {
  it("mounts line/bar/pie/radar/scatter without crashing", () => {
    const kinds: VisualizationSpec["kind"][] = ["line", "bar", "bar-grouped", "area", "pie", "donut", "scatter", "radar"];
    for (const kind of kinds) {
      const spec: VisualizationSpec =
        kind === "pie" || kind === "donut"
          ? {
              ...lineSpec,
              id: `viz-${kind}`,
              kind,
              encoding: { kind, datasetId: "d0", label: "date", value: "price_usd" },
            }
          : kind === "scatter" || kind === "radar"
            ? {
                ...lineSpec,
                id: `viz-${kind}`,
                kind,
                datasets: [
                  {
                    id: "d0",
                    title: "t",
                    fields: [
                      { key: "x", type: "number" },
                      { key: "y", type: "number" },
                      { key: "price_usd", type: "currency", unit: "USD" },
                    ],
                    rows: [{ x: 1, y: 2, price_usd: 3 }, { x: 2, y: 4, price_usd: 6 }, { x: 3, y: 6, price_usd: 9 }],
                  },
                ],
                encoding: kind === "scatter"
                  ? { kind: "scatter", datasetId: "d0", x: "x", y: "y" }
                  : { kind: "radar", datasetId: "d0", label: "x", value: ["y", "price_usd"] as unknown as string[] },
              }
            : { ...lineSpec, id: `viz-${kind}`, kind, encoding: { ...lineSpec.encoding, kind: kind as "line" } as never };
      const { unmount } = render(<DataChartRenderer spec={spec} />);
      expect(document.querySelector("[data-chart]")).toBeTruthy();
      unmount();
    }
  });
});

describe("VisualizationCard", () => {
  it("renders the container frame with provenance badge and toolbar", async () => {
    render(<VisualizationCard spec={lineSpec} />);
    // The container loads in an async chunk — await it.
    expect(await screen.findByText("USDT daily prices")).toBeTruthy();
    expect(await screen.findByText("source-verified")).toBeTruthy();
    expect(screen.getByText("Expand")).toBeTruthy();
    expect(screen.getByText("1 source")).toBeTruthy();
  });

  it("renders a compact, honest error card for an invalid spec", () => {
    render(<VisualizationCard spec={{ version: 1, nonsense: true }} />);
    expect(screen.getByText("Visualization unavailable")).toBeTruthy();
  });

  it("renders hostile spec strings as inert text (XSS boundary)", async () => {
    (window as unknown as { __pwned?: unknown }).__pwned = undefined;
    render(<VisualizationCard spec={hostileSpec} />);
    // The title is text content somewhere in the document…
    await waitFor(() => expect(document.body.textContent).toContain("<img src=x"));
    // …and NO img element / no script execution happened.
    expect(document.querySelectorAll("img[src='x']").length).toBe(0);
    expect((window as unknown as { __pwned?: unknown }).__pwned).toBeUndefined();
  });
});
