/**
 * Chat message metadata — Batch 1 (Research-to-Visualization).
 *
 * Structured message payloads (research citations, ```shadowdata datasets,
 * provider provenance, producing tool) previously died with React state:
 * saveMessage persisted only {conversation_id, user_id, content, role,
 * personality}. This module adds an OPTIONAL `metadata` field to the
 * existing `messages` collection (approved D4 approach: extend the existing
 * encrypted message-persistence mechanism — no new collection).
 *
 * Security contract (mirrors chat content):
 *  - In private mode the JSON goes through the SAME wrapForStorage
 *    encrypt-or-null gate as message content. If encryption fails, the
 *    metadata field is skipped — plaintext is NEVER written as a fallback.
 *  - On load, e2e:-wrapped metadata is decrypted with the same session key;
 *    undecryptable metadata is dropped silently (never rendered as garbage).
 *  - Decode validates the shape loosely and never trusts nested content:
 *    metadata feeds trusted renderers only as typed, sanitized fields.
 */

import type { Citation, ResearchDataBlock } from "@/lib/visualization/types";
import { parseVisualizationSpec } from "@/lib/visualization/spec";
import type { VisualizationSpec } from "@/lib/visualization/spec";

export interface ChatMessageMetadata {
  /** Provider-reported citations (web research). */
  citations?: Citation[];
  /** Structured datasets captured from ```shadowdata blocks. */
  researchData?: ResearchDataBlock[];
  /** Provider provenance of an assistant reply ("byok" | "shared" | "local" | "omniroute"). */
  source?: string;
  modelUsed?: string;
  provider?: string;
  /** Tool that produced this message, when applicable. */
  tool?: string;
  /** Batch 2 — validated visualization artifacts attached to this reply. */
  visualizations?: VisualizationSpec[];
  /** Intelligent-workspace Batch 1 — honest per-turn token/cost accounting. */
  tokenTelemetry?: TokenTelemetry;
}

/**
 * Intelligent-workspace Batch 1 — per-turn token accounting. Numbers are
 * provider-MEASURED when `*Measured` is true, otherwise produced by the
 * documented estimation method. Nothing here is inferred or fabricated:
 * cached tokens appear only when the provider itself reported them.
 */
export interface TokenTelemetry {
  provider?: string;
  model?: string;
  inputTokens: number;
  inputMeasured: boolean;
  outputTokens: number;
  outputMeasured: boolean;
  cachedInputTokens?: number;
  estimationMethod?: string;
  compaction?: {
    applied: boolean;
    compactedMessages: number;
    estimatedSavingsTokens: number;
  };
}

function isValidTokenTelemetry(value: unknown): value is TokenTelemetry {
  if (typeof value !== "object" || value === null) return false;
  const t = value as TokenTelemetry;
  return (
    typeof t.inputTokens === "number" && Number.isFinite(t.inputTokens) &&
    typeof t.outputTokens === "number" && Number.isFinite(t.outputTokens) &&
    typeof t.inputMeasured === "boolean" &&
    typeof t.outputMeasured === "boolean"
  );
}

/** Hard cap — oversized metadata is dropped rather than persisted. */
const MAX_METADATA_JSON_CHARS = 200_000;

function isValidCitation(value: unknown): value is Citation {
  return typeof value === "object" && value !== null && typeof (value as Citation).url === "string";
}

function isValidResearchDataBlock(value: unknown): value is ResearchDataBlock {
  if (typeof value !== "object" || value === null) return false;
  const block = value as ResearchDataBlock;
  return Array.isArray(block.datasets) && Array.isArray(block.sources) && Array.isArray(block.gaps);
}

/**
 * Strip empty fields; return null when nothing meaningful remains so callers
 * can skip the metadata column entirely.
 */
export function buildMessageMetadata(
  parts: ChatMessageMetadata,
): ChatMessageMetadata | null {
  const cleaned: ChatMessageMetadata = {};
  if (parts.citations && parts.citations.length > 0) cleaned.citations = parts.citations;
  if (parts.researchData && parts.researchData.length > 0) cleaned.researchData = parts.researchData;
  if (parts.source) cleaned.source = parts.source;
  if (parts.modelUsed) cleaned.modelUsed = parts.modelUsed;
  if (parts.provider) cleaned.provider = parts.provider;
  if (parts.tool) cleaned.tool = parts.tool;
  // Batch 2 — at most ONE visualization artifact per message; only specs
  // that pass full validation are persisted.
  if (parts.visualizations && parts.visualizations.length > 0) {
    const valid = parts.visualizations
      .slice(0, 1)
      .map((v) => parseVisualizationSpec(v))
      .filter((v): v is VisualizationSpec => v !== null);
    if (valid.length > 0) cleaned.visualizations = valid;
  }
  // Intelligent-workspace Batch 1 — telemetry passes through only when the
  // required numeric shape validates.
  if (parts.tokenTelemetry && isValidTokenTelemetry(parts.tokenTelemetry)) {
    cleaned.tokenTelemetry = parts.tokenTelemetry;
  }
  return Object.keys(cleaned).length > 0 ? cleaned : null;
}

/**
 * Serialize + wrap metadata for storage. `wrap` is the SAME encrypt-or-null
 * gate used for message content (chatPrivate.wrapForStorage):
 *   - private mode off  → returns the JSON string as-is,
 *   - private mode on   → returns ciphertext, or null on failure.
 * A null return means "skip the metadata field" — never store plaintext.
 */
export async function encodeMessageMetadata(
  metadata: ChatMessageMetadata | null | undefined,
  wrap: (plaintext: string) => Promise<string | null>,
): Promise<string | null> {
  if (!metadata) return null;
  const json = JSON.stringify(metadata);
  if (json.length > MAX_METADATA_JSON_CHARS) return null;
  return wrap(json);
}

/**
 * Restore metadata from a stored row. `resolve` is the SAME display-text
 * resolver used for message content (chatPrivate.resolveDisplayText): it
 * decrypts `e2e:` payloads when the vault is unlocked and passes plaintext
 * through unchanged. Malformed or oversized metadata is dropped (null) —
 * a bad metadata field must never break conversation loading.
 */
export async function decodeMessageMetadata(
  raw: unknown,
  resolve: (raw: string) => Promise<string>,
): Promise<ChatMessageMetadata | null> {
  if (typeof raw !== "string" || raw.length === 0) return null;
  if (raw.length > MAX_METADATA_JSON_CHARS) return null;
  let plain: string;
  try {
    plain = await resolve(raw);
  } catch {
    return null;
  }
  if (!plain || plain === raw) {
    // Plaintext JSON path (or undecryptable e2e payload left as-is when the
    // vault is locked — resolveDisplayText returns "[Encrypted message]"
    // for locked rows, which is not valid JSON and will fail the parse).
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(plain);
  } catch {
    return null;
  }
  if (typeof parsed !== "object" || parsed === null) return null;
  const meta = parsed as ChatMessageMetadata;
  const cleaned = buildMessageMetadata({
    citations: Array.isArray(meta.citations) ? meta.citations.filter(isValidCitation) : undefined,
    researchData: Array.isArray(meta.researchData)
      ? meta.researchData.filter(isValidResearchDataBlock)
      : undefined,
    source: typeof meta.source === "string" ? meta.source : undefined,
    modelUsed: typeof meta.modelUsed === "string" ? meta.modelUsed : undefined,
    provider: typeof meta.provider === "string" ? meta.provider : undefined,
    tool: typeof meta.tool === "string" ? meta.tool : undefined,
    visualizations: Array.isArray(meta.visualizations) ? meta.visualizations : undefined,
    tokenTelemetry: isValidTokenTelemetry(meta.tokenTelemetry) ? meta.tokenTelemetry : undefined,
  });
  return cleaned;
}
