/**
 * visualContract.ts — the strict JSON contract between the model and the
 * ShadowVisualRenderer engines (pure TypeScript, no React, fully testable).
 *
 * The model must emit ONE fenced block tagged `shadowvisual` whose body is a
 * JSON object matching one of the three mode schemas below. Nothing here
 * trusts the model: sizes are capped, colors are reduced to named accent
 * tokens, mermaid code is sanitized, icons are resolved from a fixed
 * registry. Raw <svg>/<canvas> payloads are rejected by design — there is
 * no code path that can render them.
 */

/* ------------------------------------------------------------------ */
/* Schemas                                                             */
/* ------------------------------------------------------------------ */

export type ShadowVisualMode = "chart" | "diagram" | "infographic";

export type ShadowChartType =
  | "line"
  | "bar"
  | "area"
  | "pie"
  | "donut"
  | "radar"
  | "scatter"
  | "sankey";

export interface ShadowChartSeries {
  name: string;
  /** Numbers for most charts; `{source,target,value}` links for sankey. */
  data: Array<number | null> | Array<{ source: string; target: string; value: number }>;
}

export interface ShadowChartVisual {
  mode: "chart";
  title: string;
  subtitle?: string;
  chartType: ShadowChartType;
  labels: string[];
  series: ShadowChartSeries[];
  /** Optional unit suffix rendered on the value axis and tooltips. */
  unit?: string;
}

export type ShadowDiagramType = "flowchart" | "sequence" | "mindmap" | "er" | "gantt";

export interface ShadowDiagramVisual {
  mode: "diagram";
  title: string;
  subtitle?: string;
  diagramType: ShadowDiagramType;
  /** Declarative Mermaid syntax (sanitized before rendering). */
  code: string;
}

export type ShadowInfographicLayout = "grid-2" | "grid-3" | "timeline" | "comparison";

export interface ShadowInfoCard {
  /** Lucide icon name from the fixed registry (unknown names fall back). */
  iconName?: string;
  title: string;
  /** Big stat line, e.g. "16+" or "99.9%". */
  metric?: string;
  metricLabel?: string;
  description: string;
  accent?: "indigo" | "emerald" | "cyan" | "amber" | "rose";
  tags?: string[];
}

export interface ShadowInfographicVisual {
  mode: "infographic";
  header: string;
  badge?: string;
  layout: ShadowInfographicLayout;
  cards: ShadowInfoCard[];
}

export type ShadowVisual = ShadowChartVisual | ShadowDiagramVisual | ShadowInfographicVisual;

/** The fence tag the model MUST use. */
export const SHADOW_VISUAL_FENCE = "shadowvisual";

/* ------------------------------------------------------------------ */
/* Limits — everything the validator enforces                          */
/* ------------------------------------------------------------------ */

export const VISUAL_LIMITS = {
  maxTitleChars: 120,
  maxSubtitleChars: 200,
  maxLabels: 60,
  maxSeries: 12,
  maxPointsPerSeries: 500,
  maxMermaidChars: 20_000,
  maxCards: 12,
  maxCardTitleChars: 80,
  maxCardDescriptionChars: 240,
  maxTagsPerCard: 4,
  maxTagChars: 24,
  maxPayloadChars: 60_000,
} as const;

export type VisualParseResult =
  | { ok: true; visual: ShadowVisual; sanitized: boolean }
  | { ok: false; error: string };

/* ------------------------------------------------------------------ */
/* Fence detection                                                     */
/* ------------------------------------------------------------------ */

/** Does this fenced code block qualify as a shadow-visual payload? */
export function isShadowVisualFence(language: string | undefined): boolean {
  const lang = (language || "").trim().toLowerCase();
  return lang === SHADOW_VISUAL_FENCE || lang === "shadow-visual" || lang === "shadowviz";
}

/** Guess the diagram type from raw mermaid source (used by bare ```mermaid fences). */
export function diagramTypeFromMermaid(code: string): ShadowDiagramType {
  const head = code.slice(0, 400).trimStart().toLowerCase();
  if (/^sequencediagram\b/.test(head) || /\bsequencediagram\b/.test(head)) return "sequence";
  if (/\bmindmap\b/.test(head)) return "mindmap";
  if (/\berdiagram\b/.test(head)) return "er";
  if (/\bgantt\b/.test(head)) return "gantt";
  return "flowchart";
}

/* ------------------------------------------------------------------ */
/* Validation helpers                                                  */
/* ------------------------------------------------------------------ */

function asTrimmedString(value: unknown, maxChars: number): string | null {
  if (typeof value !== "string") return null;
  const s = value.trim();
  if (!s) return null;
  return s.length > maxChars ? s.slice(0, maxChars) : s;
}

function coerceNumber(value: unknown): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "string") {
    const cleaned = value.trim().replace(/,/g, "");
    if (!cleaned || !/^-?\d+(\.\d+)?([eE][+-]?\d+)?$/.test(cleaned)) return null;
    const n = Number(cleaned);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/* ------------------------------------------------------------------ */
/* Mode validators                                                     */
/* ------------------------------------------------------------------ */

function validateChart(raw: Record<string, unknown>): { visual: ShadowChartVisual } | { error: string } {
  const title = asTrimmedString(raw.title, VISUAL_LIMITS.maxTitleChars) ?? "Chart";
  const subtitle = asTrimmedString(raw.subtitle, VISUAL_LIMITS.maxSubtitleChars) ?? undefined;

  const chartTypeRaw = typeof raw.chartType === "string" ? raw.chartType.trim().toLowerCase() : "";
  const alias: Record<string, ShadowChartType> = {
    "line-chart": "line", linechart: "line",
    "bar-chart": "bar", barchart: "bar", column: "bar", histogram: "bar",
    "area-chart": "area", areachart: "area",
    donut: "donut", doughnut: "donut",
    radar: "radar", spider: "radar",
    scatter: "scatter", bubble: "scatter",
    sankey: "sankey", "flow-diagram": "sankey",
  };
  const chartType = (alias[chartTypeRaw] ?? chartTypeRaw) as ShadowChartType;
  if (!["line", "bar", "area", "pie", "donut", "radar", "scatter", "sankey"].includes(chartType)) {
    return { error: `Unknown chartType "${chartTypeRaw}". Use line | bar | area | pie | donut | radar | scatter | sankey.` };
  }

  const rawLabels = Array.isArray(raw.labels) ? raw.labels : [];
  const labels = rawLabels
    .map((l) => (typeof l === "string" || typeof l === "number" ? String(l).trim() : ""))
    .filter((l) => l.length > 0)
    .slice(0, VISUAL_LIMITS.maxLabels);
  if (labels.length === 0 && chartType !== "sankey") {
    return { error: "labels must be a non-empty array of strings." };
  }

  const rawSeries = Array.isArray(raw.series) ? raw.series : [];
  if (rawSeries.length === 0) return { error: "series must be a non-empty array." };
  const series: ShadowChartSeries[] = [];
  for (const entry of rawSeries.slice(0, VISUAL_LIMITS.maxSeries)) {
    if (!isPlainObject(entry)) return { error: "Every series entry must be an object with name and data." };
    const name = asTrimmedString(entry.name, VISUAL_LIMITS.maxTitleChars) ?? `Series ${series.length + 1}`;
    const data = Array.isArray(entry.data) ? entry.data : null;
    if (!data) return { error: `Series "${name}" is missing its data array.` };
    if (data.length > VISUAL_LIMITS.maxPointsPerSeries) {
      return { error: `Series "${name}" exceeds ${VISUAL_LIMITS.maxPointsPerSeries} points.` };
    }
    if (chartType === "sankey") {
      const links: Array<{ source: string; target: string; value: number }> = [];
      for (const item of data) {
        if (!isPlainObject(item)) return { error: "sankey series data must be {source, target, value} links." };
        const source = asTrimmedString(item.source, VISUAL_LIMITS.maxTitleChars);
        const target = asTrimmedString(item.target, VISUAL_LIMITS.maxTitleChars);
        const value = coerceNumber(item.value);
        if (!source || !target || value === null) {
          return { error: "Each sankey link needs non-empty source, target and numeric value." };
        }
        links.push({ source, target, value });
      }
      if (links.length === 0) return { error: "sankey series needs at least one {source, target, value} link." };
      series.push({ name, data: links });
    } else {
      const nums = data.map(coerceNumber);
      if (nums.every((n) => n === null)) {
        return { error: `Series "${name}" has no numeric values.` };
      }
      series.push({ name, data: nums });
    }
  }

  const unit = asTrimmedString(raw.unit, 24) ?? undefined;
  return { visual: { mode: "chart", title, subtitle, chartType, labels, series, unit } };
}

function validateDiagram(raw: Record<string, unknown>): { visual: ShadowDiagramVisual } | { error: string } {
  const title = asTrimmedString(raw.title, VISUAL_LIMITS.maxTitleChars) ?? "Diagram";
  const subtitle = asTrimmedString(raw.subtitle, VISUAL_LIMITS.maxSubtitleChars) ?? undefined;

  const diagramTypeRaw = typeof raw.diagramType === "string" ? raw.diagramType.trim().toLowerCase() : "";
  const alias: Record<string, ShadowDiagramType> = {
    flowchart: "flowchart", flow: "flowchart", graph: "flowchart", "decision-tree": "flowchart",
    sequence: "sequence", sequencediagram: "sequence", "sequence-diagram": "sequence",
    mindmap: "mindmap", mind: "mindmap",
    er: "er", erdiagram: "er", "entity-relationship": "er", "er-diagram": "er",
    gantt: "gantt", timeline: "gantt",
  };
  let diagramType = alias[diagramTypeRaw] as ShadowDiagramType | undefined;
  const code = typeof raw.code === "string" ? raw.code : "";
  if (!diagramType) {
    // Trust the mermaid source header when the type is missing or unknown.
    diagramType = diagramTypeFromMermaid(code);
  }
  if (!code.trim()) return { error: "diagram payload is missing the mermaid `code` string." };
  if (code.length > VISUAL_LIMITS.maxMermaidChars) {
    return { error: `Mermaid code exceeds ${VISUAL_LIMITS.maxMermaidChars} characters.` };
  }
  return { visual: { mode: "diagram", title, subtitle, diagramType, code } };
}

function validateInfographic(raw: Record<string, unknown>): { visual: ShadowInfographicVisual } | { error: string } {
  const header = asTrimmedString(raw.header ?? raw.title, VISUAL_LIMITS.maxTitleChars);
  if (!header) return { error: "infographic payload needs a `header` string." };
  const badge = asTrimmedString(raw.badge, 40) ?? undefined;

  const layoutRaw = typeof raw.layout === "string" ? raw.layout.trim().toLowerCase() : "";
  const layoutAlias: Record<string, ShadowInfographicLayout> = {
    "grid-2": "grid-2", grid2: "grid-2", two: "grid-2", duo: "grid-2",
    "grid-3": "grid-3", grid3: "grid-3", three: "grid-3", bento: "grid-3",
    timeline: "timeline", roadmap: "timeline", steps: "timeline",
    comparison: "comparison", versus: "comparison", vs: "comparison", matrix: "comparison",
  };
  const layout = layoutAlias[layoutRaw];
  if (!layout) return { error: `Unknown layout "${layoutRaw}". Use grid-2 | grid-3 | timeline | comparison.` };

  const rawCards = Array.isArray(raw.cards) ? raw.cards : [];
  if (rawCards.length === 0) return { error: "infographic payload needs at least one card." };
  if (rawCards.length > VISUAL_LIMITS.maxCards) {
    return { error: `infographic supports at most ${VISUAL_LIMITS.maxCards} cards (got ${rawCards.length}).` };
  }

  const cards: ShadowInfoCard[] = [];
  for (const entry of rawCards) {
    if (!isPlainObject(entry)) return { error: "Every card must be a JSON object." };
    const title = asTrimmedString(entry.title, VISUAL_LIMITS.maxCardTitleChars);
    if (!title) return { error: "Every card needs a `title` string." };
    const description = asTrimmedString(entry.description ?? entry.body, VISUAL_LIMITS.maxCardDescriptionChars) ?? "";
    const iconName = asTrimmedString(entry.iconName ?? entry.icon, 40) ?? undefined;
    const metric = asTrimmedString(entry.metric ?? entry.value, 24) ?? undefined;
    const metricLabel = asTrimmedString(entry.metricLabel, 40) ?? undefined;
    const accentRaw = typeof entry.accent === "string" ? entry.accent.trim().toLowerCase() : "";
    const accent = (["indigo", "emerald", "cyan", "amber", "rose"] as const).includes(accentRaw as never)
      ? (accentRaw as ShadowInfoCard["accent"])
      : undefined;
    const tags = Array.isArray(entry.tags)
      ? entry.tags
          .map((t) => (typeof t === "string" || typeof t === "number" ? String(t).trim() : ""))
          .filter(Boolean)
          .slice(0, VISUAL_LIMITS.maxTagsPerCard)
          .map((t) => (t.length > VISUAL_LIMITS.maxTagChars ? t.slice(0, VISUAL_LIMITS.maxTagChars) : t))
      : undefined;
    cards.push({ iconName, title, metric, metricLabel, description, accent, tags: tags && tags.length ? tags : undefined });
  }

  return { visual: { mode: "infographic", header, badge, layout, cards } };
}

/* ------------------------------------------------------------------ */
/* Mermaid sanitization (auto-recovery layer 1)                        */
/* ------------------------------------------------------------------ */

const MERMAID_TYPE_HEADERS: Record<ShadowDiagramType, RegExp> = {
  flowchart: /^\s*(flowchart|graph)\b/i,
  sequence: /^\s*sequencediagram\b/i,
  mindmap: /^\s*mindmap\b/i,
  er: /^\s*erdiagram\b/i,
  gantt: /^\s*gantt\b/i,
};

/**
 * Repair the most common model-generated mermaid mistakes. Returns the
 * sanitized code and whether anything changed. This is the renderer's
 * silent 1-step self-correction before escalating to the model.
 */
export function sanitizeMermaid(
  code: string,
  diagramType: ShadowDiagramType,
): { code: string; changed: boolean; notes: string[] } {
  const notes: string[] = [];
  let out = code;

  // 1. Normalize smart quotes and fullwidth characters that break parsing.
  const normalized = out
    .replace(/[\u201C\u201D\u201E\uFF02]/g, '"')
    .replace(/[\u2018\u2019\uFF07]/g, "'")
    .replace(/\uFF1B/g, ";")
    .replace(/\uFF1A/g, ":");
  if (normalized !== out) notes.push("normalized quotes");
  out = normalized;

  // 2. Drop dangerous / parse-breaking constructs.
  const stripped = out
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<iframe[\s\S]*?<\/iframe>/gi, "")
    .replace(/javascript:/gi, "")
    .replace(/\bstyle\s+.*?\s+fill:[^;]*;?/gi, "");
  if (stripped !== out) notes.push("stripped unsafe content");
  out = stripped;

  // 3. Unbalanced double quotes on a line — drop the stray quote.
  const balanced = out
    .split("\n")
    .map((line) => {
      const quotes = (line.match(/"/g) || []).length;
      if (quotes % 2 !== 1) return line;
      const last = line.lastIndexOf('"');
      return line.slice(0, last) + line.slice(last + 1);
    })
    .join("\n");
  if (balanced !== out) notes.push("balanced quotes");
  out = balanced;

  // 4. Ensure the required diagram-type header exists.
  const firstMeaningful = out.split("\n").find((l) => l.trim() && !l.trim().startsWith("%%")) ?? "";
  if (!MERMAID_TYPE_HEADERS[diagramType].test(firstMeaningful)) {
    const header =
      diagramType === "flowchart"
        ? "flowchart TD"
        : diagramType === "sequence"
          ? "sequenceDiagram"
          : diagramType === "mindmap"
            ? "mindmap"
            : diagramType === "er"
              ? "erDiagram"
              : "gantt";
    out = `${header}\n${out}`;
    notes.push(`prepended ${header} header`);
  }

  // 5. Collapse 3+ consecutive blank lines (keeps mermaid's parser happy).
  const collapsed = out.replace(/\n{3,}/g, "\n\n");
  if (collapsed !== out) notes.push("collapsed blank lines");
  out = collapsed;

  return { code: out.trim(), changed: out.trim() !== code.trim(), notes };
}

/* ------------------------------------------------------------------ */
/* Main entry — parse a fenced payload                                 */
/* ------------------------------------------------------------------ */

/** Extract the first JSON object from a fenced block body (tolerates prose around it). */
function extractJson(text: string): string | null {
  const trimmed = text.trim();
  // Strip a leading ```json marker if the model double-fenced.
  const body = trimmed.replace(/^```(?:json|shadowvisual)?\s*/i, "").replace(/```\s*$/, "");
  const start = body.indexOf("{");
  const end = body.lastIndexOf("}");
  if (start === -1 || end <= start) return null;
  return body.slice(start, end + 1);
}

/**
 * Parse + validate a ```shadowvisual payload. Never throws.
 * On failure, `error` is a model-readable message suitable for a
 * self-correction retry.
 */
export function parseShadowVisual(rawBody: string): VisualParseResult {
  if (!rawBody || !rawBody.trim()) return { ok: false, error: "Empty shadowvisual payload." };
  if (rawBody.length > VISUAL_LIMITS.maxPayloadChars) {
    return { ok: false, error: `Payload exceeds ${VISUAL_LIMITS.maxPayloadChars} characters — simplify the visual.` };
  }

  // Guardrail: refuse raw SVG/canvas payloads outright (old generator format).
  if (/<svg[\s>]/i.test(rawBody) || /getContext\(\s*['"]2d/i.test(rawBody)) {
    return {
      ok: false,
      error: "Raw <svg>/<canvas> payloads are no longer supported. Emit a shadowvisual JSON block instead (mode: chart | diagram | infographic).",
    };
  }

  const jsonSlice = extractJson(rawBody);
  if (!jsonSlice) return { ok: false, error: "Payload contains no JSON object. Emit one fenced block tagged shadowvisual containing pure JSON." };

  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonSlice);
  } catch (e) {
    return {
      ok: false,
      error: `Invalid JSON: ${e instanceof Error ? e.message : "parse failure"}. Fix the syntax and re-emit the shadowvisual block.`,
    };
  }
  if (!isPlainObject(parsed)) return { ok: false, error: "Payload must be a single JSON object." };

  const mode = typeof parsed.mode === "string" ? parsed.mode.trim().toLowerCase() : "";
  if (mode === "chart") {
    const r = validateChart(parsed);
    return "error" in r ? { ok: false, error: r.error } : { ok: true, visual: r.visual, sanitized: false };
  }
  if (mode === "diagram") {
    const r = validateDiagram(parsed);
    if ("error" in r) return { ok: false, error: r.error };
    const s = sanitizeMermaid(r.visual.code, r.visual.diagramType);
    return { ok: true, visual: { ...r.visual, code: s.code }, sanitized: s.changed };
  }
  if (mode === "infographic") {
    const r = validateInfographic(parsed);
    return "error" in r ? { ok: false, error: r.error } : { ok: true, visual: r.visual, sanitized: false };
  }
  return {
    ok: false,
    error: `Unknown mode "${mode}". Use mode: "chart" (ECharts), "diagram" (Mermaid) or "infographic" (Bento grid).`,
  };
}

/** Build a diagram visual from a bare ```mermaid fence (fallback path). */
export function visualFromMermaidFence(code: string, title?: string): VisualParseResult {
  if (!code.trim()) return { ok: false, error: "Empty mermaid block." };
  if (code.length > VISUAL_LIMITS.maxMermaidChars) return { ok: false, error: "Mermaid block too large." };
  const diagramType = diagramTypeFromMermaid(code);
  const s = sanitizeMermaid(code, diagramType);
  return {
    ok: true,
    visual: { mode: "diagram", title: title ?? "Diagram", diagramType, code: s.code },
    sanitized: s.changed,
  };
}

/* ------------------------------------------------------------------ */
/* Icon registry (Mode C)                                              */
/* ------------------------------------------------------------------ */

/** Normalized lucide icon lookup: kebab/snake/camel/short forms all resolve. */
export function normalizeIconName(name: string): string {
  return name
    .trim()
    // Split camelCase and letter→digit boundaries before lowering:
    // CheckCircle2 → Check-Circle-2, BarChart3 → Bar-Chart-3.
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .replace(/([a-zA-Z])(\d)/g, "$1-$2")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-?icon$/, "");
}
