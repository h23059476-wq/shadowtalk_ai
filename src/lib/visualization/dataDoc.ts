/**
 * Research-to-Visualization — structured research-data capture (Batch 1).
 *
 * Research tools (`web_search`, `deep_research`) are instructed to end their
 * reply with a single fenced ```shadowdata block containing typed datasets,
 * sources and declared gaps. This module is the DETERMINISTIC half of that
 * contract: extraction, validation (zod) and size limits. The model's JSON is
 * never trusted without passing through here.
 *
 * Integrity rules enforced (Phase 6 of the feature spec):
 *  - values must be string | number | null (no nested objects — nothing to hide code in),
 *  - missing values are null + declared in `gaps`, never invented,
 *  - block size is capped (120k chars, 4 datasets, 1000 rows),
 *  - source URLs must be real URLs.
 */

import { z } from "zod";
import type { ResearchDataBlock } from "./types";

export const SHADOWDATA_LANGUAGE = "shadowdata";

const columnSchema = z.object({
  key: z.string().min(1).max(64),
  type: z.enum(["date", "number", "string", "currency"]),
  unit: z.string().max(32).optional(),
  currency: z.string().max(8).optional(),
});

const sourceSchema = z.object({
  url: z.string().url().max(2048),
  name: z.string().max(160).optional(),
  retrievedAt: z.string().max(64).optional(),
  dataTimestamp: z.string().max(64).optional(),
});

const datasetSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(500).optional(),
  columns: z.array(columnSchema).min(1).max(24),
  rows: z
    .array(z.record(z.union([z.string().max(1024), z.number(), z.null()])))
    .max(1000),
  asOf: z.string().max(64).optional(),
});

/** Validated shape of a ```shadowdata JSON payload. */
export const shadowDataDocSchema = z.object({
  datasets: z.array(datasetSchema).min(1).max(4),
  sources: z.array(sourceSchema).max(24),
  gaps: z.array(z.string().max(300)).max(16),
});

/** Hard cap on a single fence body before we even try to parse it. */
const MAX_BLOCK_CHARS = 120_000;
/** At most two structured blocks per message — one is the contract, two is graceful. */
const MAX_BLOCKS_PER_MESSAGE = 2;

const FENCE_REGEX = new RegExp(
  "```" + SHADOWDATA_LANGUAGE + "\\s*\\n?([\\s\\S]*?)```",
  "gi",
);

export interface ExtractedResearchData {
  blocks: ResearchDataBlock[];
  /** Fences that were present but failed parsing/validation. */
  invalidCount: number;
}

/**
 * Parse and validate ONE shadowdata JSON body. Returns null when invalid —
 * callers must treat null as "no structured data", never as a fallback to
 * inventing data.
 */
export function parseResearchDataBlock(json: string): ResearchDataBlock | null {
  if (!json || json.length > MAX_BLOCK_CHARS) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    return null;
  }
  const result = shadowDataDocSchema.safeParse(parsed);
  if (!result.success) return null;
  // Rebuild explicitly: zod validated the shape at runtime; the explicit
  // mapping keeps the output exactly matching the `ResearchDataBlock`
  // contract regardless of zod's inferred optionality under this repo's
  // lenient tsconfig (`strict: false`).
  const d = result.data;
  return {
    datasets: d.datasets.map((ds) => ({
      title: ds.title!,
      ...(ds.description !== undefined ? { description: ds.description } : {}),
      columns: ds.columns.map((col) => ({
        key: col.key!,
        type: col.type!,
        ...(col.unit !== undefined ? { unit: col.unit } : {}),
        ...(col.currency !== undefined ? { currency: col.currency } : {}),
      })),
      rows: ds.rows.map((row) => ({ ...row })),
      ...(ds.asOf !== undefined ? { asOf: ds.asOf } : {}),
    })),
    sources: d.sources.map((s) => ({
      url: s.url!,
      ...(s.name !== undefined ? { name: s.name } : {}),
      ...(s.retrievedAt !== undefined ? { retrievedAt: s.retrievedAt } : {}),
      ...(s.dataTimestamp !== undefined ? { dataTimestamp: s.dataTimestamp } : {}),
    })),
    gaps: [...d.gaps],
    capturedAt: new Date().toISOString(),
  };
}

/**
 * Extract every valid ```shadowdata block from message content.
 * Invalid blocks are counted (surfaced as a capture warning) but never
 * partially accepted — a block is all-or-nothing.
 */
export function extractResearchDataBlocks(content: string): ExtractedResearchData {
  const blocks: ResearchDataBlock[] = [];
  let invalidCount = 0;
  if (!content) return { blocks, invalidCount };
  for (const match of content.matchAll(FENCE_REGEX)) {
    if (blocks.length >= MAX_BLOCKS_PER_MESSAGE) break;
    const body = match[1]?.trim();
    if (!body) {
      invalidCount += 1;
      continue;
    }
    const block = parseResearchDataBlock(body);
    if (block) blocks.push(block);
    else invalidCount += 1;
  }
  return { blocks, invalidCount };
}

/** True when message content contains at least one shadowdata fence (valid or not). */
export function hasShadowDataBlock(content: string): boolean {
  if (!content) return false;
  FENCE_REGEX.lastIndex = 0;
  return FENCE_REGEX.test(content);
}
