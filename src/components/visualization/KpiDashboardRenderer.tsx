/**
 * KPI dashboard renderer (Batch 2) — cards computed from the spec dataset.
 * Each indicator is the aggregated value of a numeric column ("latest" by
 * default); formatting follows the column's type/unit.
 */

import React from "react";
import { Minus, TrendingDown, TrendingUp } from "lucide-react";
import type { VizDataset, VisualizationSpec } from "@/lib/visualization/spec";
import { formatWithField } from "./vizTheme";

const isNum = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);

interface KpiValue {
  value: number;
  /** Value of the previous non-null row, when one exists. */
  previous: number | null;
}

function aggregate(ds: VizDataset, field: string, agg: "latest" | "sum" | "avg" | "min" | "max"): KpiValue | null {
  // Chronological order when a date column exists — "latest" must mean the
  // most recent data point, not the last array element (research data is
  // sometimes newest-first).
  const dateField = ds.fields.find((f) => f.type === "date");
  const rows = dateField
    ? [...ds.rows].sort((a, b) => {
        const ta = Date.parse(String(a[dateField.key] ?? ""));
        const tb = Date.parse(String(b[dateField.key] ?? ""));
        return (Number.isFinite(ta) ? ta : Infinity) - (Number.isFinite(tb) ? tb : Infinity);
      })
    : ds.rows;
  const values = rows.map((r) => r[field]).filter(isNum);
  if (values.length === 0) return null;
  let value: number;
  switch (agg) {
    case "sum": value = values.reduce((a, b) => a + b, 0); break;
    case "avg": value = values.reduce((a, b) => a + b, 0) / values.length; break;
    case "min": value = Math.min(...values); break;
    case "max": value = Math.max(...values); break;
    case "latest":
    default: value = values[values.length - 1]; break;
  }
  const latestIdx = rows.reduce((acc, r, i) => (isNum(r[field]) ? i : acc), -1);
  const previous = agg === "latest" && latestIdx > 0 && isNum(rows[latestIdx - 1][field])
    ? (rows[latestIdx - 1][field] as number)
    : null;
  return { value, previous };
}

export function KpiDashboardRenderer({ spec }: { spec: VisualizationSpec }) {
  const enc = spec.encoding;
  if (enc.kind !== "kpi-dashboard") return null;
  const ds = spec.datasets.find((d) => d.id === enc.datasetId);
  if (!ds) return null;
  const cols = enc.items.length <= 2 ? "grid-cols-2" : enc.items.length <= 4 ? "grid-cols-2 md:grid-cols-4" : "grid-cols-2 md:grid-cols-3";

  return (
    <div className={`grid gap-2.5 ${cols}`} role="list" aria-label={spec.title}>
      {enc.items.map((item) => {
        const field = ds.fields.find((f) => f.key === item.field);
        const kpi = aggregate(ds, item.field, item.agg);
        if (!kpi) return null;
        const delta = kpi.previous !== null && kpi.previous !== 0
          ? ((kpi.value - kpi.previous) / Math.abs(kpi.previous)) * 100
          : null;
        return (
          <div
            key={item.field}
            role="listitem"
            className="rounded-xl border border-border/50 bg-card/60 px-3.5 py-3 transition-colors hover:border-primary/30"
          >
            <p className="truncate text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
              {item.label}
            </p>
            <p className="mt-1.5 truncate text-xl font-semibold tracking-tight text-foreground tabular-nums" title={String(kpi.value)}>
              {formatWithField(kpi.value, { type: field?.type, unit: item.unit ?? field?.unit })}
            </p>
            {delta !== null && (
              <p className={`mt-1 flex items-center gap-1 text-[11px] font-medium ${delta >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                {delta >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                {delta >= 0 ? "+" : ""}{delta.toFixed(2)}% vs previous
              </p>
            )}
            {delta === null && (
              <p className="mt-1 flex items-center gap-1 text-[11px] text-muted-foreground/60">
                <Minus className="h-3 w-3" /> no prior value
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}
