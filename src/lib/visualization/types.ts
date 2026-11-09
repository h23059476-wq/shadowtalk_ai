/**
 * Research-to-Visualization — shared types (Batch 1).
 *
 * These types are the contract between:
 *  - the research/citation capture layer (byok.ts SSE annotations,
 *    executeShadowTool research tools, ```shadowdata fenced blocks),
 *  - the message schema (ChatbotPage / MessageBubble / ChatMessages),
 *  - the context resolver and intent detector,
 *  - and (Batch 2+) the visualization spec planner/renderers.
 *
 * Nothing in this module imports React or Firebase — it must stay a pure
 * type/utility layer so it can be unit-tested in isolation.
 */

/**
 * Provenance class of a dataset value (D3 policy, approved):
 *  - "source-verified": tied to a citable source URL (research data block
 *    carrying sources, or provider-reported citations).
 *  - "ai-extracted": parsed by the model from cited prose without a
 *    structured block — usable only when clearly labelled.
 *  - "unverified": no source evidence at all — must NOT be rendered as
 *    factual chart data.
 */
export type ProvenanceClass = "source-verified" | "ai-extracted" | "unverified";

/** A provider-reported citation (OpenRouter `url_citation` annotation, Perplexity citation, …). */
export interface Citation {
  url: string;
  title?: string;
}

/** Column descriptor inside a structured research dataset. */
export interface ShadowDataColumn {
  key: string;
  type: "date" | "number" | "string" | "currency";
  unit?: string;
  currency?: string;
}

/** One typed dataset captured from research output. */
export interface ShadowDataset {
  title: string;
  description?: string;
  columns: ShadowDataColumn[];
  rows: Array<Record<string, string | number | null>>;
  /** Data as-of timestamp, when the source declares one. */
  asOf?: string;
}

/** Source attribution attached to a research data block. */
export interface ShadowSource {
  url: string;
  name?: string;
  /** When we retrieved the data (ISO-ish string). */
  retrievedAt?: string;
  /** When the data itself is from (ISO-ish string), when known. */
  dataTimestamp?: string;
}

/**
 * Machine-readable research payload emitted by research tools inside a
 * ```shadowdata fenced block and captured deterministically at
 * message-finalization time (Batch 1 keystone — see PHASE1_AUDIT.md Part C).
 */
export interface ResearchDataBlock {
  datasets: ShadowDataset[];
  sources: ShadowSource[];
  /** Explicit declarations of what is missing — never silently filled. */
  gaps: string[];
  /** When the block was captured from the message content. */
  capturedAt: string;
}

/** Minimal message shape the context resolver needs (structural subset). */
export interface ResolverMessage {
  id: string;
  type: "user" | "ai";
  content: string;
  citations?: Citation[];
  researchData?: ResearchDataBlock[];
  toolExecution?: { tool: string; status: string };
}

/** A piece of resolved evidence backing a visualization request. */
export interface ResearchEvidence {
  messageId: string;
  excerpt: string;
  priority: "research-data" | "research-tool" | "citations" | "text-match";
}

/**
 * The resolved research context for a visualization request — the answer to
 * "turn your previous research into a chart" without re-researching.
 */
export interface ResearchContext {
  datasets: ShadowDataset[];
  citations: Citation[];
  evidence: ResearchEvidence[];
  /** Best provenance class achievable from the resolved context. */
  provenance: ProvenanceClass;
  /** Union of declared gaps plus derived gaps (never silently filled). */
  gaps: string[];
  /** True when at least one dataset has usable numeric values. */
  hasNumericData: boolean;
  /** Message the context primarily came from. */
  primaryMessageId?: string;
}

/** What the user wants done: a new visualization, a refinement, or an explanation. */
export type VizIntentKind = "create" | "refine" | "explain";

/** Chart/diagram type hints recognized deterministically (Batch 1 set). */
export type VizTypeHint =
  | "line"
  | "bar"
  | "bar-grouped"
  | "bar-stacked"
  | "pie"
  | "donut"
  | "area"
  | "scatter"
  | "histogram"
  | "candlestick"
  | "timeline"
  | "flowchart"
  | "mindmap"
  | "roadmap"
  | "decision-tree"
  | "dashboard"
  | "table";

/** Deterministic classification of a visualization request (Batch 1). */
export interface VizIntent {
  kind: VizIntentKind;
  requestedType?: VizTypeHint;
  /** Raw time-range phrase from the request, e.g. "last 30 days". */
  timeRange?: string;
  /** Explicit comparison target, e.g. "USDC" from "compare USDT with USDC". */
  compareTarget?: string;
  /** User explicitly asked for interactive controls. */
  interactive?: boolean;
  /** 0..1 — deterministic detectors emit 0.7 (soft) or 0.9 (explicit). */
  confidence: number;
}
