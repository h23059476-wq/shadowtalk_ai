/**
 * Intelligent Workspace Batch 2 (Stealth RAG) — context formatting.
 *
 * Retrieved chunks become ONE system block prepended to the request, with
 * per-chunk source references and an explicit processing label (local vs
 * remote). The label must reflect reality: "local" only when every
 * contributing document was genuinely indexed on-device.
 */

import type { RetrievalResult } from "@/lib/rag/retrieval";

export interface FormattedContext {
  systemContent: string;
  /** Estimated tokens of the injected block (budget accounting). */
  estimatedTokens: number;
  sourceCount: number;
}

function processingLabel(result: RetrievalResult): string {
  return result.localProcessing
    ? "processed locally on this device (lexical embeddings)"
    : `processed remotely via ${result.embeddingProviders.join(", ")}`;
}

export function formatRetrievedContext(result: RetrievalResult): FormattedContext {
  const sources = result.chunks
    .map((c, i) => `[S${i + 1}] Document "${c.documentName}" (chunk ${c.chunkIndex + 1}, relevance ${(c.score * 100).toFixed(0)}%)`)
    .join("\n");

  const body = result.chunks
    .map((c, i) => `--- [S${i + 1}] ${c.documentName} · chunk ${c.chunkIndex + 1} ---\n${c.text}`)
    .join("\n\n");

  const systemContent =
    `[RETRIEVED DOCUMENT CONTEXT — ${result.chunks.length} passage(s) from the user's indexed documents, ` +
    `${processingLabel(result)}. Cite passages as [S1], [S2]… when you use them. ` +
    `If the passages do not contain the answer, say so — do not invent content.]\n\n` +
    `Sources:\n${sources}\n\n${body}`;

  return {
    systemContent,
    estimatedTokens: Math.ceil(systemContent.length / 4),
    sourceCount: result.chunks.length,
  };
}

/** Compact source list for the context indicator UI. */
export function summarizeSources(result: RetrievalResult): Array<{ name: string; chunks: number }> {
  const byDoc = new Map<string, number>();
  for (const chunk of result.chunks) {
    byDoc.set(chunk.documentName, (byDoc.get(chunk.documentName) ?? 0) + 1);
  }
  return [...byDoc.entries()].map(([name, chunks]) => ({ name, chunks }));
}
