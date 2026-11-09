/**
 * Comparison matrix renderer (Batch 2) — a readable, spec-driven table.
 * The best value per numeric column is highlighted (deterministic, computed
 * from the dataset — no invented emphasis).
 */

import React from "react";
import type { VizDataset, VisualizationSpec } from "@/lib/visualization/spec";
import { humanizeKey } from "@/lib/visualization/spec";
import { formatWithField } from "./vizTheme";

const isNum = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);

export function ComparisonMatrixRenderer({ spec }: { spec: VisualizationSpec }) {
  const enc = spec.encoding;
  if (enc.kind !== "comparison-matrix") return null;
  const ds = spec.datasets.find((d) => d.id === enc.datasetId);
  if (!ds) return null;
  const rowLabelField = ds.fields.find((f) => f.key === enc.rowLabel);

  // Highest value per column gets a subtle highlight (only when >1 row).
  const maxByColumn = new Map<string, number>();
  if (ds.rows.length > 1) {
    for (const key of enc.columns) {
      const values = ds.rows.map((r) => r[key]).filter(isNum);
      if (values.length > 1) maxByColumn.set(key, Math.max(...values));
    }
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-border/40">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="border-b border-border/40 bg-muted/20">
            <th scope="col" className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
              {rowLabelField?.label ?? humanizeKey(enc.rowLabel)}
            </th>
            {enc.columns.map((key) => {
              const field = ds.fields.find((f) => f.key === key);
              return (
                <th
                  key={key}
                  scope="col"
                  className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-widest text-muted-foreground"
                >
                  {field?.label ?? humanizeKey(key)}
                  {field?.unit ? <span className="ml-1 font-normal normal-case text-muted-foreground/60">({field.unit})</span> : null}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {ds.rows.map((row, i) => (
            <tr key={i} className="border-b border-border/20 last:border-0 hover:bg-muted/10 transition-colors">
              <td className="px-4 py-3 font-medium text-foreground">
                {String(row[enc.rowLabel] ?? "—").slice(0, 60)}
              </td>
              {enc.columns.map((key) => {
                const v = row[key];
                const field = ds.fields.find((f) => f.key === key);
                const isMax = maxByColumn.get(key) !== undefined && v === maxByColumn.get(key);
                return (
                  <td
                    key={key}
                    className={`px-4 py-3 text-right tabular-nums ${
                      isMax ? "font-semibold text-cyan-300" : "text-foreground/85"
                    }`}
                  >
                    {isNum(v) ? formatWithField(v, field) : v === null || v === undefined ? "—" : String(v)}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
