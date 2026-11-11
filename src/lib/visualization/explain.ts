/**
 * Research-to-Visualization — deterministic chart explanation (Batch 2).
 *
 * "Explain this chart" must describe the ACTUAL displayed dataset — never
 * invented information. This module therefore generates the explanation
 * from the spec itself: counts, ranges, min/max/latest/average per series,
 * freshness, provenance and sources. Every number in the output is computed
 * from `spec.datasets` right here.
 */

import type { VizDataset, VizField, VisualizationSpec } from "./spec";
import { SPEC_LIMITS } from "./spec";

const isNum = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);

export function formatNumber(n: number): string {
  if (!Number.isFinite(n)) return "—";
  const abs = Math.abs(n);
  if (abs >= 1e12) return `${(n / 1e12).toFixed(2)}T`;
  if (abs >= 1e9) return `${(n / 1e9).toFixed(2)}B`;
  if (abs >= 1e6) return `${(n / 1e6).toFixed(2)}M`;
  if (abs >= 1e3) return `${(n / 1e3).toFixed(2)}K`;
  if (abs !== 0 && abs < 0.0001) return n.toExponential(2);
  return Number(n.toFixed(4)).toString();
}

export function formatSpecValue(n: number, field?: VizField): string {
  const prefix = field?.type === "currency" ? "$" : "";
  const suffix = field?.unit === "%" ? "%" : field?.unit && field.unit !== "%" ? ` ${field.unit}` : "";
  return `${prefix}${formatNumber(n)}${suffix}`;
}

function fieldOf(ds: VizDataset, key: string): VizField | undefined {
  return ds.fields.find((f) => f.key === key);
}

interface SeriesStats {
  key: string;
  count: number;
  min: number;
  max: number;
  latest: number | null;
  avg: number | null;
  first: number | null;
}

/**
 * Rows in chronological order: when the dataset has a date column, sort by
 * it so "first/latest" mean actual time order (research data is sometimes
 * newest-first); otherwise keep the stored order.
 */
function rowsInOrder(ds: VizDataset): Array<Record<string, string | number | null>> {
  const dateField = ds.fields.find((f) => f.type === "date");
  if (!dateField) return ds.rows;
  return [...ds.rows].sort((a, b) => {
    const ta = Date.parse(String(a[dateField.key] ?? ""));
    const tb = Date.parse(String(b[dateField.key] ?? ""));
    return (Number.isFinite(ta) ? ta : Infinity) - (Number.isFinite(tb) ? tb : Infinity);
  });
}

function seriesStats(ds: VizDataset, key: string): SeriesStats | null {
  const ordered = rowsInOrder(ds);
  const values = ordered.map((r) => r[key]).filter(isNum);
  if (values.length === 0) return null;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const latest = ordered.reduce<number | null>((acc, r) => (isNum(r[key]) ? (r[key] as number) : acc), null);
  const first = ordered.find((r) => isNum(r[key]))?.[key] as number | undefined ?? null;
  const avg = values.reduce((a, b) => a + b, 0) / values.length;
  return { key, count: values.length, min, max, latest: latest ?? null, avg, first };
}

function describeSeriesChange(stats: SeriesStats): string {
  if (stats.first !== null && stats.latest !== null && stats.first !== 0) {
    const pct = ((stats.latest - stats.first) / Math.abs(stats.first)) * 100;
    if (Number.isFinite(pct) && Math.abs(pct) >= 0.01) {
      return `moving ${pct >= 0 ? "up" : "down"} ~${Math.abs(pct).toFixed(1)}% across the shown range`;
    }
  }
  if (stats.max !== stats.min) return `ranging between ${formatNumber(stats.min)} and ${formatNumber(stats.max)}`;
  return "holding a flat value across the shown range";
}

function kindPhrase(kind: VisualizationSpec["kind"]): string {
  switch (kind) {
    case "line": return "line chart";
    case "bar": return "bar chart";
    case "bar-grouped": return "grouped bar chart";
    case "area": return "area chart";
    case "pie": return "pie chart";
    case "donut": return "donut chart";
    case "scatter": return "scatter plot";
    case "radar": return "radar chart";
    case "kpi-dashboard": return "KPI dashboard";
    case "comparison-matrix": return "comparison matrix";
    case "timeline": return "timeline";
    case "flowchart": return "flowchart";
    case "candlestick": return "candlestick chart";
  }
}

function explainChart(spec: VisualizationSpec): string[] {
  const lines: string[] = [];
  const enc = spec.encoding;
  if (enc.kind === "scatter" || !("x" in enc) || !("y" in enc) || !Array.isArray(enc.y)) return lines;
  const ds = spec.datasets.find((d) => d.id === enc.datasetId);
  if (!ds) return lines;

  {
    const encY = enc.y;
    lines.push(
      `The chart plots ${ds.rows.length} ${enc.xType === "date" ? "dated" : "category"} point${ds.rows.length === 1 ? "" : "s"} from **${ds.title}**.`,
    );
    for (const key of encY.slice(0, 4)) {
      const stats = seriesStats(ds, key);
      if (!stats) continue;
      const field = fieldOf(ds, key);
      lines.push(
        `- **${field?.label ?? key}** (${formatSpecValue(stats.latest ?? stats.min, field)} latest of ${stats.count} values): ${describeSeriesChange(stats)}.`,
      );
    }
  }
  return lines;
}

function explainShare(spec: VisualizationSpec): string[] {
  const lines: string[] = [];
  const enc = spec.encoding;
  if (enc.kind !== "pie" && enc.kind !== "donut") return lines;
  const ds = spec.datasets.find((d) => d.id === enc.datasetId);
  if (!ds) return lines;
  const values = ds.rows.map((r) => r[enc.value]).filter(isNum);
  const total = values.reduce((a, b) => a + b, 0);
  lines.push(`The chart breaks **${ds.title}** into ${values.length} segment${values.length === 1 ? "" : "s"} totalling ${formatNumber(total)}.`);
  const top = ds.rows
    .filter((r) => isNum(r[enc.value]))
    .sort((a, b) => (b[enc.value] as number) - (a[enc.value] as number))
    .slice(0, 3);
  for (const row of top) {
    const v = row[enc.value] as number;
    const share = total !== 0 ? ` (${((v / total) * 100).toFixed(1)}%)` : "";
    lines.push(`- **${String(row[enc.label]).slice(0, SPEC_LIMITS.maxLabelChars)}**: ${formatNumber(v)}${share}.`);
  }
  return lines;
}

function explainKpi(spec: VisualizationSpec): string[] {
  const lines: string[] = [];
  const enc = spec.encoding;
  if (!("items" in enc)) return lines;
  const ds = spec.datasets.find((d) => d.id === enc.datasetId);
  if (!ds) return lines;
  lines.push(`The dashboard shows ${enc.items.length} indicator${enc.items.length === 1 ? "" : "s"} from **${ds.title}**.`);
  for (const item of enc.items.slice(0, SPEC_LIMITS.maxKpis)) {
    const stats = seriesStats(ds, item.field);
    if (!stats) continue;
    const field = fieldOf(ds, item.field);
    const value = item.agg === "latest" ? stats.latest : item.agg === "avg" ? stats.avg : item.agg === "min" ? stats.min : item.agg === "max" ? stats.max : stats.latest;
    if (value === null) continue;
    lines.push(`- **${item.label}**: ${formatSpecValue(value, field ?? undefined)}${stats.count > 1 ? ` (across ${stats.count} captured values)` : ""}.`);
  }
  return lines;
}

function explainMatrix(spec: VisualizationSpec): string[] {
  const lines: string[] = [];
  const enc = spec.encoding;
  if (!("rowLabel" in enc)) return lines;
  const ds = spec.datasets.find((d) => d.id === enc.datasetId);
  if (!ds) return lines;
  lines.push(`The matrix compares ${ds.rows.length} row${ds.rows.length === 1 ? "" : "s"} across ${enc.columns.length} metric${enc.columns.length === 1 ? "" : "s"}.`);
  for (const key of enc.columns.slice(0, 4)) {
    const field = fieldOf(ds, key);
    const rows = ds.rows.filter((r) => isNum(r[key]));
    if (rows.length === 0) continue;
    const best = rows.reduce((a, b) => ((b[key] as number) > (a[key] as number) ? b : a));
    lines.push(
      `- **${field?.label ?? key}**: highest is **${String(best[enc.rowLabel])}** at ${formatSpecValue(best[key] as number, field)}.`,
    );
  }
  return lines;
}

function explainCandle(spec: VisualizationSpec): string[] {
  const lines: string[] = [];
  const enc = spec.encoding;
  if (enc.kind !== "candlestick") return lines;
  const ds = spec.datasets.find((d) => d.id === enc.datasetId);
  if (!ds) return lines;
  const closes = ds.rows.map((r) => r[enc.close]).filter(isNum);
  if (closes.length >= 2) {
    const first = closes[0];
    const last = closes[closes.length - 1];
    const pct = ((last - first) / Math.abs(first)) * 100;
    lines.push(
      `The chart shows ${closes.length} candlesticks; close moved from ${formatNumber(first)} to ${formatNumber(last)} (${pct >= 0 ? "+" : ""}${pct.toFixed(2)}%).`,
    );
  }
  const highs = ds.rows.map((r) => r[enc.high]).filter(isNum);
  const lows = ds.rows.map((r) => r[enc.low]).filter(isNum);
  if (highs.length && lows.length) {
    lines.push(`Range in view: low ${formatNumber(Math.min(...lows))} to high ${formatNumber(Math.max(...highs))}.`);
  }
  return lines;
}

/**
 * Escape "$" so deterministic narration (which often contains two or more
 * currency values) is never mistaken for inline math by the chat's
 * remark-math pipeline.
 */
export function escapeDollarsForMarkdown(text: string): string {
  return text.replace(/\$/g, "\\$");
}

/**
 * Produce a deterministic, grounded explanation of the spec.
 * The output contains ONLY values computed from spec.datasets plus the
 * spec's own provenance/sources/gaps metadata.
 */
export function explainVisualization(spec: VisualizationSpec): string {
  const parts: string[] = [];
  parts.push(`### ${spec.title}`);
  parts.push(`This is a ${kindPhrase(spec.kind)} rendered from structured research data — every number below is read directly from the displayed dataset.`);

  switch (spec.encoding.kind) {
    case "kpi-dashboard":
      parts.push(...explainKpi(spec));
      break;
    case "comparison-matrix":
      parts.push(...explainMatrix(spec));
      break;
    case "candlestick":
      parts.push(...explainCandle(spec));
      break;
    case "pie":
    case "donut":
      parts.push(...explainShare(spec));
      break;
    default:
      parts.push(...explainChart(spec));
  }

  // Freshness / provenance — always honest about what backs the numbers.
  const provenanceLine =
    spec.provenance === "source-verified"
      ? "All values trace to the sources listed below (source-verified)."
      : spec.provenance === "ai-extracted"
        ? "Values were extracted by the model from cited research — labelled accordingly (ai-extracted)."
        : "No source evidence backs these values — treat them as indicative only (unverified).";
  parts.push(provenanceLine);
  if (spec.asOf) {
    parts.push(`Data as of: ${spec.asOf}. Captured: ${spec.generatedAt}.`);
  }

  if (spec.sources.length > 0) {
    const sourceLines = spec.sources.slice(0, 5).map((s) => `- [${s.name ?? s.url}](${s.url})`);
    parts.push(`**Sources**\n${sourceLines.join("\n")}`);
  }
  if (spec.gaps.length > 0) {
    parts.push(`**Declared gaps**: ${spec.gaps.slice(0, 4).join("; ")}.`);
  }
  return escapeDollarsForMarkdown(parts.join("\n\n"));
}
