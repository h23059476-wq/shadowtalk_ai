/**
 * Intelligent Workspace Batch 2 (Stealth RAG) — automatic ingestion pipeline.
 *
 * validate → extract (reuses documentIntelligence.ts — no duplicate
 * extraction infrastructure) → chunk (retrieval-sized) → embed → index
 * (shadowtalk-rag) → associate with user + project.
 *
 * Guarantees:
 *  - Non-blocking: every batch yields to the event loop; the chat UI stays
 *    responsive during indexing.
 *  - Cancellable: AbortSignal aborts between batches; nothing partial is
 *    stored (a cancelled ingestion writes NOTHING — the store transaction is
 *    the last step).
 *  - Honest disclosure: the result records exactly which embedding provider
 *    ran and whether processing was local; the UI surfaces both.
 *  - Duplicate-safe: identical content (same content hash, same scope)
 *    re-indexing is detected and skipped.
 */

import { extractDocument } from "@/lib/documentIntelligence";
import { chunkText } from "@/lib/rag/chunker";
import { contentHash, putDocument, getChunks, type RagChunkRecord, type RagDocumentRecord } from "@/lib/rag/vectorStore";
import type { EmbeddingProvider } from "@/lib/rag/embeddings";
import { estimateTokens } from "@/lib/tokenOptimizer/tokenEstimation";

const MAX_FILE_BYTES = 25 * 1024 * 1024; // matches documentIntelligence limits
const EMBED_BATCH_SIZE = 16;

export interface IngestOptions {
  userId: string;
  /** null = user-level (chat-attached) document. */
  projectId: string | null;
  embedder: EmbeddingProvider;
  signal?: AbortSignal;
  onProgress?: (progress: IngestProgress) => void;
}

export interface IngestProgress {
  stage: "extracting" | "chunking" | "embedding" | "indexing" | "done";
  /** 0..1 across the whole pipeline (embedding dominates). */
  ratio: number;
  chunksProcessed: number;
  chunksTotal: number;
}

export interface IngestResult {
  documentId: string;
  name: string;
  format: string;
  chunkCount: number;
  charCount: number;
  estimatedTokens: number;
  embeddingProvider: string;
  localProcessing: boolean;
  duplicate: boolean;
  notice?: string;
}

export class IngestionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "IngestionError";
  }
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new IngestionError("Could not read the file."));
    reader.readAsDataURL(file);
  });
}

export async function ingestDocument(
  file: File,
  opts: IngestOptions,
): Promise<IngestResult> {
  const { userId, projectId, embedder, signal, onProgress } = opts;
  const report = (stage: IngestProgress["stage"], ratio: number, chunksProcessed = 0, chunksTotal = 0) =>
    onProgress?.({ stage, ratio, chunksProcessed, chunksTotal });

  // 1. Validate.
  if (!file || file.size === 0) throw new IngestionError("The file is empty.");
  if (file.size > MAX_FILE_BYTES) {
    throw new IngestionError("File is larger than the 25 MB indexing limit.");
  }

  // 2. Extract text — the existing, tested extraction stack.
  report("extracting", 0.02);
  const dataUrl = await fileToDataUrl(file);
  const extracted = await extractDocument(dataUrl, file.name, file.type);
  if (extracted.empty || !extracted.text.trim()) {
    throw new IngestionError(
      extracted.format === "pdf"
        ? "No extractable text (the PDF looks scanned). Text-based PDFs only."
        : "No extractable text found in this file.",
    );
  }

  // 3. Chunk.
  report("chunking", 0.08);
  const chunks = chunkText(extracted.text);
  if (chunks.length === 0) throw new IngestionError("Nothing indexable after chunking.");

  // Duplicate detection — same content at the same scope is already indexed.
  const hash = contentHash(extracted.text);
  const scopeProject = projectId;
  const existing = await findDuplicate(userId, scopeProject, hash, extracted.text.length);
  if (existing) {
    return {
      documentId: existing.document_id,
      name: existing.name ?? file.name,
      format: extracted.format,
      chunkCount: existing.chunkCount,
      charCount: extracted.text.length,
      estimatedTokens: estimateTokens(extracted.text),
      embeddingProvider: existing.embeddingProvider,
      localProcessing: existing.localProcessing,
      duplicate: true,
      notice: "This exact content is already indexed — reusing the existing index.",
    };
  }

  // 4. Embed in batches, yielding to the event loop between batches so the
  // chat UI never stalls. Remote embedders are network-bound; local hashing
  // is pure math — both go through the same cooperative batching.
  report("embedding", 0.1, 0, chunks.length);
  const embeddings: number[][] = [];
  for (let i = 0; i < chunks.length; i += EMBED_BATCH_SIZE) {
    if (signal?.aborted) {
      throw new DOMException("Aborted", "AbortError");
    }
    const batch = chunks.slice(i, i + EMBED_BATCH_SIZE).map((c) => c.text);
    const batchVectors = await embedder.embed(batch, signal);
    embeddings.push(...batchVectors);
    report(
      "embedding",
      0.1 + 0.8 * Math.min(1, (i + batch.length) / chunks.length),
      Math.min(i + batch.length, chunks.length),
      chunks.length,
    );
    // Yield — one macrotask per batch keeps input responsive.
    await new Promise((resolve) => setTimeout(resolve, 0));
  }

  // 5. Index (single transaction — cancelled BEFORE this point stores nothing).
  if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
  report("indexing", 0.95, chunks.length, chunks.length);
  const documentId = `rag-${hash}-${Date.now().toString(36)}`;
  const now = new Date().toISOString();
  const documentRecord: RagDocumentRecord = {
    id: documentId,
    user_id: userId,
    project_id: projectId,
    name: file.name,
    mimeType: file.type || "application/octet-stream",
    sizeBytes: file.size,
    charCount: extracted.text.length,
    chunkCount: chunks.length,
    contentHash: hash,
    embeddingProvider: embedder.id,
    localProcessing: embedder.local,
    createdAt: now,
  };
  const chunkRecords: Array<Omit<RagChunkRecord, "createdAt">> = chunks.map((chunk, i) => ({
    id: `${documentId}:${i}`,
    document_id: documentId,
    user_id: userId,
    project_id: projectId,
    chunk_index: i,
    text: chunk.text,
    embedding: embeddings[i],
  }));
  await putDocument({ document: documentRecord, chunks: chunkRecords });
  report("done", 1, chunks.length, chunks.length);

  return {
    documentId,
    name: file.name,
    format: extracted.format,
    chunkCount: chunks.length,
    charCount: extracted.text.length,
    estimatedTokens: estimateTokens(extracted.text),
    embeddingProvider: embedder.id,
    localProcessing: embedder.local,
    duplicate: false,
    ...(extracted.notice ? { notice: extracted.notice } : {}),
  };
}

async function findDuplicate(
  userId: string,
  projectId: string | null,
  hash: string,
  charCount: number,
): Promise<{ document_id: string; chunkCount: number; embeddingProvider: string; localProcessing: boolean; name?: string } | null> {
  // Cheap check: all chunks of the user's scope, match by stored hash prefix
  // in the document id. Document records themselves are the source of truth.
  const { listDocuments } = await import("@/lib/rag/vectorStore");
  const documents = await listDocuments(userId, { projectId });
  const match = documents.find((d) => d.contentHash === hash && Math.abs(d.charCount - charCount) < 2);
  return match
    ? { document_id: match.id, chunkCount: match.chunkCount, embeddingProvider: match.embeddingProvider, localProcessing: match.localProcessing, name: match.name }
    : null;
}
