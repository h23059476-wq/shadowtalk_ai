/**
 * Compact card replacing the raw ```shadowdata JSON dump inside an assistant
 * message (Batch 1). The full JSON stays in message content/persistence —
 * this card only SUMMARIZES it for chat readability. Everything renders as
 * React text nodes (no HTML injection surface).
 */

import React from "react";
import { Database, AlertTriangle } from "lucide-react";
import { extractResearchDataBlocks } from "@/lib/visualization/dataDoc";

interface ResearchDataCardProps {
  /** Raw JSON body of the ```shadowdata fence. */
  raw: string;
}

export const ResearchDataCard: React.FC<ResearchDataCardProps> = ({ raw }) => {
  const summary = React.useMemo(() => {
    const { blocks, invalidCount } = extractResearchDataBlocks(
      "```shadowdata\n" + raw + "\n```",
    );
    if (blocks.length === 0) {
      return { ok: false as const, invalidCount };
    }
    const datasetCount = blocks.reduce((n, b) => n + b.datasets.length, 0);
    const rowCount = blocks.reduce(
      (n, b) => n + b.datasets.reduce((m, ds) => m + ds.rows.length, 0),
      0,
    );
    const sourceCount = blocks.reduce((n, b) => n + b.sources.length, 0);
    const gapCount = blocks.reduce((n, b) => n + b.gaps.length, 0);
    return { ok: true as const, datasetCount, rowCount, sourceCount, gapCount };
  }, [raw]);

  if (!summary.ok) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-warning/30 bg-warning/5 px-3 py-2 text-xs text-muted-foreground my-2">
        <AlertTriangle className="h-3.5 w-3.5 text-warning" />
        <span>Research data block could not be validated — values withheld.</span>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border/40 bg-card/60 backdrop-blur-md px-3 py-2.5 my-2 text-xs">
      <div className="flex items-center gap-2 text-foreground/80 font-medium">
        <Database className="h-3.5 w-3.5 text-primary" />
        Structured research data captured
      </div>
      <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1.5 text-muted-foreground">
        <span>
          {summary.datasetCount} dataset{summary.datasetCount === 1 ? "" : "s"}
        </span>
        <span aria-hidden className="text-muted-foreground/30">·</span>
        <span>{summary.rowCount} row{summary.rowCount === 1 ? "" : "s"}</span>
        <span aria-hidden className="text-muted-foreground/30">·</span>
        <span>{summary.sourceCount} source{summary.sourceCount === 1 ? "" : "s"}</span>
        {summary.gapCount > 0 && (
          <>
            <span aria-hidden className="text-muted-foreground/30">·</span>
            <span className="text-warning">
              {summary.gapCount} gap{summary.gapCount === 1 ? "" : "s"} declared
            </span>
          </>
        )}
      </div>
      <p className="mt-1 text-[11px] text-muted-foreground/50">
        Usable for visualization — ask ShadowTalk to chart it.
      </p>
    </div>
  );
};
