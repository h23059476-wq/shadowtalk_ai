/**
 * Research capture — shared types.
 *
 * These types are the contract between the research/citation capture layer
 * (byok.ts SSE annotations, executeShadowTool research tools, ```shadowdata
 * fenced blocks) and the message schema (ChatbotPage / MessageBubble /
 * chatMessageMetadata / ResearchDataCard).
 *
 * Pure type/utility layer: no React, no Firebase, no rendering concerns.
 * (Visualization rendering now lives in src/components/visual — JSON-to-
 * engine contracts in visualContract.ts.)
 */

/**
 * Provenance class of a dataset value (D3 policy, approved):
 *  - "source-verified": tied to a citable source URL (research data block
 *    carrying sources, or provider-reported citations).
 *  - "ai-extracted": parsed by the model from cited prose without a
 *    structured block — usable only when clearly labelled.
 *  - "unverified": no source evidence at all.
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
 * message-finalization time.
 */
export interface ResearchDataBlock {
  datasets: ShadowDataset[];
  sources: ShadowSource[];
  /** Explicit declarations of what is missing — never silently filled. */
  gaps: string[];
  /** When the block was captured from the message content. */
  capturedAt: string;
}
