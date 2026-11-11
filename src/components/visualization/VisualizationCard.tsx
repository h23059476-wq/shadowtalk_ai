/**
 * VisualizationCard (Batch 2) — the lazy entry point MessageBubble renders.
 *
 * Keeping this file tiny means the chat bundle never pulls Recharts (or any
 * visualization code) until a message actually carries a visualization
 * artifact — the container + renderers live in their own async chunk.
 *
 * An invalid/failed spec renders a compact, honest error card instead of
 * breaking the message list (defense in depth on top of spec validation).
 */

import React, { Suspense } from "react";
import { Activity } from "lucide-react";
import { parseVisualizationSpec } from "@/lib/visualization/spec";
import type { VizSpecKind, VisualizationSpec } from "@/lib/visualization/spec";

const VisualizationContainer = React.lazy(() => import("./VisualizationContainer"));

export interface VisualizationCardProps {
  spec: unknown;
  onTransformKind?: (spec: VisualizationSpec, target: VizSpecKind) => void;
  transformNote?: string;
}

function VizSkeleton() {
  return (
    <div className="w-full animate-pulse rounded-2xl border border-border/40 bg-card/30 p-4" aria-busy="true" aria-label="Loading visualization">
      <div className="mb-3 flex items-center gap-2">
        <div className="h-7 w-7 rounded-lg bg-muted/60" />
        <div className="h-3.5 w-48 rounded bg-muted/60" />
      </div>
      <div className="h-[220px] w-full rounded-xl bg-muted/30" />
    </div>
  );
}

function InvalidSpecCard({ reason }: { reason: string }) {
  return (
    <div className="flex w-full items-start gap-2.5 rounded-2xl border border-amber-400/25 bg-amber-400/[0.04] px-4 py-3">
      <Activity className="mt-0.5 h-4 w-4 shrink-0 text-amber-300/80" />
      <div className="min-w-0">
        <p className="text-sm font-medium text-foreground/90">Visualization unavailable</p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          The visualization data did not pass validation and was not rendered. {reason}
        </p>
      </div>
    </div>
  );
}

export const VisualizationCard: React.FC<VisualizationCardProps> = ({ spec, onTransformKind, transformNote }) => {
  const parsed = parseVisualizationSpec(spec);
  if (!parsed) {
    return <InvalidSpecCard reason="Ask the assistant to rebuild it from the research data." />;
  }
  return (
    <Suspense fallback={<VizSkeleton />}>
      <VisualizationContainer spec={parsed} onTransformKind={onTransformKind} transformNote={transformNote} />
    </Suspense>
  );
};
