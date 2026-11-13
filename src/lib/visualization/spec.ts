/**
 * Research-to-Visualization — the typed visualization contract (Batch 2).
 *
 * ARCHITECTURE (approved D1): the AI never produces executable code or HTML.
 * A visualization is described by a `VisualizationSpec` — a strictly
 * validated, closed JSON document that only ever REFERENCES columns of a
 * typed dataset. Rendering is done by trusted React/SVG/Recharts components
 * that read the spec; spec strings are never interpreted as markup.
 *
 * Security invariants enforced here:
 *  - closed schema: unknown keys are stripped/rejected (no smuggling),
 *  - every axis/value reference must exist in the referenced dataset,
 *  - all string fields are length-capped plain text (renderers treat them
 *    as text nodes — React escapes them, no HTML injection surface),
 *  - source URLs must be http(s) (javascript:/data: rejected),
 *  - payload caps (datasets, rows, chars) so a spec can never blow up the
 *    renderer or the encrypted metadata column,
 *  - units must be consistent within one chart's value axes,
 *  - time-series kinds require a real series (>= 3 points) and never
 *    render a single snapshot as history,
 *  - candlestick requires complete, sane OHLC rows (high >= open/close,
 *    low <= open/close) — otherwise it is rejected with a clear reason.
 */

import { z } from "zod";
import type { ProvenanceClass, ShadowDataset } from "./types";

/**
 * Supported spec kinds. Batch 2: data-chart kinds. Batch 3 adds five
 * CONCEPTUAL kinds (mindmap, roadmap, decision-tree, architecture,
 * framework) — label-only structures with NO numeric data surface, so an
 * AI-authored conceptual spec can never present a fabricated number as
 * fact. Workflow/process-flow diagrams remain on "flowchart"; project
 * plans map onto "roadmap" (phases + item status); org/hierarchy charts
 * map onto "mindmap" with a tree layout; strategic frameworks (SWOT,
 * pillars) map onto "framework".
 */
export type VizSpecKind =
  | "line"
  | "bar"
  | "bar-grouped"
  | "area"
  | "pie"
  | "donut"
  | "scatter"
  | "radar"
  | "kpi-dashboard"
  | "comparison-matrix"
  | "timeline"
  | "flowchart"
  | "candlestick"
  // Batch 3 — conceptual (AI-assisted, spec-driven SVG renderers)
  | "mindmap"
  | "roadmap"
  | "decision-tree"
  | "architecture"
  | "framework";

export const VIZ_SPEC_KINDS: VizSpecKind[] = [
  "line", "bar", "bar-grouped", "area", "pie", "donut", "scatter", "radar",
  "kpi-dashboard", "comparison-matrix", "timeline", "flowchart", "candlestick",
  "mindmap", "roadmap", "decision-tree", "architecture", "framework",
];

/** Kinds whose spec is a conceptual structure (Batch 3) instead of data. */
export const CONCEPTUAL_KINDS: VizSpecKind[] = [
  "mindmap", "roadmap", "decision-tree", "architecture", "framework",
];

export function isConceptualKind(kind: VizSpecKind): boolean {
  return CONCEPTUAL_KINDS.includes(kind);
}

export const VIZ_SPEC_VERSION = 1;

/* ------------------------------------------------------------------ */
/* Size caps                                                           */
/* ------------------------------------------------------------------ */

export const SPEC_LIMITS = {
  maxDatasets: 4,
  maxRowsPerDataset: 1000,
  maxTotalRows: 2000,
  maxFieldsPerDataset: 24,
  maxTitleChars: 160,
  maxDescriptionChars: 600,
  maxLabelChars: 120,
  maxKeyChars: 64,
  maxGaps: 16,
  maxGapChars: 300,
  maxSources: 24,
  maxKpis: 8,
  maxMatrixColumns: 8,
  maxTimelineEvents: 60,
  maxFlowNodes: 24,
  maxFlowEdges: 40,
  // Batch 3 — conceptual structure caps.
  maxMindNodes: 60,
  maxMindDepth: 6,
  maxRoadmapPhases: 8,
  maxRoadmapItemsPerPhase: 12,
  maxArchitectureLayers: 6,
  maxArchitectureComponentsPerLayer: 8,
  maxArchitectureConnections: 24,
  maxFrameworkSections: 6,
  maxFrameworkItemsPerSection: 12,
  /** Hard cap on the serialized spec (mirrors the metadata column budget). */
  maxSerializedChars: 120_000,
  /** A time series needs at least this many points. */
  minSeriesPoints: 3,
  /** Pie/donut readable slice cap. */
  maxPieSlices: 8,
} as const;

/* ------------------------------------------------------------------ */
/* Datasets (render-ready — planner derives these from research data)   */
/* ------------------------------------------------------------------ */

const fieldSchema = z.object({
  key: z.string().min(1).max(SPEC_LIMITS.maxKeyChars),
  label: z.string().max(SPEC_LIMITS.maxLabelChars).optional(),
  type: z.enum(["date", "number", "string", "currency"]),
  unit: z.string().max(32).optional(),
});

const vizDatasetSchema = z.object({
  id: z.string().min(1).max(64),
  title: z.string().min(1).max(SPEC_LIMITS.maxTitleChars),
  fields: z.array(fieldSchema).min(1).max(SPEC_LIMITS.maxFieldsPerDataset),
  rows: z
    .array(z.record(z.union([z.string().max(1024), z.number(), z.null()])))
    .max(SPEC_LIMITS.maxRowsPerDataset),
  asOf: z.string().max(64).optional(),
});

// NOTE: this repo's tsconfig has strict:false, under which zod's z.infer
// degrades every field to optional (the same pitfall Batch 1's dataDoc.ts
// documents). The hand-written interfaces below are the REAL contract;
// zod is used only for runtime validation and results are cast to them
// after a successful parse.

export interface VizField {
  key: string;
  label?: string;
  type: "date" | "number" | "string" | "currency";
  unit?: string;
}

export interface VizDataset {
  id: string;
  title: string;
  fields: VizField[];
  rows: Array<Record<string, string | number | null>>;
  asOf?: string;
}

/* ------------------------------------------------------------------ */
/* Sources / provenance                                                */
/* ------------------------------------------------------------------ */

const specSourceSchema = z
  .object({
    url: z.string().max(2048),
    name: z.string().max(SPEC_LIMITS.maxLabelChars).optional(),
    retrievedAt: z.string().max(64).optional(),
    dataTimestamp: z.string().max(64).optional(),
  })
  .superRefine((s, ctx) => {
    let parsed: URL;
    try {
      parsed = new URL(s.url);
    } catch {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "source url is not a valid URL" });
      return;
    }
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: `source url protocol must be http(s), got ${parsed.protocol}` });
    }
  });

export type VizSource = {
  url: string;
  name?: string;
  retrievedAt?: string;
  dataTimestamp?: string;
};

/* ------------------------------------------------------------------ */
/* Per-kind encodings — every key must exist in the dataset            */
/* ------------------------------------------------------------------ */

const seriesEncoding = z.object({
  datasetId: z.string().min(1).max(64),
  x: z.string().min(1).max(SPEC_LIMITS.maxKeyChars),
  /** x acts as a category axis when the column is not a date. */
  xType: z.enum(["date", "category"]),
  y: z.array(z.string().min(1).max(SPEC_LIMITS.maxKeyChars)).min(1).max(6),
});

const pieEncoding = z.object({
  datasetId: z.string().min(1).max(64),
  label: z.string().min(1).max(SPEC_LIMITS.maxKeyChars),
  value: z.string().min(1).max(SPEC_LIMITS.maxKeyChars),
});

const scatterEncoding = z.object({
  datasetId: z.string().min(1).max(64),
  x: z.string().min(1).max(SPEC_LIMITS.maxKeyChars),
  y: z.string().min(1).max(SPEC_LIMITS.maxKeyChars),
  label: z.string().max(SPEC_LIMITS.maxKeyChars).optional(),
});

const radarEncoding = z.object({
  datasetId: z.string().min(1).max(64),
  label: z.string().min(1).max(SPEC_LIMITS.maxKeyChars),
  value: z.array(z.string().min(1).max(SPEC_LIMITS.maxKeyChars)).min(3).max(12),
});

const kpiItemSchema = z.object({
  label: z.string().min(1).max(SPEC_LIMITS.maxLabelChars),
  field: z.string().min(1).max(SPEC_LIMITS.maxKeyChars),
  agg: z.enum(["latest", "sum", "avg", "min", "max"]),
  unit: z.string().max(32).optional(),
  isCurrency: z.boolean().optional(),
  deltaField: z.string().max(SPEC_LIMITS.maxKeyChars).optional(),
});

const kpiEncoding = z.object({
  datasetId: z.string().min(1).max(64),
  items: z.array(kpiItemSchema).min(1).max(SPEC_LIMITS.maxKpis),
});

const matrixEncoding = z.object({
  datasetId: z.string().min(1).max(64),
  rowLabel: z.string().min(1).max(SPEC_LIMITS.maxKeyChars),
  columns: z.array(z.string().min(1).max(SPEC_LIMITS.maxKeyChars)).min(1).max(SPEC_LIMITS.maxMatrixColumns),
  note: z.string().max(SPEC_LIMITS.maxDescriptionChars).optional(),
});

const timelineEncoding = z.object({
  datasetId: z.string().min(1).max(64),
  when: z.string().min(1).max(SPEC_LIMITS.maxKeyChars),
  title: z.string().min(1).max(SPEC_LIMITS.maxKeyChars),
  description: z.string().max(SPEC_LIMITS.maxKeyChars).optional(),
});

const flowNodeSchema = z.object({
  id: z.string().min(1).max(64),
  label: z.string().min(1).max(SPEC_LIMITS.maxLabelChars),
  kind: z.enum(["start", "process", "decision", "end"]).optional(),
});

const flowEdgeSchema = z.object({
  from: z.string().min(1).max(64),
  to: z.string().min(1).max(64),
  label: z.string().max(SPEC_LIMITS.maxLabelChars).optional(),
});

const flowEncoding = z.object({
  datasetId: z.string().max(64).optional(),
  nodes: z.array(flowNodeSchema).min(2).max(SPEC_LIMITS.maxFlowNodes),
  edges: z.array(flowEdgeSchema).min(1).max(SPEC_LIMITS.maxFlowEdges),
});

/* ------------------------------------------------------------------ */
/* Batch 3 — conceptual encodings (label-only structures; NO numeric   */
/* data surface, so a fabricated number can never be rendered)         */
/* ------------------------------------------------------------------ */

const mindNodeSchema = z.object({
  id: z.string().min(1).max(64),
  label: z.string().min(1).max(SPEC_LIMITS.maxLabelChars),
  /** Parent node id; the single node without a parent is the root. */
  parent: z.string().min(1).max(64).optional(),
  note: z.string().max(SPEC_LIMITS.maxGapChars).optional(),
});

const mindEncoding = z.object({
  layout: z.enum(["radial", "tree"]).optional(),
  nodes: z.array(mindNodeSchema).min(2).max(SPEC_LIMITS.maxMindNodes),
});

const roadmapStatus = z.enum(["planned", "in-progress", "done", "at-risk"]);

const roadmapItemSchema = z.object({
  id: z.string().min(1).max(64),
  label: z.string().min(1).max(SPEC_LIMITS.maxLabelChars),
  status: roadmapStatus.optional(),
  note: z.string().max(SPEC_LIMITS.maxGapChars).optional(),
});

const roadmapPhaseSchema = z.object({
  id: z.string().min(1).max(64),
  label: z.string().min(1).max(SPEC_LIMITS.maxLabelChars),
  /** Declared timeframe as plain text (e.g. "Q1 2026") — never inferred. */
  timeframe: z.string().max(64).optional(),
  items: z.array(roadmapItemSchema).min(1).max(SPEC_LIMITS.maxRoadmapItemsPerPhase),
});

const roadmapEncoding = z.object({
  phases: z.array(roadmapPhaseSchema).min(1).max(SPEC_LIMITS.maxRoadmapPhases),
});

const decisionNodeSchema = z.object({
  id: z.string().min(1).max(64),
  label: z.string().min(1).max(SPEC_LIMITS.maxLabelChars),
  kind: z.enum(["decision", "option", "outcome"]).optional(),
});

const decisionEdgeSchema = z.object({
  from: z.string().min(1).max(64),
  to: z.string().min(1).max(64),
  /** Condition guarding the edge (e.g. "yes", "price rises"). */
  label: z.string().max(SPEC_LIMITS.maxLabelChars).optional(),
});

const decisionEncoding = z.object({
  nodes: z.array(decisionNodeSchema).min(2).max(SPEC_LIMITS.maxFlowNodes),
  edges: z.array(decisionEdgeSchema).min(1).max(SPEC_LIMITS.maxFlowEdges),
});

const archComponentSchema = z.object({
  id: z.string().min(1).max(64),
  label: z.string().min(1).max(SPEC_LIMITS.maxLabelChars),
  note: z.string().max(SPEC_LIMITS.maxGapChars).optional(),
});

const archLayerSchema = z.object({
  id: z.string().min(1).max(64),
  label: z.string().min(1).max(SPEC_LIMITS.maxLabelChars),
  components: z
    .array(archComponentSchema)
    .min(1)
    .max(SPEC_LIMITS.maxArchitectureComponentsPerLayer),
});

const archConnectionSchema = z.object({
  from: z.string().min(1).max(64),
  to: z.string().min(1).max(64),
  label: z.string().max(SPEC_LIMITS.maxLabelChars).optional(),
});

const architectureEncoding = z.object({
  layers: z.array(archLayerSchema).min(1).max(SPEC_LIMITS.maxArchitectureLayers),
  connections: z.array(archConnectionSchema).max(SPEC_LIMITS.maxArchitectureConnections).optional(),
});

const frameworkSectionSchema = z.object({
  id: z.string().min(1).max(64),
  label: z.string().min(1).max(SPEC_LIMITS.maxLabelChars),
  /** Quadrant tone for SWOT-style sections. */
  tone: z.enum(["positive", "negative", "neutral"]).optional(),
  items: z
    .array(z.string().min(1).max(SPEC_LIMITS.maxLabelChars))
    .min(1)
    .max(SPEC_LIMITS.maxFrameworkItemsPerSection),
});

const frameworkEncoding = z.object({
  layout: z.enum(["quadrant", "pillars"]).optional(),
  sections: z.array(frameworkSectionSchema).min(2).max(SPEC_LIMITS.maxFrameworkSections),
});

const candleEncoding = z.object({
  datasetId: z.string().min(1).max(64),
  time: z.string().min(1).max(SPEC_LIMITS.maxKeyChars),
  open: z.string().min(1).max(SPEC_LIMITS.maxKeyChars),
  high: z.string().min(1).max(SPEC_LIMITS.maxKeyChars),
  low: z.string().min(1).max(SPEC_LIMITS.maxKeyChars),
  close: z.string().min(1).max(SPEC_LIMITS.maxKeyChars),
  volume: z.string().max(SPEC_LIMITS.maxKeyChars).optional(),
});

const encodingSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("line"), ...seriesEncoding.shape }),
  z.object({ kind: z.literal("area"), ...seriesEncoding.shape }),
  z.object({ kind: z.literal("bar"), ...seriesEncoding.shape }),
  z.object({ kind: z.literal("bar-grouped"), ...seriesEncoding.shape }),
  z.object({ kind: z.literal("pie"), ...pieEncoding.shape }),
  z.object({ kind: z.literal("donut"), ...pieEncoding.shape }),
  z.object({ kind: z.literal("scatter"), ...scatterEncoding.shape }),
  z.object({ kind: z.literal("radar"), ...radarEncoding.shape }),
  z.object({ kind: z.literal("kpi-dashboard"), ...kpiEncoding.shape }),
  z.object({ kind: z.literal("comparison-matrix"), ...matrixEncoding.shape }),
  z.object({ kind: z.literal("timeline"), ...timelineEncoding.shape }),
  z.object({ kind: z.literal("flowchart"), ...flowEncoding.shape }),
  z.object({ kind: z.literal("candlestick"), ...candleEncoding.shape }),
  // Batch 3 — conceptual kinds
  z.object({ kind: z.literal("mindmap"), ...mindEncoding.shape }),
  z.object({ kind: z.literal("roadmap"), ...roadmapEncoding.shape }),
  z.object({ kind: z.literal("decision-tree"), ...decisionEncoding.shape }),
  z.object({ kind: z.literal("architecture"), ...architectureEncoding.shape }),
  z.object({ kind: z.literal("framework"), ...frameworkEncoding.shape }),
]);

export type VizEncoding =
  | ({ kind: "line" | "area" | "bar" | "bar-grouped" } & { datasetId: string; x: string; xType: "date" | "category"; y: string[] })
  | ({ kind: "pie" | "donut" } & { datasetId: string; label: string; value: string })
  | ({ kind: "scatter" } & { datasetId: string; x: string; y: string; label?: string })
  | ({ kind: "radar" } & { datasetId: string; label: string; value: string[] })
  | ({ kind: "kpi-dashboard" } & { datasetId: string; items: Array<{ label: string; field: string; agg: "latest" | "sum" | "avg" | "min" | "max"; unit?: string; isCurrency?: boolean; deltaField?: string }> })
  | ({ kind: "comparison-matrix" } & { datasetId: string; rowLabel: string; columns: string[]; note?: string })
  | ({ kind: "timeline" } & { datasetId: string; when: string; title: string; description?: string })
  | ({ kind: "flowchart" } & { datasetId?: string; nodes: Array<{ id: string; label: string; kind?: "start" | "process" | "decision" | "end" }>; edges: Array<{ from: string; to: string; label?: string }> })
  | ({ kind: "candlestick" } & { datasetId: string; time: string; open: string; high: string; low: string; close: string; volume?: string })
  // Batch 3 — conceptual
  | ({ kind: "mindmap" } & { layout?: "radial" | "tree"; nodes: Array<{ id: string; label: string; parent?: string; note?: string }> })
  | ({ kind: "roadmap" } & { phases: Array<{ id: string; label: string; timeframe?: string; items: Array<{ id: string; label: string; status?: "planned" | "in-progress" | "done" | "at-risk"; note?: string }> }> })
  | ({ kind: "decision-tree" } & { nodes: Array<{ id: string; label: string; kind?: "decision" | "option" | "outcome" }>; edges: Array<{ from: string; to: string; label?: string }> })
  | ({ kind: "architecture" } & { layers: Array<{ id: string; label: string; components: Array<{ id: string; label: string; note?: string }> }>; connections?: Array<{ from: string; to: string; label?: string }> })
  | ({ kind: "framework" } & { layout?: "quadrant" | "pillars"; sections: Array<{ id: string; label: string; tone?: "positive" | "negative" | "neutral"; items: string[] }> });

/* ------------------------------------------------------------------ */
/* The spec                                                            */
/* ------------------------------------------------------------------ */

export const visualizationSpecSchema = z.object({
  version: z.literal(VIZ_SPEC_VERSION),
  id: z.string().min(1).max(64),
  kind: z.enum(VIZ_SPEC_KINDS as [VizSpecKind, ...VizSpecKind[]]),
  title: z.string().min(1).max(SPEC_LIMITS.maxTitleChars),
  description: z.string().max(SPEC_LIMITS.maxDescriptionChars).optional(),
  // Conceptual kinds (Batch 3) are structure-first and carry no datasets;
  // data-driven kinds are required to have ≥1 dataset in cross-field
  // validation (requireDatasetsForDataKinds below).
  datasets: z.array(vizDatasetSchema).min(0).max(SPEC_LIMITS.maxDatasets),
  encoding: encodingSchema,
  provenance: z.enum(["source-verified", "ai-extracted", "unverified"]),
  sources: z.array(specSourceSchema).max(SPEC_LIMITS.maxSources),
  asOf: z.string().max(64).optional(),
  generatedAt: z.string().min(1).max(64),
  gaps: z.array(z.string().max(SPEC_LIMITS.maxGapChars)).max(SPEC_LIMITS.maxGaps),
});

export type VisualizationSpec = {
  version: 1;
  id: string;
  kind: VizSpecKind;
  title: string;
  description?: string;
  datasets: VizDataset[];
  encoding: VizEncoding;
  provenance: ProvenanceClass;
  sources: VizSource[];
  asOf?: string;
  generatedAt: string;
  gaps: string[];
};

/* ------------------------------------------------------------------ */
/* Cross-field validation                                              */
/* ------------------------------------------------------------------ */

export interface SpecValidationResult {
  ok: boolean;
  errors: string[];
}

/** Data-driven kinds must reference at least one real dataset. */
const DATA_KINDS: VizSpecKind[] = [
  "line", "bar", "bar-grouped", "area", "pie", "donut", "scatter", "radar",
  "kpi-dashboard", "comparison-matrix", "timeline", "candlestick",
];

function requireDatasetsForDataKinds(spec: VisualizationSpec, errors: string[]): void {
  if (DATA_KINDS.includes(spec.kind) && spec.datasets.length < 1) {
    errors.push(`a "${spec.kind}" chart requires at least one dataset`);
  }
}

/**
 * Walk the parent chain of a mind node to detect cycles and over-deep
 * branches. A malformed tree (parent loop, depth > maxMindDepth) is
 * rejected — never silently flattened.
 */
function mindDepthAndCycleCheck(
  nodes: Array<{ id: string; parent?: string }>,
  errors: string[],
): void {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  let rootCount = 0;
  for (const node of nodes) {
    if (!node.parent) rootCount += 1;
    else if (!byId.has(node.parent)) {
      errors.push(`mindmap node "${node.id}" references unknown parent "${node.parent}"`);
    }
  }
  if (rootCount !== 1) {
    errors.push(`mindmap must have exactly one root node (no parent), found ${rootCount}`);
  }
  for (const node of nodes) {
    const seen = new Set<string>([node.id]);
    let current = node;
    let depth = 0;
    while (current.parent) {
      if (seen.has(current.parent)) {
        errors.push(`mindmap contains a parent cycle at node "${current.id}"`);
        break;
      }
      seen.add(current.parent);
      const next = byId.get(current.parent);
      if (!next) break;
      current = next;
      depth += 1;
      if (depth > SPEC_LIMITS.maxMindDepth) {
        errors.push(`mindmap branch depth exceeds the maximum of ${SPEC_LIMITS.maxMindDepth} at node "${node.id}"`);
        break;
      }
    }
  }
}

function validateMindKind(spec: VisualizationSpec, enc: { nodes: Array<{ id: string; parent?: string }> }, errors: string[]): void {
  const ids = new Set(enc.nodes.map((n) => n.id));
  if (ids.size !== enc.nodes.length) errors.push("mindmap node ids must be unique");
  mindDepthAndCycleCheck(enc.nodes, errors);
}

function validateRoadmapKind(spec: VisualizationSpec, enc: { phases: Array<{ id: string; items: Array<{ id: string }> }> }, errors: string[]): void {
  const phaseIds = new Set(enc.phases.map((p) => p.id));
  if (phaseIds.size !== enc.phases.length) errors.push("roadmap phase ids must be unique");
  for (const phase of enc.phases) {
    const itemIds = new Set(phase.items.map((i) => i.id));
    if (itemIds.size !== phase.items.length) {
      errors.push(`roadmap phase "${phase.id}" has duplicate item ids`);
    }
  }
}

function validateDecisionKind(spec: VisualizationSpec, enc: { nodes: Array<{ id: string; label?: string; kind?: string }>; edges: Array<{ from: string; to: string; label?: string }> }, errors: string[]): void {
  const nodeIds = new Set(enc.nodes.map((n) => n.id));
  if (nodeIds.size !== enc.nodes.length) errors.push("decision-tree node ids must be unique");
  const byId = new Map(enc.nodes.map((n) => [n.id, n]));
  for (const edge of enc.edges) {
    if (!nodeIds.has(edge.from)) errors.push(`decision-tree edge references unknown node "${edge.from}"`);
    if (!nodeIds.has(edge.to)) errors.push(`decision-tree edge references unknown node "${edge.to}"`);
  }

  // P0-1 (confirmed defect CD-8): duplicate edges and self-loops are
  // structurally illegal — overlapping curves and folded-back edges.
  const seenEdges = new Set<string>();
  for (const edge of enc.edges) {
    if (edge.from === edge.to) {
      errors.push(`decision-tree edge from "${edge.from}" to itself is a self-loop and is not allowed`);
      continue;
    }
    const key = `${edge.from}->${edge.to}`;
    if (seenEdges.has(key)) {
      errors.push(`decision-tree has a duplicate edge "${key}" — merge the conditions into one labelled edge`);
    }
    seenEdges.add(key);
  }

  // P1-1 (confirmed defect CD-7): the renderer types untyped nodes as
  // "option"; the validator uses the SAME default so semantics agree.
  // A spec without ANY explicit decision kind is rejected (the model
  // bridge infers kinds before this gate, so this only hits raw input).
  const kindOf = (id: string): "decision" | "option" | "outcome" => {
    const k = byId.get(id)?.kind;
    return k === "decision" || k === "option" || k === "outcome" ? k : "option";
  };
  const entry = enc.nodes.find((n) => n.kind === "decision") ?? enc.nodes[0];
  if (!enc.nodes.some((n) => n.kind === "decision")) {
    errors.push('decision-tree requires at least one node with an explicit kind "decision"');
  }

  // P0-1 (confirmed defect CD-1): the ≥2-branch contract is ENFORCED here,
  // not just requested in the prompt — a decision node with fewer than two
  // outgoing labelled branches used to validate cleanly (the "Reserves
  // verified?" single-branch node in the viz-8 screenshot).
  for (const n of enc.nodes) {
    if (kindOf(n.id) !== "decision") continue;
    const out = enc.edges.filter((e) => e.from === n.id);
    if (out.length < 2) {
      errors.push(`decision node "${n.id}" has ${out.length} outgoing edge(s) — every decision needs at least 2 labelled branches`);
      continue;
    }
    for (const e of out) {
      if (!e.label || !e.label.trim()) {
        errors.push(`edge "${n.id}" → "${e.to}" is missing its condition label — every decision branch needs one`);
      }
    }
  }

  // P0-1 (confirmed defect CD-2): connectivity. Nodes are either reachable
  // from the entry decision, or carry NO edges at all — an intentional
  // side-note — which must be acknowledged with a gap note containing
  // "unlinked" (mirrors the unverified-gap pattern below). Half-connected
  // nodes (edges that never reach the entry) are always rejected.
  if (entry) {
    const reachable = new Set<string>([entry.id]);
    const queue: string[] = [entry.id];
    while (queue.length > 0) {
      const id = queue.shift()!;
      for (const e of enc.edges) {
        if (e.from === id && nodeIds.has(e.to) && !reachable.has(e.to)) {
          reachable.add(e.to);
          queue.push(e.to);
        }
      }
    }
    for (const n of enc.nodes) {
      if (reachable.has(n.id)) continue;
      const linked = enc.edges.some((e) => e.from === n.id || e.to === n.id);
      if (!linked) {
        if (!spec.gaps.some((g) => g.toLowerCase().includes("unlinked"))) {
          errors.push(`node "${n.id}" has no edges — connect it to the tree or acknowledge it with a gap note containing "unlinked"`);
        }
      } else {
        errors.push(`node "${n.id}" is not reachable from the entry decision "${entry.id}" — connect it or remove it`);
      }
    }

    // P1-2 / CD-8: acyclicity — a decision tree branches forward only.
    const color = new Map<string, 0 | 1 | 2>(enc.nodes.map((n) => [n.id, 0 as 0 | 1 | 2]));
    let cycleAt: string | null = null;
    const dfs = (id: string): void => {
      if (cycleAt) return;
      color.set(id, 1);
      for (const e of enc.edges) {
        if (e.from !== id) continue;
        const c = color.get(e.to);
        if (c === 1) {
          cycleAt = e.to;
          return;
        }
        if (c === 0) dfs(e.to);
      }
      color.set(id, 2);
    };
    for (const n of enc.nodes) {
      if ((color.get(n.id) ?? 0) === 0) dfs(n.id);
      if (cycleAt) break;
    }
    if (cycleAt) {
      errors.push(`decision-tree contains a cycle through "${cycleAt}" — decisions must branch forward, not loop`);
    }
  }
}

function validateArchitectureKind(spec: VisualizationSpec, enc: { layers: Array<{ id: string; components: Array<{ id: string }> }>; connections?: Array<{ from: string; to: string }> }, errors: string[]): void {
  const layerIds = new Set(enc.layers.map((l) => l.id));
  if (layerIds.size !== enc.layers.length) errors.push("architecture layer ids must be unique");
  const componentIds = new Set<string>();
  for (const layer of enc.layers) {
    for (const comp of layer.components) {
      if (componentIds.has(comp.id)) {
        errors.push(`architecture component ids must be unique across layers — "${comp.id}" is duplicated`);
      }
      componentIds.add(comp.id);
    }
  }
  for (const conn of enc.connections ?? []) {
    if (!componentIds.has(conn.from)) errors.push(`architecture connection references unknown component "${conn.from}"`);
    if (!componentIds.has(conn.to)) errors.push(`architecture connection references unknown component "${conn.to}"`);
  }
}

function validateFrameworkKind(spec: VisualizationSpec, enc: { sections: Array<{ id: string }> }, errors: string[]): void {
  const sectionIds = new Set(enc.sections.map((s) => s.id));
  if (sectionIds.size !== enc.sections.length) errors.push("framework section ids must be unique");
}

const isNumericField = (f: VizField) => f.type === "number" || f.type === "currency";
const isKeyableField = (f: VizField) => f.type === "date" || f.type === "string";

function fieldMap(ds: VizDataset): Map<string, VizField> {
  return new Map(ds.fields.map((f) => [f.key, f]));
}

function requireDataset(spec: VisualizationSpec, id: string, errors: string[]): VizDataset | null {
  const ds = spec.datasets.find((d) => d.id === id);
  if (!ds) {
    errors.push(`encoding references dataset "${id}" which is not present in datasets`);
    return null;
  }
  return ds;
}

function requireField(ds: VizDataset, key: string, errors: string[]): VizField | null {
  const f = fieldMap(ds).get(key);
  if (!f) {
    errors.push(`dataset "${ds.id}" has no column "${key}"`);
    return null;
  }
  return f;
}

function countNumeric(ds: VizDataset, keys: string[]): number {
  return ds.rows.filter((row) => keys.every((k) => typeof row[k] === "number")).length;
}

/** All value axes of a chart must share one unit (or all be unitless). */
function checkUnitConsistency(ds: VizDataset, keys: string[], errors: string[]): void {
  const units = new Set(
    keys
      .map((k) => fieldMap(ds).get(k))
      .filter((f): f is VizField => Boolean(f))
      .map((f) => f.unit ?? ""),
  );
  if (units.size > 1) {
    errors.push(
      `mixed units on value axes of dataset "${ds.id}" (${[...units].map((u) => u || "none").join(", ")}) — split into separate charts`,
    );
  }
}

function validateSeriesKind(spec: VisualizationSpec, enc: { datasetId: string; x: string; xType: "date" | "category"; y: string[] }, errors: string[]): void {
  // Time-series kinds (line/area) need a real series; bar charts are fine
  // with one or two categories (e.g. a two-asset comparison).
  const minPoints = spec.kind === "line" || spec.kind === "area" ? SPEC_LIMITS.minSeriesPoints : 1;
  const ds = requireDataset(spec, enc.datasetId, errors);
  if (!ds) return;
  const xField = requireField(ds, enc.x, errors);
  if (xField) {
    if (enc.xType === "date" && xField.type !== "date") {
      errors.push(`x column "${enc.x}" is declared as a date axis but its type is "${xField.type}"`);
    }
    if (enc.xType === "category" && !isKeyableField(xField)) {
      errors.push(`x column "${enc.x}" is declared as a category axis but its type is "${xField.type}"`);
    }
  }
  for (const key of enc.y) {
    const f = requireField(ds, key, errors);
    if (f && !isNumericField(f)) {
      errors.push(`value column "${key}" must be number/currency, got "${f.type}"`);
    }
  }
  if (enc.y.length > 1) checkUnitConsistency(ds, enc.y, errors);
  const usable = countNumeric(ds, enc.y);
  if (usable === 0) {
    errors.push(`dataset "${ds.id}" has no rows with numeric values for ${enc.y.join(", ")}`);
    return;
  }
  if (usable < minPoints) {
    errors.push(
      `only ${usable} plottable point(s) — a ${spec.kind} needs at least ${minPoints}${minPoints >= SPEC_LIMITS.minSeriesPoints ? ` (a KPI card may fit this snapshot instead)` : ""}`,
    );
  }
}

function validatePieKind(spec: VisualizationSpec, enc: { datasetId: string; label: string; value: string }, errors: string[]): void {
  const ds = requireDataset(spec, enc.datasetId, errors);
  if (!ds) return;
  const labelF = requireField(ds, enc.label, errors);
  if (labelF && !isKeyableField(labelF)) {
    errors.push(`pie label column "${enc.label}" must be a date/string column`);
  }
  const valueF = requireField(ds, enc.value, errors);
  if (valueF && !isNumericField(valueF)) {
    errors.push(`pie value column "${enc.value}" must be number/currency`);
  }
  const usable = countNumeric(ds, [enc.value]);
  if (usable === 0) errors.push(`no numeric values for pie value column "${enc.value}"`);
  if (usable > SPEC_LIMITS.maxPieSlices) {
    errors.push(
      `${usable} slices exceed the readable maximum of ${SPEC_LIMITS.maxPieSlices} — aggregate smallest categories first`,
    );
  }
}

function validateScatterKind(spec: VisualizationSpec, enc: { datasetId: string; x: string; y: string; label?: string }, errors: string[]): void {
  const ds = requireDataset(spec, enc.datasetId, errors);
  if (!ds) return;
  for (const key of [enc.x, enc.y]) {
    const f = requireField(ds, key, errors);
    if (f && !isNumericField(f)) errors.push(`scatter axis "${key}" must be number/currency`);
  }
  if (enc.label) requireField(ds, enc.label, errors);
  if (countNumeric(ds, [enc.x, enc.y]) === 0) {
    errors.push(`no rows with numeric x/y for scatter`);
  }
}

function validateRadarKind(spec: VisualizationSpec, enc: { datasetId: string; label: string; value: string[] }, errors: string[]): void {
  const ds = requireDataset(spec, enc.datasetId, errors);
  if (!ds) return;
  const labelF = requireField(ds, enc.label, errors);
  if (labelF && !isKeyableField(labelF)) errors.push(`radar axis label column "${enc.label}" must be a date/string column`);
  for (const key of enc.value) {
    const f = requireField(ds, key, errors);
    if (f && !isNumericField(f)) errors.push(`radar value column "${key}" must be number/currency`);
  }
  checkUnitConsistency(ds, enc.value, errors);
  if (countNumeric(ds, enc.value) === 0) errors.push(`no numeric rows for radar axes`);
}

function validateKpiKind(spec: VisualizationSpec, enc: { datasetId: string; items: Array<{ field: string }> }, errors: string[]): void {
  const ds = requireDataset(spec, enc.datasetId, errors);
  if (!ds) return;
  for (const item of enc.items) {
    const f = requireField(ds, item.field, errors);
    if (f && !isNumericField(f)) errors.push(`KPI field "${item.field}" must be number/currency`);
  }
}

function validateMatrixKind(spec: VisualizationSpec, enc: { datasetId: string; rowLabel: string; columns: string[] }, errors: string[]): void {
  const ds = requireDataset(spec, enc.datasetId, errors);
  if (!ds) return;
  requireField(ds, enc.rowLabel, errors);
  for (const key of enc.columns) requireField(ds, key, errors);
}

function validateTimelineKind(spec: VisualizationSpec, enc: { datasetId: string; when: string; title: string; description?: string }, errors: string[]): void {
  const ds = requireDataset(spec, enc.datasetId, errors);
  if (!ds) return;
  const whenF = requireField(ds, enc.when, errors);
  if (whenF && whenF.type !== "date") {
    errors.push(`timeline "when" column "${enc.when}" must be a date column`);
  }
  requireField(ds, enc.title, errors);
  if (enc.description) requireField(ds, enc.description, errors);
  const datedRows = ds.rows.filter((r) => typeof r[enc.when] === "string" && r[enc.when]);
  if (datedRows.length === 0) errors.push(`no dated rows for timeline`);
  if (datedRows.length > SPEC_LIMITS.maxTimelineEvents) {
    errors.push(`${datedRows.length} timeline events exceed the cap of ${SPEC_LIMITS.maxTimelineEvents}`);
  }
}

function validateFlowKind(spec: VisualizationSpec, enc: { datasetId?: string; nodes: Array<{ id: string }>; edges: Array<{ from: string; to: string }> }, errors: string[]): void {
  if (enc.datasetId) {
    const ds = requireDataset(spec, enc.datasetId, errors);
    if (ds) {
      // Structural datasets must at least have string columns for node labels.
      const hasKeyable = ds.fields.some(isKeyableField);
      if (!hasKeyable) errors.push(`flowchart dataset "${ds.id}" has no string/date column to build node labels from`);
    }
  }
  const nodeIds = new Set(enc.nodes.map((n) => n.id));
  if (nodeIds.size !== enc.nodes.length) errors.push("flowchart node ids must be unique");
  for (const edge of enc.edges) {
    if (!nodeIds.has(edge.from)) errors.push(`flowchart edge references unknown node "${edge.from}"`);
    if (!nodeIds.has(edge.to)) errors.push(`flowchart edge references unknown node "${edge.to}"`);
  }
}

const CANDLE_REASONS = ["open", "high", "low", "close"] as const;

function validateCandlestickKind(spec: VisualizationSpec, enc: { datasetId: string; time: string; open: string; high: string; low: string; close: string }, errors: string[]): void {
  const ds = requireDataset(spec, enc.datasetId, errors);
  if (!ds) return;
  const timeF = requireField(ds, enc.time, errors);
  if (timeF && timeF.type !== "date") {
    errors.push(`candlestick time column "${enc.time}" must be a date column`);
  }
  for (const key of CANDLE_REASONS) {
    const f = requireField(ds, enc[key], errors);
    if (f && !isNumericField(f)) errors.push(`candlestick ${key} column "${enc[key]}" must be number/currency`);
  }
  const complete = ds.rows.filter(
    (r) => CANDLE_REASONS.every((k) => typeof r[enc[k]] === "number"),
  );
  const partial = ds.rows.filter(
    (r) => CANDLE_REASONS.some((k) => typeof r[enc[k]] === "number") && !CANDLE_REASONS.every((k) => typeof r[enc[k]] === "number"),
  );
  if (partial.length > 0) {
    errors.push(
      `${partial.length} row(s) have incomplete OHLC data — refusing to silently drop data points from a candlestick chart`,
    );
  }
  if (complete.length === 0) {
    errors.push("candlestick requires complete OHLC rows (open, high, low, close) — none found");
    return;
  }
  const sane = complete.filter((r) => {
    const o = r[enc.open] as number;
    const h = r[enc.high] as number;
    const l = r[enc.low] as number;
    const c = r[enc.close] as number;
    return h >= Math.max(o, c) && l <= Math.min(o, c) && l > 0;
  });
  if (sane.length < complete.length) {
    errors.push(
      `${complete.length - sane.length} OHLC row(s) violate high >= max(open, close) / low <= min(open, close) — refusing to render invented or corrupt candles`,
    );
  }
  if (sane.length < SPEC_LIMITS.minSeriesPoints) {
    errors.push(`only ${sane.length} valid candle(s) — at least ${SPEC_LIMITS.minSeriesPoints} are required`);
  }
}

/**
 * Validate a VisualizationSpec: schema shape first, then cross-field
 * references, types, units and data availability. All-or-nothing: a spec
 * that fails ANY check is rejected whole (renderers never receive it).
 */
export function validateVisualizationSpec(input: unknown): SpecValidationResult {
  const parsed = visualizationSpecSchema.safeParse(input);
  if (!parsed.success) {
    const errors = parsed.error.issues
      .slice(0, 8)
      .map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`);
    return { ok: false, errors: ["schema: " + errors.join("; ")] };
  }
  const spec = parsed.data as unknown as VisualizationSpec;
  return validateParsedSpec(spec);
}

/** Cross-field validation of an ALREADY schema-parsed (and thus stripped) spec. */
function validateParsedSpec(spec: VisualizationSpec): SpecValidationResult {
  const errors: string[] = [];

  // Serialization cap — protects the encrypted metadata column.
  try {
    if (JSON.stringify(spec).length > SPEC_LIMITS.maxSerializedChars) {
      errors.push(`serialized spec exceeds ${SPEC_LIMITS.maxSerializedChars} characters`);
    }
  } catch {
    errors.push("spec is not serializable");
  }

  requireDatasetsForDataKinds(spec, errors);

  switch (spec.encoding.kind) {
    case "line":
    case "area":
    case "bar":
    case "bar-grouped":
      validateSeriesKind(spec, spec.encoding, errors);
      break;
    case "pie":
    case "donut":
      validatePieKind(spec, spec.encoding, errors);
      break;
    case "scatter":
      validateScatterKind(spec, spec.encoding, errors);
      break;
    case "radar":
      validateRadarKind(spec, spec.encoding, errors);
      break;
    case "kpi-dashboard":
      validateKpiKind(spec, spec.encoding, errors);
      break;
    case "comparison-matrix":
      validateMatrixKind(spec, spec.encoding, errors);
      break;
    case "timeline":
      validateTimelineKind(spec, spec.encoding, errors);
      break;
    case "flowchart":
      validateFlowKind(spec, spec.encoding, errors);
      break;
    case "candlestick":
      validateCandlestickKind(spec, spec.encoding, errors);
      break;
    // Batch 3 — conceptual kinds
    case "mindmap":
      validateMindKind(spec, spec.encoding, errors);
      break;
    case "roadmap":
      validateRoadmapKind(spec, spec.encoding, errors);
      break;
    case "decision-tree":
      validateDecisionKind(spec, spec.encoding, errors);
      break;
    case "architecture":
      validateArchitectureKind(spec, spec.encoding, errors);
      break;
    case "framework":
      validateFrameworkKind(spec, spec.encoding, errors);
      break;
  }

  // Provenance policy (approved D3): an "unverified" spec must not present
  // numeric chart data as fact — it may only exist when the caller
  // explicitly acknowledged the gap (planner sets a matching gap note).
  if (spec.provenance === "unverified" && !spec.gaps.some((g) => g.includes("unverified"))) {
    errors.push('provenance "unverified" requires an explicit gap note acknowledging unverified data');
  }

  return errors.length === 0 ? { ok: true, errors: [] } : { ok: false, errors };
}

/**
 * Parse-and-validate helper for specs restored from persistence.
 * Returns the SCHEMA-STRIPPED object (Zod drops unknown keys recursively),
 * so injected properties can never reach a renderer or re-enter the
 * persisted metadata — the no-smuggling boundary is enforced here, not
 * just inside the validator.
 */
export function parseVisualizationSpec(raw: unknown): VisualizationSpec | null {
  const parsed = visualizationSpecSchema.safeParse(raw);
  if (!parsed.success) return null;
  const spec = parsed.data as unknown as VisualizationSpec;
  const result = validateParsedSpec(spec);
  return result.ok ? spec : null;
}

/* ------------------------------------------------------------------ */
/* Helpers used by the planner and renderers                           */
/* ------------------------------------------------------------------ */

/**
 * Which kinds a given kind can be switched to from the chart-type menu.
 * Batch 3: conceptual kinds are restructured through CONVERSATIONAL
 * refinement (model-assisted, re-validated) rather than the deterministic
 * menu, so their menu list is empty — the deterministic transformKind
 * cannot honestly restructure a label graph into a chart or vice versa.
 */
export const COMPATIBLE_KINDS: Record<VizSpecKind, VizSpecKind[]> = {
  line: ["bar", "area", "bar-grouped", "comparison-matrix", "kpi-dashboard"],
  area: ["line", "bar", "bar-grouped", "comparison-matrix", "kpi-dashboard"],
  bar: ["line", "area", "bar-grouped", "pie", "comparison-matrix", "kpi-dashboard"],
  "bar-grouped": ["bar", "line", "area", "radar", "comparison-matrix", "kpi-dashboard"],
  pie: ["donut", "bar", "kpi-dashboard"],
  donut: ["pie", "bar", "kpi-dashboard"],
  scatter: ["comparison-matrix"],
  radar: ["bar-grouped", "comparison-matrix"],
  "kpi-dashboard": ["comparison-matrix"],
  "comparison-matrix": ["bar", "bar-grouped", "line"],
  timeline: ["flowchart"],
  flowchart: ["timeline"],
  candlestick: ["line", "area"],
  mindmap: [],
  roadmap: [],
  "decision-tree": [],
  architecture: [],
  framework: [],
};

/** Humanize a column key: "market_cap_usd" → "Market cap USD". */
export function humanizeKey(key: string): string {
  return key
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim();
}

/** Serialize a ShadowDataset (research capture) into a render-ready VizDataset. */
export function toVizDataset(ds: ShadowDataset, id: string): VizDataset {
  return {
    id,
    title: ds.title.slice(0, SPEC_LIMITS.maxTitleChars),
    fields: ds.columns.map((c) => ({
      key: c.key,
      label: humanizeKey(c.key),
      ...(c.unit ? { unit: c.unit.slice(0, 32) } : {}),
      type: c.type,
    })),
    rows: ds.rows.slice(0, SPEC_LIMITS.maxRowsPerDataset).map((row) => {
      const clean: Record<string, string | number | null> = {};
      for (const [k, v] of Object.entries(row)) {
        if (typeof v === "string" || typeof v === "number" || v === null) clean[k.slice(0, SPEC_LIMITS.maxKeyChars)] = v;
      }
      return clean;
    }),
    ...(ds.asOf ? { asOf: ds.asOf.slice(0, 64) } : {}),
  };
}

export function vizSpecId(prefix = "viz"): string {
  const rand = typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID().replace(/-/g, "").slice(0, 12)
    : Math.random().toString(36).slice(2, 14);
  return `${prefix}-${rand}`;
}
