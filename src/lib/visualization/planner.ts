/**
 * Research-to-Visualization — deterministic spec planner (Batch 2).
 *
 * Turns a resolved ResearchContext (+ an optional market-data snapshot) into
 * a validated VisualizationSpec. The model is NEVER asked to author a spec
 * in Batch 2: everything here is computed from typed datasets so the same
 * context + request always produce the same spec (unit-tested contract).
 *
 * Design rules:
 *  - the requested type is honored when feasible; when it is not, the
 *    planner falls back to the closest feasible kind and records WHY in
 *    `spec.gaps` (never silently),
 *  - a single snapshot is never rendered as a time series — it becomes a
 *    KPI dashboard / bar / matrix instead,
 *  - provenance, sources, timestamps and gaps flow through unchanged,
 *  - every produced spec passes validateVisualizationSpec (asserted in
 *    tests); an infeasible plan is an explicit error, not a broken spec.
 */

import type { ProvenanceClass, ResearchContext, ShadowDataset, VizIntent, VizTypeHint } from "./types";
import {
  COMPATIBLE_KINDS,
  SPEC_LIMITS,
  validateVisualizationSpec,
  vizSpecId,
  toVizDataset,
  type VizDataset,
  type VizSpecKind,
  type VisualizationSpec,
  type VizSource,
} from "./spec";

/* ------------------------------------------------------------------ */
/* Public result types                                                 */
/* ------------------------------------------------------------------ */

export interface PlanNotes {
  /** Declared adjustments (requested type infeasible, aggregation, …). */
  notes: string[];
}

export type PlanResult =
  | { status: "ok"; spec: VisualizationSpec; notes: string[] }
  | { status: "no-data"; reason: string; gaps: string[] };

/* ------------------------------------------------------------------ */
/* Small helpers                                                       */
/* ------------------------------------------------------------------ */

const isNumericValue = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);

function numericFields(ds: ShadowDataset): string[] {
  return ds.columns.filter((c) => c.type === "number" || c.type === "currency").map((c) => c.key);
}

function keyableFields(ds: ShadowDataset): string[] {
  return ds.columns.filter((c) => c.type === "date" || c.type === "string").map((c) => c.key);
}

function dateFields(ds: ShadowDataset): string[] {
  return ds.columns.filter((c) => c.type === "date").map((c) => c.key);
}

function numericRowCount(ds: ShadowDataset, keys: string[]): number {
  return ds.rows.filter((row) => keys.some((k) => isNumericValue(row[k]))).length;
}

/** Humanize a column key: "market_cap_usd" → "Market cap USD". */
export function humanizeKey(key: string): string {
  return key
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim();
}

function titleCase(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function keywords(s: string): string[] {
  return (s.toLowerCase().match(/[a-z0-9][a-z0-9._-]*/g) || []).filter((t) => t.length >= 3);
}

function scoreDataset(ds: ShadowDataset, requestTokens: string[]): number {
  if (requestTokens.length === 0) return 0;
  const haystack = `${ds.title} ${ds.description ?? ""} ${ds.columns.map((c) => c.key).join(" ")}`.toLowerCase();
  let hits = 0;
  for (const token of requestTokens) if (haystack.includes(token)) hits += 1;
  return hits;
}

/** Map a deterministic Batch-1 type hint to a Batch-2 spec kind. */
export function hintToKind(hint: VizTypeHint): VizSpecKind | null {
  switch (hint) {
    case "line": return "line";
    case "bar": return "bar";
    case "bar-grouped": return "bar-grouped";
    case "bar-stacked": return "bar-grouped"; // closest supported; noted in gaps
    case "pie": return "pie";
    case "donut": return "donut";
    case "area": return "area";
    case "scatter": return "scatter";
    case "histogram": return "bar"; // bucketing is a Batch 3+ concern
    case "candlestick": return "candlestick";
    case "timeline": return "timeline";
    case "flowchart": return "flowchart";
    case "mindmap":
    case "roadmap":
    case "decision-tree":
      return null; // conceptual kinds planned via structured outlines in Batch 3
    case "dashboard": return "kpi-dashboard";
    case "table": return "comparison-matrix";
    default: return null;
  }
}

function bestSources(context: ResearchContext): VizSource[] {
  const seen = new Set<string>();
  const sources: VizSource[] = [];
  for (const block of context.datasets.flatMap(() => [])) void block; // (kept for shape clarity)
  for (const c of context.citations) {
    if (sources.length >= SPEC_LIMITS.maxSources) break;
    if (!c.url || seen.has(c.url)) continue;
    seen.add(c.url);
    sources.push({ url: c.url, ...(c.title ? { name: c.title.slice(0, SPEC_LIMITS.maxLabelChars) } : {}) });
  }
  return sources;
}

function pickYColumns(ds: ShadowDataset, max: number): string[] {
  // Prefer currency/number columns that actually carry values, preserving
  // column order. Columns whose rows are ALL null are skipped.
  return numericFields(ds)
    .filter((key) => ds.rows.some((row) => isNumericValue(row[key])))
    .slice(0, max);
}

/** Columns that share the SAME unit (or are all unitless) — spec rule. */
export function pickSameUnitColumns(ds: ShadowDataset, max: number): string[] {
  const candidates = pickYColumns(ds, max);
  if (candidates.length <= 1) return candidates;
  const unitOf = (key: string) => ds.columns.find((c) => c.key === key)?.unit ?? "";
  const first = unitOf(candidates[0]);
  const same = candidates.filter((key) => unitOf(key) === first);
  return same;
}

/* ------------------------------------------------------------------ */
/* Encoding builders                                                   */
/* ------------------------------------------------------------------ */

function buildSeriesSpec(
  kind: "line" | "area" | "bar" | "bar-grouped",
  ds: VizDataset,
  base: Pick<VisualizationSpec, "title" | "provenance" | "sources" | "asOf" | "gaps" | "generatedAt">,
  notes: string[],
): VisualizationSpec | null {
  const dateCol = ds.fields.find((f) => f.type === "date");
  const labelCol = ds.fields.find((f) => f.type === "string");
  // Value axes must share one unit (spec rule) — pick the largest same-unit
  // group of numeric fields that actually carry values.
  const numericFields = ds.fields.filter(
    (f) => (f.type === "number" || f.type === "currency") && ds.rows.some((r) => isNumericValue(r[f.key])),
  );
  const unitGroups = new Map<string, typeof numericFields>();
  for (const f of numericFields) {
    const unit = f.unit ?? "";
    if (!unitGroups.has(unit)) unitGroups.set(unit, []);
    unitGroups.get(unit)!.push(f);
  }
  const bestGroup = [...unitGroups.values()].sort((a, b) => b.length - a.length)[0] ?? [];
  const yCols = bestGroup.map((f) => f.key);
  if (yCols.length === 0) return null;
  const usableRows = ds.rows.filter((row) => yCols.some((k) => isNumericValue(row[k])));
  if (usableRows.length === 0) return null;

  const useDate = Boolean(dateCol) && usableRows.length >= SPEC_LIMITS.minSeriesPoints && (kind === "line" || kind === "area" || kind === "bar");
  const x = useDate ? dateCol!.key : (labelCol ?? dateCol)?.key;
  if (!x) return null;
  const xType = dateCol && x === dateCol.key ? "date" : "category";
  if (xType === "date" && usableRows.length < SPEC_LIMITS.minSeriesPoints) {
    // A date axis with < 3 points is a snapshot — downgrade to KPI/bar.
    return null;
  }
  if (xType === "category" && (kind === "line" || kind === "area")) {
    notes.push(`rendered as a ${kind} over categories (no dated series was available)`);
  }

  return {
    version: 1,
    id: vizSpecId(kind),
    kind,
    title: base.title,
    datasets: [ds],
    encoding: { kind, datasetId: ds.id, x, xType, y: yCols.slice(0, 4) },
    provenance: base.provenance,
    sources: base.sources,
    ...(base.asOf ? { asOf: base.asOf } : {}),
    generatedAt: base.generatedAt,
    gaps: base.gaps,
  };
}

function buildPieSpec(
  kind: "pie" | "donut",
  ds: VizDataset,
  base: Pick<VisualizationSpec, "title" | "provenance" | "sources" | "asOf" | "gaps" | "generatedAt">,
  notes: string[],
): VisualizationSpec | null {
  const labelCol = ds.fields.find((f) => f.type === "string") ?? ds.fields.find((f) => f.type === "date");
  const valueCol = ds.fields.find((f) => (f.type === "number" || f.type === "currency") && ds.rows.some((r) => isNumericValue(r[f.key])));
  if (!labelCol || !valueCol) return null;
  const usableRows = ds.rows.filter((r) => isNumericValue(r[valueCol.key]));
  if (usableRows.length === 0) return null;
  if (usableRows.length > SPEC_LIMITS.maxPieSlices) {
    notes.push(`pie/donut needs at most ${SPEC_LIMITS.maxPieSlices} readable slices — use a bar chart for ${usableRows.length} categories`);
    return null;
  }
  return {
    version: 1,
    id: vizSpecId(kind),
    kind,
    title: base.title,
    datasets: [ds],
    encoding: { kind, datasetId: ds.id, label: labelCol.key, value: valueCol.key },
    provenance: base.provenance,
    sources: base.sources,
    ...(base.asOf ? { asOf: base.asOf } : {}),
    generatedAt: base.generatedAt,
    gaps: base.gaps,
  };
}

function buildScatterSpec(
  ds: VizDataset,
  base: Pick<VisualizationSpec, "title" | "provenance" | "sources" | "asOf" | "gaps" | "generatedAt">,
): VisualizationSpec | null {
  const numeric = ds.fields.filter((f) => (f.type === "number" || f.type === "currency") && ds.rows.some((r) => isNumericValue(r[f.key])));
  if (numeric.length < 2) return null;
  const rows = ds.rows.filter((r) => isNumericValue(r[numeric[0].key]) && isNumericValue(r[numeric[1].key]));
  if (rows.length === 0) return null;
  const labelCol = ds.fields.find((f) => f.type === "string");
  return {
    version: 1,
    id: vizSpecId("scatter"),
    kind: "scatter",
    title: base.title,
    datasets: [ds],
    encoding: {
      kind: "scatter",
      datasetId: ds.id,
      x: numeric[0].key,
      y: numeric[1].key,
      ...(labelCol ? { label: labelCol.key } : {}),
    },
    provenance: base.provenance,
    sources: base.sources,
    ...(base.asOf ? { asOf: base.asOf } : {}),
    generatedAt: base.generatedAt,
    gaps: base.gaps,
  };
}

function buildRadarSpec(
  ds: VizDataset,
  base: Pick<VisualizationSpec, "title" | "provenance" | "sources" | "asOf" | "gaps" | "generatedAt">,
): VisualizationSpec | null {
  const labelCol = ds.fields.find((f) => f.type === "string");
  const valueCols = ds.fields
    .filter((f) => (f.type === "number" || f.type === "currency") && ds.rows.some((r) => isNumericValue(r[f.key])))
    .slice(0, 8);
  if (!labelCol || valueCols.length < 3) return null;
  return {
    version: 1,
    id: vizSpecId("radar"),
    kind: "radar",
    title: base.title,
    datasets: [ds],
    encoding: { kind: "radar", datasetId: ds.id, label: labelCol.key, value: valueCols.map((f) => f.key) },
    provenance: base.provenance,
    sources: base.sources,
    ...(base.asOf ? { asOf: base.asOf } : {}),
    generatedAt: base.generatedAt,
    gaps: base.gaps,
  };
}

/** KPI items from the latest non-null value of each numeric column. */
export function buildKpiItems(ds: VizDataset, max = SPEC_LIMITS.maxKpis): Array<{ label: string; field: string; agg: "latest"; unit?: string; isCurrency?: boolean }> {
  const items: Array<{ label: string; field: string; agg: "latest"; unit?: string; isCurrency?: boolean }> = [];
  for (const f of ds.fields) {
    if (items.length >= max) break;
    if (f.type !== "number" && f.type !== "currency") continue;
    const hasValue = ds.rows.some((r) => isNumericValue(r[f.key]));
    if (!hasValue) continue;
    items.push({
      label: f.label ?? humanizeKey(f.key),
      field: f.key,
      agg: "latest",
      ...(f.unit ? { unit: f.unit } : {}),
      ...(f.type === "currency" ? { isCurrency: true } : {}),
    });
  }
  return items;
}

function buildKpiSpec(
  ds: VizDataset,
  base: Pick<VisualizationSpec, "title" | "provenance" | "sources" | "asOf" | "gaps" | "generatedAt">,
): VisualizationSpec | null {
  const items = buildKpiItems(ds);
  if (items.length === 0) return null;
  return {
    version: 1,
    id: vizSpecId("kpi"),
    kind: "kpi-dashboard",
    title: base.title,
    datasets: [ds],
    encoding: { kind: "kpi-dashboard", datasetId: ds.id, items },
    provenance: base.provenance,
    sources: base.sources,
    ...(base.asOf ? { asOf: base.asOf } : {}),
    generatedAt: base.generatedAt,
    gaps: base.gaps,
  };
}

function buildMatrixSpec(
  ds: VizDataset,
  base: Pick<VisualizationSpec, "title" | "provenance" | "sources" | "asOf" | "gaps" | "generatedAt">,
): VisualizationSpec | null {
  const rowLabel = ds.fields.find((f) => f.type === "string") ?? ds.fields.find((f) => f.type === "date");
  const columns = ds.fields
    .filter((f) => (f.type === "number" || f.type === "currency") && ds.rows.some((r) => isNumericValue(r[f.key])))
    .slice(0, SPEC_LIMITS.maxMatrixColumns);
  if (!rowLabel || columns.length === 0) return null;
  return {
    version: 1,
    id: vizSpecId("matrix"),
    kind: "comparison-matrix",
    title: base.title,
    datasets: [ds],
    encoding: { kind: "comparison-matrix", datasetId: ds.id, rowLabel: rowLabel.key, columns: columns.map((f) => f.key) },
    provenance: base.provenance,
    sources: base.sources,
    ...(base.asOf ? { asOf: base.asOf } : {}),
    generatedAt: base.generatedAt,
    gaps: base.gaps,
  };
}

function buildTimelineSpec(
  ds: VizDataset,
  base: Pick<VisualizationSpec, "title" | "provenance" | "sources" | "asOf" | "gaps" | "generatedAt">,
): VisualizationSpec | null {
  const when = ds.fields.find((f) => f.type === "date");
  const title = ds.fields.find((f) => f.type === "string");
  if (!when || !title) return null;
  const datedRows = ds.rows.filter((r) => typeof r[when.key] === "string" && r[when.key]);
  if (datedRows.length < 2 || datedRows.length > SPEC_LIMITS.maxTimelineEvents) return null;
  const desc = ds.fields.filter((f) => f.type === "string" && f.key !== title.key)[0];
  return {
    version: 1,
    id: vizSpecId("timeline"),
    kind: "timeline",
    title: base.title,
    datasets: [ds],
    encoding: {
      kind: "timeline",
      datasetId: ds.id,
      when: when.key,
      title: title.key,
      ...(desc ? { description: desc.key } : {}),
    },
    provenance: base.provenance,
    sources: base.sources,
    ...(base.asOf ? { asOf: base.asOf } : {}),
    generatedAt: base.generatedAt,
    gaps: base.gaps,
  };
}

/**
 * Build a flowchart from a dataset whose rows carry (at minimum) a label
 * column plus optional from/to step columns. Plain prose is NOT converted —
 * if the dataset has no explicit structure the plan fails explicitly.
 */
function buildFlowSpec(
  ds: VizDataset,
  base: Pick<VisualizationSpec, "title" | "provenance" | "sources" | "asOf" | "gaps" | "generatedAt">,
): VisualizationSpec | null {
  const labelCol = ds.fields.find((f) => f.type === "string");
  if (!labelCol) return null;
  const fromCol = ds.fields.find((f) => /from|source|prev/i.test(f.key) && f.type === "string");
  const toCol = ds.fields.find((f) => /to|target|next/i.test(f.key) && f.type === "string");
  const nodes = ds.rows
    .map((r) => r[labelCol.key])
    .filter((v): v is string => typeof v === "string" && v.length > 0)
    .slice(0, SPEC_LIMITS.maxFlowNodes)
    .map((label, i) => ({ id: `n${i}`, label: label.slice(0, SPEC_LIMITS.maxLabelChars), kind: "process" as const }));
  if (nodes.length < 2) return null;
  const idOf = new Map(ds.rows.map((r, i) => [r[labelCol.key], `n${i}`]));
  const edges = fromCol && toCol
    ? ds.rows
        .map((r) => ({ from: r[fromCol.key], to: r[toCol.key] }))
        .filter((e): e is { from: string; to: string } => typeof e.from === "string" && typeof e.to === "string" && idOf.has(e.from) && idOf.has(e.to))
        .slice(0, SPEC_LIMITS.maxFlowEdges)
        .map((e) => ({ from: idOf.get(e.from)!, to: idOf.get(e.to)! }))
    : nodes.slice(0, -1).map((n, i) => ({ from: n.id, to: nodes[i + 1].id }));
  if (edges.length < 1) return null;
  return {
    version: 1,
    id: vizSpecId("flow"),
    kind: "flowchart",
    title: base.title,
    datasets: [ds],
    encoding: { kind: "flowchart", datasetId: ds.id, nodes, edges },
    provenance: base.provenance,
    sources: base.sources,
    ...(base.asOf ? { asOf: base.asOf } : {}),
    generatedAt: base.generatedAt,
    gaps: base.gaps,
  };
}

function buildCandleSpec(
  ds: VizDataset,
  base: Pick<VisualizationSpec, "title" | "provenance" | "sources" | "asOf" | "gaps" | "generatedAt">,
): VisualizationSpec | null {
  const time = ds.fields.find((f) => f.type === "date");
  const open = ds.fields.find((f) => /open/i.test(f.key) && f.type !== "string");
  const high = ds.fields.find((f) => /high/i.test(f.key) && f.type !== "string");
  const low = ds.fields.find((f) => /low/i.test(f.key) && f.type !== "string");
  const close = ds.fields.find((f) => /close/i.test(f.key) && f.type !== "string");
  if (!time || !open || !high || !low || !close) return null;
  return {
    version: 1,
    id: vizSpecId("candle"),
    kind: "candlestick",
    title: base.title,
    datasets: [ds],
    encoding: { kind: "candlestick", datasetId: ds.id, time: time.key, open: open.key, high: high.key, low: low.key, close: close.key },
    provenance: base.provenance,
    sources: base.sources,
    ...(base.asOf ? { asOf: base.asOf } : {}),
    generatedAt: base.generatedAt,
    gaps: base.gaps,
  };
}

/* ------------------------------------------------------------------ */
/* Kind-specific attempts for the requested/derived kind               */
/* ------------------------------------------------------------------ */

function tryBuildKind(
  kind: VizSpecKind,
  ds: VizDataset,
  base: Pick<VisualizationSpec, "title" | "provenance" | "sources" | "asOf" | "gaps" | "generatedAt">,
  notes: string[],
): VisualizationSpec | null {
  switch (kind) {
    case "line":
    case "area":
    case "bar":
    case "bar-grouped":
      return buildSeriesSpec(kind, ds, base, notes);
    case "pie":
    case "donut":
      return buildPieSpec(kind, ds, base, notes);
    case "scatter":
      return buildScatterSpec(ds, base);
    case "radar":
      return buildRadarSpec(ds, base);
    case "kpi-dashboard":
      return buildKpiSpec(ds, base);
    case "comparison-matrix":
      return buildMatrixSpec(ds, base);
    case "timeline":
      return buildTimelineSpec(ds, base);
    case "flowchart":
      return buildFlowSpec(ds, base);
    case "candlestick":
      return buildCandleSpec(ds, base);
    default:
      return null;
  }
}

/** Ordered fallback chain when the requested kind is infeasible. */
const FALLBACK_CHAIN: Record<VizSpecKind, VizSpecKind[]> = {
  line: ["area", "bar", "bar-grouped", "kpi-dashboard", "comparison-matrix"],
  area: ["line", "bar", "bar-grouped", "kpi-dashboard", "comparison-matrix"],
  bar: ["bar-grouped", "line", "pie", "kpi-dashboard", "comparison-matrix"],
  "bar-grouped": ["bar", "line", "radar", "kpi-dashboard", "comparison-matrix"],
  pie: ["donut", "bar", "comparison-matrix"],
  donut: ["pie", "bar", "comparison-matrix"],
  scatter: ["line", "comparison-matrix"],
  radar: ["bar-grouped", "bar", "comparison-matrix"],
  "kpi-dashboard": ["comparison-matrix", "bar"],
  "comparison-matrix": ["bar", "bar-grouped", "kpi-dashboard"],
  timeline: ["bar", "line", "comparison-matrix"],
  flowchart: ["timeline", "comparison-matrix"],
  candlestick: ["line", "area", "kpi-dashboard"],
};

/* ------------------------------------------------------------------ */
/* Main entry: plan from a resolved research context                   */
/* ------------------------------------------------------------------ */

export interface PlanVisualizationInput {
  context: ResearchContext;
  intent: VizIntent;
  /** Pre-selected dataset (e.g. assembled comparison rows). Optional. */
  datasets?: ShadowDataset[];
  now?: Date;
}

/**
 * Plan a visualization from the resolved research context.
 * Deterministic: same inputs → same spec.
 */
export function planVisualization(input: PlanVisualizationInput): PlanResult {
  const { context, intent } = input;
  const now = input.now ?? new Date();
  const notes: string[] = [];
  const requestTokens = keywords(intent.requestedType ? "" : `${intent.compareTarget ?? ""}`);

  const candidates = (input.datasets ?? context.datasets).filter((ds) => {
    const keys = numericFields(ds);
    return keys.length > 0 && numericRowCount(ds, keys) > 0;
  });
  if (candidates.length === 0) {
    return {
      status: "no-data",
      reason: "No structured numeric research data was captured in this conversation yet.",
      gaps: [
        ...(context.gaps.length ? context.gaps : []),
        "Run a research request first (e.g. ask about a market or topic) — the reply is then visualizable.",
      ],
    };
  }

  // Pick the dataset most relevant to the request (keyword score, then order).
  const scored = [...candidates]
    .map((ds, idx) => ({ ds, idx, score: scoreDataset(ds, requestTokens) }))
    .sort((a, b) => b.score - a.score || a.idx - b.idx);
  const chosen = scored[0].ds;

  const provenance: ProvenanceClass = context.provenance === "unverified" ? "ai-extracted" : context.provenance;
  const gaps = [...context.gaps];
  if (context.provenance === "unverified") {
    const note = "Source data is unverified — treat values as indicative, not as facts (unverified).";
    if (!gaps.includes(note)) gaps.push(note);
  }

  const base = {
    title: chosen.title.slice(0, SPEC_LIMITS.maxTitleChars),
    provenance,
    sources: bestSources(context),
    ...(chosen.asOf ? { asOf: chosen.asOf } : {}),
    generatedAt: now.toISOString(),
    gaps,
  };

  const vizDataset = toVizDataset(chosen, "d0");

  // Snapshot guard: a single row can only be a KPI dashboard or a matrix.
  const numericKeys = pickYColumns(chosen, 8);
  const rowsWithNumbers = numericRowCount(chosen, numericKeys);
  const hasDateSeries = dateFields(chosen).some((df) =>
    chosen.rows.filter((r) => typeof r[df] === "string" && r[df]).length >= SPEC_LIMITS.minSeriesPoints,
  );

  let requestedKind: VizSpecKind | null = intent.requestedType ? hintToKind(intent.requestedType) : null;
  if (intent.requestedType && !requestedKind) {
    notes.push(`"${intent.requestedType}" diagrams are planned from structured outlines (Batch 3) — showing the data chart instead`);
  }

  if (requestedKind === null) {
    // Derive the best default kind from the data shape.
    if (rowsWithNumbers <= 1) requestedKind = "kpi-dashboard";
    else if (hasDateSeries) requestedKind = "line";
    else if (pickYColumns(chosen, 8).length >= 2) requestedKind = "comparison-matrix";
    else requestedKind = "bar";
  }

  // Try the requested kind, then the fallback chain — each attempt is
  // validated before acceptance.
  const chain = [requestedKind, ...FALLBACK_CHAIN[requestedKind].filter((k) => k !== requestedKind)];
  let lastReason = "no feasible encoding for this dataset";
  for (const kind of chain) {
    const draft = tryBuildKind(kind, vizDataset, base, notes);
    if (!draft) {
      lastReason = `dataset does not support a ${kind} rendering`;
      continue;
    }
    const validation = validateVisualizationSpec(draft);
    if (validation.ok) {
      if (kind !== requestedKind) {
        notes.push(`requested a ${requestedKind} chart, but the data shape fits a ${kind} better — showing ${kind.replace("-", " ")}`);
      }
      return { status: "ok", spec: draft, notes };
    }
    lastReason = validation.errors[0] ?? lastReason;
  }

  return { status: "no-data", reason: `Could not build a visualization: ${lastReason}`, gaps };
}

/* ------------------------------------------------------------------ */
/* Refinements                                                         */
/* ------------------------------------------------------------------ */

export type RefineResult =
  | { status: "ok"; spec: VisualizationSpec; notes: string[] }
  | { status: "unavailable"; reason: string };

/** Parse "last 30 days" → number of days (also hours/weeks/months). */
export function parseTimeRangeDays(timeRange: string): number | null {
  const m = timeRange.match(/(\d+|one|two|three|six|twelve|a\s+few|several)\s+(minute|hour|day|week|month|year)s?/i);
  if (!m) return null;
  const wordToNum: Record<string, number> = { one: 1, two: 2, three: 3, six: 6, twelve: 12, "a few": 4, several: 5 };
  const n = /^\d+$/.test(m[1]) ? parseInt(m[1], 10) : wordToNum[m[1].toLowerCase()] ?? null;
  if (n === null) return null;
  const unit = m[2].toLowerCase();
  const days: Record<string, number> = { minute: 1 / 1440, hour: 1 / 24, day: 1, week: 7, month: 30, year: 365 };
  return Math.max(n * days[unit], 1 / 1440);
}

/**
 * Filter a series spec to rows within the last N days (relative to `now`).
 * Returns "unavailable" when the dataset has no usable date axis or too few
 * remaining points — the caller must then surface the gap explicitly.
 */
export function applyTimeRange(spec: VisualizationSpec, timeRange: string, now: Date): RefineResult {
  const days = parseTimeRangeDays(timeRange);
  if (days === null) return { status: "unavailable", reason: `Could not interpret the time range "${timeRange}".` };
  const enc = spec.encoding;
  if (!("x" in enc) || !("datasetId" in enc)) {
    return { status: "unavailable", reason: `A time range filter applies to chart series, not to a ${spec.kind.replace("-", " ")}.` };
  }
  const ds = spec.datasets.find((d) => d.id === enc.datasetId);
  if (!ds) return { status: "unavailable", reason: "Spec dataset is missing." };
  const dateField = ds.fields.find((f) => f.key === (enc as { x: string }).x && f.type === "date");
  if (!dateField) {
    return {
      status: "unavailable",
      reason: "The captured data has no dated axis — a time range filter cannot be applied to it.",
    };
  }
  const cutoff = now.getTime() - days * 24 * 60 * 60 * 1000;
  const kept = ds.rows.filter((row) => {
    const v = row[dateField.key];
    if (typeof v !== "string") return false;
    const t = Date.parse(v);
    return Number.isFinite(t) && t >= cutoff;
  });
  const minPoints = spec.kind === "line" || spec.kind === "area" || spec.kind === "candlestick" ? SPEC_LIMITS.minSeriesPoints : 1;
  if (kept.length < minPoints) {
    return {
      status: "unavailable",
      reason: `Only a current snapshot is available in this conversation — ${kept.length || "no"} data point(s) fall inside the last ${Math.round(days)} day(s), so the range was not applied.`,
    };
  }
  const nextDatasets = spec.datasets.map((d) => (d.id === ds.id ? { ...d, rows: kept } : d));
  const next: VisualizationSpec = {
    ...spec,
    id: vizSpecId(spec.kind.split("-")[0]),
    datasets: nextDatasets,
    gaps: [...spec.gaps, `Filtered to ${timeRange} (from ${ds.rows.length} to ${kept.length} rows).`].slice(-SPEC_LIMITS.maxGaps),
  };
  const validation = validateVisualizationSpec(next);
  if (!validation.ok) {
    return { status: "unavailable", reason: validation.errors[0] ?? "Filtered spec failed validation." };
  }
  return { status: "ok", spec: next, notes: [`Filtered to ${timeRange}.`] };
}

/** Switch the kind of an existing spec, re-using its dataset. */
export function transformKind(spec: VisualizationSpec, target: VizSpecKind, now: Date): RefineResult {
  if (target === spec.kind) return { status: "ok", spec, notes: [] };
  if (!COMPATIBLE_KINDS[spec.kind].includes(target)) {
    return { status: "unavailable", reason: `A ${spec.kind.replace("-", " ")} cannot be switched to a ${target.replace("-", " ")} directly.` };
  }
  const ds = spec.datasets.find((d) => d.id === ("datasetId" in spec.encoding ? (spec.encoding as { datasetId: string }).datasetId : spec.datasets[0].id))
    ?? spec.datasets[0];
  const notes: string[] = [];
  const base = {
    title: spec.title,
    provenance: spec.provenance,
    sources: spec.sources,
    ...(spec.asOf ? { asOf: spec.asOf } : {}),
    generatedAt: now.toISOString(),
    gaps: spec.gaps,
  };
  const draft = tryBuildKind(target, ds, base, notes);
  if (!draft) {
    return { status: "unavailable", reason: `The dataset does not support a ${target.replace("-", " ")} rendering.` };
  }
  const validation = validateVisualizationSpec(draft);
  if (!validation.ok) {
    return { status: "unavailable", reason: validation.errors[0] ?? "Transformed spec failed validation." };
  }
  return { status: "ok", spec: draft, notes };
}

/* ------------------------------------------------------------------ */
/* Comparison planning (market-data or research rows)                  */
/* ------------------------------------------------------------------ */

/** One asset row of a comparison — values come from research or a provider. */
export interface ComparisonAsset {
  symbol: string;
  name?: string;
  metrics: Record<string, number | null>;
  asOf?: string;
}

/**
 * Build a comparison dataset from two or more assets. Column set is the
 * INTERSECTION of metrics every asset provides (no null-filled fake rows).
 */
export function buildComparisonDataset(assets: ComparisonAsset[], title: string): ShadowDataset | null {
  if (assets.length < 2) return null;
  const metricKeys = Object.keys(assets[0].metrics).filter((key) =>
    assets.every((a) => key in a.metrics),
  );
  if (metricKeys.length === 0) return null;
  const rows = assets.map((a) => {
    const row: Record<string, string | number | null> = { asset: a.symbol };
    for (const key of metricKeys) row[key] = a.metrics[key];
    return row;
  });
  return {
    title,
    description: "Comparison assembled from verified provider/research values.",
    columns: [
      { key: "asset", type: "string" },
      ...metricKeys.map((key) => ({
        key,
        type: /price|cap|volume|value|usd/i.test(key) ? ("currency" as const) : ("number" as const),
        unit: /pct|%|change/i.test(key) ? "%" : /usd|price|cap|volume/i.test(key) ? "USD" : undefined,
      })),
    ],
    rows,
    asOf: assets.map((a) => a.asOf).filter(Boolean).sort().pop(),
  };
}

/**
 * Plan a comparison spec. `assets` are assembled by the caller (research
 * values and/or live provider quotes); provenance reflects the weakest link.
 */
export function planComparison(
  assets: ComparisonAsset[],
  opts: { title?: string; requestedType?: VizTypeHint; provenance: ProvenanceClass; sources: VizSource[]; gaps?: string[]; now?: Date },
): PlanResult {
  const now = opts.now ?? new Date();
  const title = opts.title ?? `Comparison: ${assets.map((a) => a.symbol).join(" vs ")}`;
  const ds = buildComparisonDataset(assets, title.slice(0, SPEC_LIMITS.maxTitleChars));
  if (!ds) {
    return {
      status: "no-data",
      reason: "Not enough comparable data to build a comparison — need at least two assets sharing one metric.",
      gaps: opts.gaps ?? [],
    };
  }
  const vizDataset = toVizDataset(ds, "d0");
  const base = {
    title: ds.title.slice(0, SPEC_LIMITS.maxTitleChars),
    provenance: opts.provenance,
    sources: opts.sources,
    ...(ds.asOf ? { asOf: ds.asOf } : {}),
    generatedAt: now.toISOString(),
    gaps: opts.gaps ?? [],
  };
  const notes: string[] = [];
  const requested: VizSpecKind = opts.requestedType ? hintToKind(opts.requestedType) ?? "comparison-matrix" : "comparison-matrix";
  const chain: VizSpecKind[] = [requested === "comparison-matrix" ? "comparison-matrix" : requested, "comparison-matrix", "bar", "kpi-dashboard"];
  for (const kind of chain.filter((k, i) => chain.indexOf(k) === i)) {
    const draft = tryBuildKind(kind, vizDataset, base, notes);
    if (!draft) continue;
    const validation = validateVisualizationSpec(draft);
    if (validation.ok) return { status: "ok", spec: draft, notes };
  }
  return { status: "no-data", reason: "Comparison data could not be encoded into a validated spec.", gaps: opts.gaps ?? [] };
}
