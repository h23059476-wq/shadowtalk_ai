/**
 * visualContract tests — the strict JSON-to-engine payload gate.
 *
 * Pins the security-critical behavior:
 *  1. Raw <svg>/<canvas> payloads are REJECTED (old generator format is dead).
 *  2. Every mode validates against its schema; sizes are capped.
 *  3. Mermaid payloads are sanitized (headers, quotes, unsafe constructs).
 *  4. Bare ```mermaid fences map to the right diagram type.
 *  5. Errors are model-readable strings for the 1-step self-correction retry.
 */

import { describe, it, expect } from "vitest";
import {
  parseShadowVisual,
  visualFromMermaidFence,
  isShadowVisualFence,
  diagramTypeFromMermaid,
  sanitizeMermaid,
  normalizeIconName,
  VISUAL_LIMITS,
} from "../visualContract";

const validChart = {
  mode: "chart",
  title: "Weekly actives",
  chartType: "line",
  labels: ["W1", "W2", "W3"],
  series: [{ name: "Users", data: [1, 2, 3] }],
};

const validInfographic = {
  mode: "infographic",
  header: "Why sovereign",
  layout: "grid-3",
  cards: [
    { iconName: "wifi-off", title: "Offline", description: "Zero network.", accent: "indigo", tags: ["local"] },
    { iconName: "lock", title: "Private", description: "On-device only." },
  ],
};

describe("fence detection", () => {
  it("accepts the shadowvisual tag and its aliases", () => {
    expect(isShadowVisualFence("shadowvisual")).toBe(true);
    expect(isShadowVisualFence("shadow-visual")).toBe(true);
    expect(isShadowVisualFence("ShadowViz")).toBe(true);
  });

  it("rejects other languages", () => {
    expect(isShadowVisualFence("svg")).toBe(false);
    expect(isShadowVisualFence("json")).toBe(false);
    expect(isShadowVisualFence(undefined)).toBe(false);
    expect(isShadowVisualFence("")).toBe(false);
  });
});

describe("parseShadowVisual — chart mode", () => {
  it("accepts a valid chart payload", () => {
    const r = parseShadowVisual(JSON.stringify(validChart));
    expect(r.ok).toBe(true);
    if (r.ok && r.visual.mode === "chart") {
      expect(r.visual.chartType).toBe("line");
      expect(r.visual.series).toHaveLength(1);
    } else {
      expect.fail("expected ok chart");
    }
  });

  it("coerces numeric strings and drops garbage values", () => {
    const r = parseShadowVisual(
      JSON.stringify({
        ...validChart,
        series: [{ name: "S", data: ["1,200", "not-a-number", null, 42] }],
      }),
    );
    expect(r.ok).toBe(true);
    if (r.ok && r.visual.mode === "chart") {
      expect(r.visual.series[0].data).toEqual([1200, null, null, 42]);
    } else {
      expect.fail("expected ok chart");
    }
  });

  it("maps chartType aliases (column → bar, doughnut → donut)", () => {
    const bar = parseShadowVisual(JSON.stringify({ ...validChart, chartType: "column" }));
    expect(bar.ok && bar.visual.mode === "chart" && bar.visual.chartType).toBe("bar");
    const donut = parseShadowVisual(JSON.stringify({ ...validChart, chartType: "doughnut" }));
    expect(donut.ok && donut.visual.mode === "chart" && donut.visual.chartType).toBe("donut");
  });

  it("rejects an unknown chartType with a model-readable error", () => {
    const r = parseShadowVisual(JSON.stringify({ ...validChart, chartType: "waterfall" }));
    expect(r.ok).toBe(false);
    if (r.ok === false) expect(r.error).toContain("Unknown chartType");
  });

  it("rejects a series with no numeric values", () => {
    const r = parseShadowVisual(
      JSON.stringify({ ...validChart, series: [{ name: "S", data: ["a", "b"] }] }),
    );
    expect(r.ok).toBe(false);
    if (r.ok === false) expect(r.error).toContain("no numeric values");
  });

  it("validates sankey links and rejects malformed ones", () => {
    const ok = parseShadowVisual(
      JSON.stringify({
        mode: "chart",
        title: "Flow",
        chartType: "sankey",
        labels: [],
        series: [{ name: "links", data: [{ source: "A", target: "B", value: 3 }] }],
      }),
    );
    expect(ok.ok).toBe(true);
    const bad = parseShadowVisual(
      JSON.stringify({
        mode: "chart",
        title: "Flow",
        chartType: "sankey",
        labels: [],
        series: [{ name: "links", data: [{ source: "A", target: "B" }] }],
      }),
    );
    expect(bad.ok).toBe(false);
  });

  it("caps oversized series and label arrays", () => {
    const tooManySeries = parseShadowVisual(
      JSON.stringify({
        ...validChart,
        series: Array.from({ length: 20 }, (_, i) => ({ name: `S${i}`, data: [1] })),
      }),
    );
    expect(tooManySeries.ok).toBe(true);
    if (tooManySeries.ok && tooManySeries.visual.mode === "chart") {
      expect(tooManySeries.visual.series).toHaveLength(VISUAL_LIMITS.maxSeries);
    } else {
      expect.fail("expected capped series");
    }
  });
});

describe("parseShadowVisual — infographic mode", () => {
  it("accepts a valid bento payload and normalizes accents", () => {
    const r = parseShadowVisual(JSON.stringify(validInfographic));
    expect(r.ok).toBe(true);
    if (r.ok && r.visual.mode === "infographic") {
      expect(r.visual.cards).toHaveLength(2);
      expect(r.visual.cards[0].accent).toBe("indigo");
    } else {
      expect.fail("expected ok infographic");
    }
  });

  it("rejects hex accents by dropping them (named accents only)", () => {
    const r = parseShadowVisual(
      JSON.stringify({
        ...validInfographic,
        cards: [{ title: "T", description: "D", accent: "#FF00FF" }],
      }),
    );
    expect(r.ok).toBe(true);
    if (r.ok && r.visual.mode === "infographic") {
      expect(r.visual.cards[0].accent).toBeUndefined();
    } else {
      expect.fail("expected ok infographic");
    }
  });

  it("rejects an unknown layout", () => {
    const r = parseShadowVisual(JSON.stringify({ ...validInfographic, layout: "mosaic" }));
    expect(r.ok).toBe(false);
    if (r.ok === false) expect(r.error).toContain("Unknown layout");
  });

  it("rejects payloads with more cards than the cap", () => {
    const r = parseShadowVisual(
      JSON.stringify({
        ...validInfographic,
        cards: Array.from({ length: 20 }, (_, i) => ({ title: `C${i}`, description: "x" })),
      }),
    );
    expect(r.ok).toBe(false);
  });
});

describe("parseShadowVisual — diagram mode + sanitization", () => {
  it("accepts a valid diagram and keeps the code", () => {
    const r = parseShadowVisual(
      JSON.stringify({
        mode: "diagram",
        title: "Flow",
        diagramType: "flowchart",
        code: "flowchart TD\n  A[Start] --> B[End]",
      }),
    );
    expect(r.ok).toBe(true);
    if (r.ok && r.visual.mode === "diagram") {
      expect(r.visual.code).toContain("flowchart TD");
      expect(r.sanitized).toBe(false);
    } else {
      expect.fail("expected ok diagram");
    }
  });

  it("prepends a missing flowchart header (auto-repair)", () => {
    const r = parseShadowVisual(
      JSON.stringify({ mode: "diagram", title: "Flow", diagramType: "flowchart", code: "A --> B" }),
    );
    expect(r.ok).toBe(true);
    if (r.ok && r.visual.mode === "diagram") {
      expect(r.visual.code.startsWith("flowchart TD")).toBe(true);
    } else {
      expect.fail("expected ok diagram");
    }
  });

  it("strips scripts and javascript: URLs from mermaid code", () => {
    const s = sanitizeMermaid('flowchart TD\n  A["<script>alert(1)</script>"] --> B\n  C --> D', "flowchart");
    expect(s.code).not.toContain("<script>");
    const s2 = sanitizeMermaid("flowchart TD\n  A[ok] --> B\n  X[javascript:alert(1)] --> Y", "flowchart");
    expect(s2.code).not.toContain("javascript:");
  });

  it("balances unbalanced quotes per line", () => {
    const s = sanitizeMermaid('flowchart TD\n  A["broken --> B', "flowchart");
    expect((s.code.match(/"/g) || []).length % 2).toBe(0);
  });

  it("rejects a diagram payload without code", () => {
    const r = parseShadowVisual(JSON.stringify({ mode: "diagram", title: "Flow", diagramType: "flowchart" }));
    expect(r.ok).toBe(false);
    if (r.ok === false) expect(r.error).toContain("missing the mermaid");
  });
});

describe("parseShadowVisual — guardrails", () => {
  it("REJECTS raw SVG payloads (old generator format is dead)", () => {
    const r = parseShadowVisual('<svg width="200" height="200"><circle cx="100" cy="100" r="80"/></svg>');
    expect(r.ok).toBe(false);
    if (r.ok === false) expect(r.error).toMatch(/Raw <svg>\/<canvas>|no longer supported/);
  });

  it("REJECTS canvas 2d payloads", () => {
    const r = parseShadowVisual('const c = document.createElement("canvas"); c.getContext("2d").fillRect(0,0,1,1);');
    expect(r.ok).toBe(false);
    if (r.ok === false) expect(r.error).toContain("Raw <svg>/<canvas>");
  });

  it("rejects invalid JSON with a model-readable message", () => {
    const r = parseShadowVisual('{"mode":"chart" broken}');
    expect(r.ok).toBe(false);
    if (r.ok === false) expect(r.error).toContain("Invalid JSON");
  });

  it("rejects an unknown mode", () => {
    const r = parseShadowVisual(JSON.stringify({ mode: "poetry" }));
    expect(r.ok).toBe(false);
    if (r.ok === false) expect(r.error).toContain('Unknown mode "poetry"');
  });

  it("rejects an empty payload", () => {
    expect(parseShadowVisual("").ok).toBe(false);
    expect(parseShadowVisual("   ").ok).toBe(false);
  });

  it("tolerates prose around the JSON object", () => {
    const r = parseShadowVisual(`Here is your chart:\n${JSON.stringify(validChart)}\nLet me know.`);
    expect(r.ok).toBe(true);
  });
});

describe("bare mermaid fences", () => {
  it("maps each header to the right diagram type", () => {
    expect(diagramTypeFromMermaid("sequenceDiagram\nA->>B: hi")).toBe("sequence");
    expect(diagramTypeFromMermaid("mindmap\n  root")).toBe("mindmap");
    expect(diagramTypeFromMermaid("erDiagram\n  USER ||--o{ POST : writes")).toBe("er");
    expect(diagramTypeFromMermaid("gantt\n  title Plan")).toBe("gantt");
    expect(diagramTypeFromMermaid("flowchart LR\n  A --> B")).toBe("flowchart");
    expect(diagramTypeFromMermaid("graph TD\n  A --> B")).toBe("flowchart");
  });

  it("wraps a mermaid fence into a diagram visual", () => {
    const r = visualFromMermaidFence("sequenceDiagram\n  A->>B: hello");
    expect(r.ok).toBe(true);
    if (r.ok && r.visual.mode === "diagram") {
      expect(r.visual.diagramType).toBe("sequence");
      expect(r.visual.title).toBe("Diagram");
    } else {
      expect.fail("expected ok diagram");
    }
  });
});

describe("icon name normalization", () => {
  it("normalizes casing and separators", () => {
    expect(normalizeIconName("WifiOff")).toBe("wifi-off");
    expect(normalizeIconName("wifi-off")).toBe("wifi-off");
    expect(normalizeIconName("trending_up")).toBe("trending-up");
    expect(normalizeIconName("CheckCircle2")).toBe("check-circle-2");
    expect(normalizeIconName("BarChart3")).toBe("bar-chart-3");
    expect(normalizeIconName("ShieldIcon")).toBe("shield");
  });
});
