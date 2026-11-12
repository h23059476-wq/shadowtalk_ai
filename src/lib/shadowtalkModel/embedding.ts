/**
 * Text embedding generator.
 *
 * STATUS: STUB. Returns a zero vector of length 384. The original
 * implementation imported `@huggingface/transformers` (heavy dependency)
 * and was stubbed to keep the bundle small. Until a real embedding model
 * is wired, callers (learner.ts, kMeans clustering, useMemoryGraph) fall
 * back to keyword-based topic labelling — see learner.ts:clusterLabel.
 *
 * Do NOT treat clustering output as embedding-based semantic similarity.
 * See docs/audit/CLAIMS_REALITY_REPORT.md P0-8c for context.
 */
export async function embedText(_text: string): Promise<number[]> {
  // Stubbed to avoid importing heavy local transformers pipeline
  return new Array(384).fill(0);
}
