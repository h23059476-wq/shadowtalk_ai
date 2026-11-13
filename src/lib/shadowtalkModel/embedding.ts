/**
 * Text embedding generator for the on-device ShadowTalk model learner.
 *
 * STATUS: REAL (Intelligent Workspace production-readiness pass).
 * Delegates to the shared local feature-hashing embedder
 * (`@/lib/rag/embeddings` LocalHashEmbedder): deterministic 512-dim vectors,
 * token+bigram signed hashing, sublinear TF, L2 normalization — pure math,
 * zero network, zero bundle weight. The previous stub returned 384 zeros,
 * which made learner clustering operate on meaningless vectors (documented
 * audit finding P0-8c); with real vectors, clustering and similarity in
 * learner.ts/useMemoryGraph now have actual signal.
 *
 * Honest caveat: this is a LEXICAL embedding, not a neural model — treat
 * cluster labels as topic hints, not deep semantics.
 */

import { LocalHashEmbedder } from "@/lib/rag/embeddings";

const embedder = new LocalHashEmbedder();

export async function embedText(text: string): Promise<number[]> {
  const [vector] = await embedder.embed([text]);
  return vector ?? new Array(embedder.dim).fill(0);
}

export const EMBEDDING_DIM = embedder.dim;
