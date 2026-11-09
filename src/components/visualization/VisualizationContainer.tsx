/**
 * VisualizationContainer (Batch 2) — the trusted frame around every
 * visualization artifact in chat.
 *
 * Capabilities: view inline; expand into a dialog; inspect the underlying
 * dataset (table); see sources, retrieval timestamps and provider
 * attribution; switch to compatible chart kinds (via onTransformKind).
 *
 * Security: specs arrive pre-validated (parseVisualizationSpec); strings
 * are rendered as React text only; there is no HTML injection surface.
 */

import React, { useMemo, useState } from "react";
import {
  Activity,
  BarChart3,
  CalendarClock,
  CandlestickChart,
  ChevronDown,
  ExternalLink,
  Expand,
  GitBranch,
  LayoutDashboard,
  Layers3,
  LineChart,
  ListTree,
  ListChecks,
  Network,
  PieChart,
  Radar as RadarIcon,
  Scale,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Table2,
  Tag,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { VizSpecKind, VisualizationSpec } from "@/lib/visualization/spec";
import { COMPATIBLE_KINDS } from "@/lib/visualization/spec";
import { DataChartRenderer } from "./DataChartRenderer";
import { KpiDashboardRenderer } from "./KpiDashboardRenderer";
import { ComparisonMatrixRenderer } from "./ComparisonMatrixRenderer";
import { TimelineDiagramRenderer } from "./TimelineDiagramRenderer";
import { FlowchartDiagramRenderer } from "./FlowchartDiagramRenderer";
import { ConceptualDiagramRenderer } from "./ConceptualDiagramRenderer";
import { formatFullTimestamp, freshnessLabel, provenanceBadge } from "./vizTheme";

const KIND_ICON: Record<VizSpecKind, React.ComponentType<{ className?: string }>> = {
  line: LineChart,
  area: Activity,
  bar: BarChart3,
  "bar-grouped": BarChart3,
  pie: PieChart,
  donut: PieChart,
  scatter: Activity,
  radar: RadarIcon,
  "kpi-dashboard": LayoutDashboard,
  "comparison-matrix": Scale,
  timeline: ListTree,
  flowchart: GitBranch,
  candlestick: CandlestickChart,
  // Batch 3 — conceptual
  mindmap: Network,
  roadmap: ListChecks,
  "decision-tree": GitBranch,
  architecture: Layers3,
  framework: Sparkles,
};

const KIND_LABEL: Record<VizSpecKind, string> = {
  line: "Line chart",
  area: "Area chart",
  bar: "Bar chart",
  "bar-grouped": "Grouped bars",
  pie: "Pie chart",
  donut: "Donut chart",
  scatter: "Scatter plot",
  radar: "Radar chart",
  "kpi-dashboard": "KPI dashboard",
  "comparison-matrix": "Comparison matrix",
  timeline: "Timeline",
  flowchart: "Flowchart",
  candlestick: "Candlestick",
  // Batch 3 — conceptual
  mindmap: "Mind map",
  roadmap: "Roadmap",
  "decision-tree": "Decision tree",
  architecture: "Architecture diagram",
  framework: "Strategic framework",
};

export interface VisualizationContainerProps {
  spec: VisualizationSpec;
  /** Called when the user picks a compatible kind (refine flow). */
  onTransformKind?: (spec: VisualizationSpec, target: VizSpecKind) => void;
  /** Set when a requested transform is infeasible — shown as a note. */
  transformNote?: string;
  defaultExpanded?: boolean;
}

function SpecBody({ spec, height }: { spec: VisualizationSpec; height?: number }) {
  switch (spec.encoding.kind) {
    case "kpi-dashboard":
      return <KpiDashboardRenderer spec={spec} />;
    case "comparison-matrix":
      return <ComparisonMatrixRenderer spec={spec} />;
    case "timeline":
      return <TimelineDiagramRenderer spec={spec} />;
    case "flowchart":
      return <FlowchartDiagramRenderer spec={spec} />;
    // Batch 3 — conceptual kinds share one trusted renderer.
    case "mindmap":
    case "roadmap":
    case "decision-tree":
    case "architecture":
    case "framework":
      return <ConceptualDiagramRenderer spec={spec} height={height} />;
    default:
      return <DataChartRenderer spec={spec} height={height} />;
  }
}

function DatasetInspector({ spec }: { spec: VisualizationSpec }) {
  return (
    <div className="space-y-4">
      {spec.datasets.map((ds) => (
        <div key={ds.id}>
          <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            {ds.title} {ds.asOf ? <span className="font-normal normal-case">· as of {formatFullTimestamp(ds.asOf)}</span> : null}
          </p>
          <div className="max-h-72 overflow-auto rounded-lg border border-border/40">
            <table className="min-w-full text-xs">
              <thead className="sticky top-0 bg-muted/40 backdrop-blur">
                <tr>
                  {ds.fields.map((f) => (
                    <th key={f.key} className="whitespace-nowrap px-3 py-2 text-left font-semibold text-muted-foreground">
                      {f.label ?? f.key}
                      <span className="ml-1 font-normal text-muted-foreground/50">{f.unit ? `(${f.unit})` : f.type}</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ds.rows.slice(0, 200).map((row, i) => (
                  <tr key={i} className="border-t border-border/20">
                    {ds.fields.map((f) => (
                      <td key={f.key} className="whitespace-nowrap px-3 py-1.5 tabular-nums text-foreground/85">
                        {row[f.key] === null || row[f.key] === undefined ? "—" : String(row[f.key])}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {ds.rows.length > 200 && (
            <p className="mt-1 text-[11px] text-muted-foreground/60">Showing first 200 of {ds.rows.length} rows.</p>
          )}
        </div>
      ))}
    </div>
  );
}

function SourceList({ spec }: { spec: VisualizationSpec }) {
  if (spec.sources.length === 0) {
    return <p className="text-xs text-muted-foreground">No source URLs were captured for this data.</p>;
  }
  return (
    <ul className="space-y-1.5">
      {spec.sources.map((s, i) => (
        <li key={i} className="text-xs">
          <a
            href={s.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex max-w-full items-center gap-1.5 text-blue-400/90 hover:text-blue-300 hover:underline"
          >
            <ExternalLink className="h-3 w-3 shrink-0" />
            <span className="truncate">{s.name || s.url}</span>
          </a>
          {(s.dataTimestamp || s.retrievedAt) && (
            <span className="ml-2 whitespace-nowrap text-[10px] text-muted-foreground/60">
              {s.dataTimestamp ? `data: ${formatFullTimestamp(s.dataTimestamp)}` : ""}
              {s.dataTimestamp && s.retrievedAt ? " · " : ""}
              {s.retrievedAt ? `retrieved: ${formatFullTimestamp(s.retrievedAt)}` : ""}
            </span>
          )}
        </li>
      ))}
    </ul>
  );
}

export const VisualizationContainer: React.FC<VisualizationContainerProps> = ({
  spec,
  onTransformKind,
  transformNote,
  defaultExpanded = false,
}) => {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const Icon = KIND_ICON[spec.kind] ?? Activity;
  const badge = provenanceBadge(spec.provenance);
  const compatibleKinds = useMemo(() => COMPATIBLE_KINDS[spec.kind] ?? [], [spec.kind]);

  return (
    <div className="w-full overflow-hidden rounded-2xl border border-border/50 bg-card/40 shadow-sm">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-2 border-b border-border/30 px-4 pb-2.5 pt-3">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon className="h-3.5 w-3.5" />
        </span>
        <p className="mr-auto min-w-0 flex-1 truncate text-sm font-semibold text-foreground" title={spec.title}>
          {spec.title}
        </p>
        <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${badge.className}`}>
          {spec.provenance === "unverified" ? <ShieldAlert className="h-3 w-3" /> : <ShieldCheck className="h-3 w-3" />}
          {badge.label}
        </span>
        {spec.asOf && (
          <span
            className="inline-flex items-center gap-1 rounded-full border border-border/40 bg-muted/20 px-2 py-0.5 text-[10px] font-medium text-muted-foreground"
            title={`Data as of ${formatFullTimestamp(spec.asOf)}`}
          >
            <CalendarClock className="h-3 w-3" />
            {freshnessLabel(spec.asOf)}
          </span>
        )}
      </div>

      {/* Body */}
      <div className="px-4 py-3">
        <SpecBody spec={spec} />
      </div>

      {/* Footer / toolbar */}
      <div className="flex flex-wrap items-center gap-1.5 border-t border-border/30 px-3 py-2">
        {/* Chart type switcher */}
        {onTransformKind && compatibleKinds.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-7 gap-1.5 px-2.5 text-[11px] text-muted-foreground hover:text-foreground">
                <BarChart3 className="h-3 w-3" />
                {KIND_LABEL[spec.kind]}
                <ChevronDown className="h-3 w-3 opacity-60" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-48">
              <DropdownMenuLabel className="text-[11px] text-muted-foreground">Show as</DropdownMenuLabel>
              {compatibleKinds.map((kind) => (
                <DropdownMenuItem key={kind} onClick={() => onTransformKind(spec, kind)} className="gap-2 text-[13px]">
                  {React.createElement(KIND_ICON[kind] ?? Activity, { className: "h-3.5 w-3.5" })}
                  {KIND_LABEL[kind]}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        {/* Expand + inspect dialog */}
        <Dialog onOpenChange={setExpanded}>
          <DialogTrigger asChild>
            <Button variant="ghost" size="sm" className="h-7 gap-1.5 px-2.5 text-[11px] text-muted-foreground hover:text-foreground">
              <Expand className="h-3 w-3" />
              Expand
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto sm:max-w-3xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-base">
                <Icon className="h-4 w-4 text-primary" />
                {spec.title}
              </DialogTitle>
              <DialogDescription className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                <span className={badge.className + " rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider"}>
                  {badge.label}
                </span>
                {spec.asOf && <span>Data as of {formatFullTimestamp(spec.asOf)}</span>}
                <span>Captured {formatFullTimestamp(spec.generatedAt)}</span>
              </DialogDescription>
            </DialogHeader>

            <div className="mt-2">
              <SpecBody spec={spec} height={420} />
            </div>

            <div className="mt-4">
              <h4 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                <Table2 className="h-3.5 w-3.5" /> Underlying data
              </h4>
              <DatasetInspector spec={spec} />
            </div>

            <div className="mt-4">
              <h4 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                <ShieldCheck className="h-3.5 w-3.5" /> Sources & timestamps
              </h4>
              <SourceList spec={spec} />
            </div>

            {spec.gaps.length > 0 && (
              <div className="mt-4 rounded-lg border border-amber-400/20 bg-amber-400/[0.04] px-3 py-2.5">
                <h4 className="mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-amber-300/80">
                  <ShieldAlert className="h-3.5 w-3.5" /> Known gaps
                </h4>
                <ul className="list-disc space-y-1 pl-4 text-xs text-muted-foreground">
                  {spec.gaps.map((g, i) => (
                    <li key={i}>{g}</li>
                  ))}
                </ul>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Provider attribution */}
        <span className="ml-auto inline-flex items-center gap-1 text-[10px] text-muted-foreground/50" title="Market-data provider attribution">
          <Tag className="h-3 w-3" />
          {spec.sources.length > 0 ? `${spec.sources.length} source${spec.sources.length === 1 ? "" : "s"}` : "no sources"}
        </span>
      </div>

      {transformNote && (
        <p className="border-t border-border/30 px-4 py-2 text-[11px] text-amber-300/80">{transformNote}</p>
      )}
    </div>
  );
};

export default VisualizationContainer;
