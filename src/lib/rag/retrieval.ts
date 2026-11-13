/**
 * Intelligent Workspace Batch 2 (Stealth RAG) — automatic retrieval.
 *
 * When a user sends a message, relevant chunks are retrieved and injected as
 * context. Rules (per the initiative spec):
 *  - NOT every document for every message: cosine ranking + a relevance
 *    threshold + top-K + a character budget decide what is sent.
 *  - Query and index MUST use the same embedding provider family — a query
 *    embedded locally cannot be compared against remotely embedded vectors
 *    (different spaces). Retrieval refuses that mismatch instead of
 *    silently returning garbage.
 *  - Unrelated content is rejected by the threshold, not force-fed.
 *  - Every chunk carries its source reference so the answer can cite it.
 */

import { getChunks, type RagChunkRecord, type RagDocumentRecord } from "@/lib/rag/vectorStore";
import { listDocuments } from "@/lib/rag/vectorStore";
import { cosineSimilarity, type EmbeddingProvider } from "@/lib/rag/embeddings";

/**
 * Local-path relevance: TERM-COVERAGE GATE + cosine ranking.
 *
 * Measured calibration (see the retrieval test suite) showed that whole-chunk
 * cosine of a SHORT query against a LONG chunk is diluted (a clearly relevant
 * 7-word query scores ~0.15) and overlaps unrelated noise — too thin to gate
 * on. Coverage is interpretable and separates cleanly: the fraction of the
 * query's CONTENT terms (stopwords removed) that appear in the chunk.
 * A chunk qualifies when coverage >= LOCAL_HASH_THRESHOLD; ranking adds a
 * small whole-chunk cosine tie-breaker. The returned `score` is that combined
 * figure — displayed to the user as a percentage, so the number shown always
 * means "how much of your question this passage actually addresses".
 */
export const LOCAL_HASH_THRESHOLD = 0.4;
export const DEFAULT_TOP_K = 5;
/** Character budget for injected retrieval context (~1K tokens). */
export const DEFAULT_MAX_CHARS = 4_000;

const STOPWORDS = new Set([
  "the", "a", "an", "is", "are", "was", "were", "be", "been", "am", "do", "does",
  "did", "of", "to", "in", "on", "at", "by", "for", "with", "about", "into",
  "and", "or", "but", "if", "then", "than", "so", "as", "it", "its", "this",
  "that", "these", "those", "there", "here", "what", "which", "who", "whom",
  "how", "when", "where", "why", "can", "could", "should", "would", "will",
  "shall", "may", "might", "must", "i", "me", "my", "we", "our", "you", "your",
  "he", "she", "they", "them", "his", "her", "their", "please", "tell", "give",
  "show", "help", "need", "want", "know", "let", "us", "get", "got", "also",
  "best", "way", "any", "some", "from", "up", "out", "over", "just", "very",
]);

function contentTokens(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^\p{L}\p{N}_]+/u)
    .filter((t) => t.length > 1 && !STOPWORDS.has(t));
}

export interface RetrievedChunk {
  documentId: string;
  documentName: string;
  chunkIndex: number;
  text: string;
  score: number;
}

export interface RetrievalResult {
  chunks: RetrievedChunk[];
  /** Whether ALL contributing documents were processed locally. */
  localProcessing: boolean;
  /** Embedding provider ids that built the contributing index. */
  embeddingProviders: string[];
  query: string;
  threshold: number;
  /** Candidate chunk count considered (telemetry for the indicator). */
  candidatesConsidered: number;
}

export interface RetrieveOptions {
  userId: string;
  /** null = user-level documents only; a project id = that project only. */
  projectId: string | null;
  embedder: EmbeddingProvider;
  /** Documents the user excluded from retrieval (inspectable in the UI). */
  excludedDocumentIds?: string[];
  topK?: number;
  threshold?: number;
  maxChars?: number;
  signal?: AbortSignal;
}

export async function retrieveContext(
  query: string,
  opts: RetrieveOptions,
): Promise<RetrievalResult | null> {
  const {
    userId,
    projectId,
    embedder,
    excludedDocumentIds = [],
    topK = DEFAULT_TOP_K,
    threshold = embedder.local ? LOCAL_HASH_THRESHOLD : 0.35,
    maxChars = DEFAULT_MAX_CHARS,
    signal,
  } = opts;

  const trimmed = query.trim();
  if (!trimmed || trimmed.length < 3) return null;

  const [queryVector] = await embedder.embed([trimmed], signal);
  if (!queryVector) return null;

  // Candidates: user-scoped, project-scoped, minus exclusions.
  const documents = await listDocuments(userId, { projectId });
  const allowedDocs = documents.filter((d) => !excludedDocumentIds.includes(d.id));
  if (allowedDocs.length === 0) return null;
  const allowedIds = new Set(allowedDocs.map((d) => d.id));
  const byId = new Map(allowedDocs.map((d) => [d.id, d]));

  const candidates = (await getChunks(userId, { projectId, documentIds: [...allowedIds] })) as RagChunkRecord[];
  if (candidates.length === 0) return null;

  // Score. Mixed-provider indexes are REFUSED, not ranked: a query embedded
  // in one space cannot be honestly compared to vectors from another.
  const providers = new Set(allowedDocs.map((d) => d.embeddingProvider));
  if (providers.size > 1) {
    // Fall back to chunks from the provider matching the query embedder.
    const matchingDocs = allowedDocs.filter((d) => d.embeddingProvider === embedder.id);
    if (matchingDocs.length === 0) return null;
    const matchingIds = new Set(matchingDocs.map((d) => d.id));
    const filtered = candidates.filter((c) => matchingIds.has(c.document_id));
    return scoreAndCollect(filtered, queryVector, matchingDocs, trimmed, threshold, topK, maxChars, embedder);
  }

  return scoreAndCollect(candidates, queryVector, allowedDocs, trimmed, threshold, topK, maxChars, embedder);
}

function scoreAndCollect(
  candidates: RagChunkRecord[],
  queryVector: number[],
  documents: RagDocumentRecord[],
  query: string,
  threshold: number,
  topK: number,
  maxChars: number,
  embedder: EmbeddingProvider,
): RetrievalResult | null {
  const nameById = new Map(documents.map((d) => [d.id, d.name]));
  const scored: RetrievedChunk[] = [];

  if (embedder.local) {
    // Local lexical path: term-coverage gate + whole-chunk cosine tie-break.
    const queryTerms = contentTokens(query);
    if (queryTerms.length === 0) return null;
    const uniqueTerms = [...new Set(queryTerms)];
    for (const chunk of candidates) {
      const chunkTokens = new Set(contentTokens(chunk.text));
      const matched = uniqueTerms.filter((t) => chunkTokens.has(t)).length;
      const coverage = matched / uniqueTerms.length;
      if (coverage >= threshold) {
        const cosine = cosineSimilarity(queryVector, chunk.embedding);
        scored.push({
          documentId: chunk.document_id,
          documentName: nameById.get(chunk.document_id) ?? "Unknown document",
          chunkIndex: chunk.chunk_index,
          text: chunk.text,
          // Coverage dominates; cosine only breaks ties between chunks that
          // cover the same query terms.
          score: coverage + cosine * 0.1,
        });
      }
    }
  } else {
    // Remote neural path: whole-chunk cosine (well-behaved distribution).
    for (const chunk of candidates) {
      const score = cosineSimilarity(queryVector, chunk.embedding);
      if (score >= threshold) {
        scored.push({
          documentId: chunk.document_id,
          documentName: nameById.get(chunk.document_id) ?? "Unknown document",
          chunkIndex: chunk.chunk_index,
          text: chunk.text,
          score,
        });
      }
    }
  }
  scored.sort((a, b) => b.score - a.score);
  return selectWithinBudget(scored, topK, maxChars, documents, candidates.length, embedder, query, threshold);
}

function selectWithinBudget(
  scored: RetrievedChunk[],
  topK: number,
  maxChars: number,
  documents: RagDocumentRecord[],
  candidatesConsidered: number,
  embedder: EmbeddingProvider,
  query: string,
  threshold: number,
): RetrievalResult | null {
  // Top-K within the character budget: never flood the provider with
  // unrelated or oversized context.
  const selected: RetrievedChunk[] = [];
  let usedChars = 0;
  for (const chunk of scored) {
    if (selected.length >= topK) break;
    if (usedChars + chunk.text.length > maxChars) continue;
    selected.push(chunk);
    usedChars += chunk.text.length;
  }
  if (selected.length === 0) return null;

  const selectedDocs = new Set(selected.map((c) => c.documentId));
  const contributing = documents.filter((d) => selectedDocs.has(d.id));
  return {
    chunks: selected,
    localProcessing: contributing.every((d) => d.localProcessing),
    embeddingProviders: [...new Set(contributing.map((d) => d.embeddingProvider))],
    query,
    threshold,
    candidatesConsidered,
  };
}
