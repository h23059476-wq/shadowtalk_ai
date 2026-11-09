/**
 * Timeline renderer (Batch 2) — a specification-driven event rail.
 * Semantic list markup (accessible, wraps long titles on mobile) with a
 * spec-computed chronological order; events are capped by the schema at
 * 60 and sorted by their date column (re-dated events never invented).
 */

import React from "react";
import type { VizDataset, VisualizationSpec } from "@/lib/visualization/spec";

export function TimelineDiagramRenderer({ spec }: { spec: VisualizationSpec }) {
  const enc = spec.encoding;
  if (enc.kind !== "timeline") return null;
  const ds = spec.datasets.find((d) => d.id === enc.datasetId);
  if (!ds) return null;

  const events = ds.rows
    .filter((r) => typeof r[enc.when] === "string" && r[enc.when])
    .map((r) => ({
      when: r[enc.when] as string,
      title: String(r[enc.title] ?? "").slice(0, 120),
      description: enc.description && typeof r[enc.description] === "string" ? (r[enc.description] as string).slice(0, 200) : "",
      t: Date.parse(String(r[enc.when])),
    }))
    .filter((e) => Number.isFinite(e.t))
    .sort((a, b) => a.t - b.t)
    .slice(0, 60);

  return (
    <ol className="relative ml-1 space-y-4 border-l border-border/60 pl-5" aria-label={spec.title}>
      {events.map((e, i) => (
        <li key={i} className="relative">
          <span
            aria-hidden
            className="absolute -left-[25px] top-1.5 h-2.5 w-2.5 rounded-full border-2 border-background bg-primary"
          />
          <p className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground tabular-nums">
            {new Date(e.t).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })}
          </p>
          <p className="mt-0.5 text-sm font-medium text-foreground">{e.title || "—"}</p>
          {e.description && <p className="mt-0.5 text-[13px] leading-relaxed text-muted-foreground">{e.description}</p>}
        </li>
      ))}
    </ol>
  );
}
