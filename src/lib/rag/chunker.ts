/**
 * Intelligent Workspace Batch 2 (Stealth RAG) — retrieval-sized chunking.
 *
 * The existing `chunkDocument` in documentIntelligence.ts produces 30 K-char
 * attachment chunks — far too coarse for vector retrieval. This chunker
 * targets ~1,600 chars with ~200-char paragraph-aware overlap, so a retrieved
 * chunk is a coherent passage instead of half a chapter.
 *
 * Deterministic: same input always yields the same chunks.
 */

export interface ChunkOptions {
  targetChars?: number;
  overlapChars?: number;
}

export interface TextChunk {
  text: string;
  index: number;
  /** Character offset of the chunk start in the original text (best effort). */
  startOffset: number;
}

const DEFAULT_TARGET = 1_600;
const DEFAULT_OVERLAP = 200;

/** Split into paragraphs, then over-long paragraphs into sentences. */
function toParagraphs(text: string, maxParagraphChars: number): string[] {
  const paragraphs = text.split(/\n{2,}/);
  const out: string[] = [];
  for (const paragraph of paragraphs) {
    const trimmed = paragraph.trim();
    if (!trimmed) continue;
    if (trimmed.length <= maxParagraphChars) {
      out.push(trimmed);
      continue;
    }
    // One giant paragraph (e.g. minified text): split on sentence endings,
    // falling back to hard character windows when there are no terminators.
    const sentences = trimmed.split(/(?<=[.!?。！？])\s+/);
    let buffer = "";
    for (const sentence of sentences) {
      if (sentence.length > maxParagraphChars) {
        if (buffer) {
          out.push(buffer);
          buffer = "";
        }
        for (let i = 0; i < sentence.length; i += maxParagraphChars) {
          out.push(sentence.slice(i, i + maxParagraphChars));
        }
        continue;
      }
      if (buffer.length + sentence.length + 1 > maxParagraphChars) {
        out.push(buffer);
        buffer = sentence;
      } else {
        buffer = buffer ? `${buffer} ${sentence}` : sentence;
      }
    }
    if (buffer) out.push(buffer);
  }
  return out;
}

export function chunkText(text: string, opts: ChunkOptions = {}): TextChunk[] {
  const target = Math.max(400, opts.targetChars ?? DEFAULT_TARGET);
  const overlap = Math.min(Math.max(0, opts.overlapChars ?? DEFAULT_OVERLAP), Math.floor(target / 2));
  if (!text || !text.trim()) return [];

  const paragraphs = toParagraphs(text, target);
  const chunks: TextChunk[] = [];
  let buffer = "";
  let bufferStart = 0;
  let cursor = 0;

  const flush = () => {
    const trimmed = buffer.trim();
    if (trimmed) {
      chunks.push({ text: trimmed, index: chunks.length, startOffset: bufferStart });
    }
  };

  for (const paragraph of paragraphs) {
    const paragraphStart = text.indexOf(paragraph.slice(0, 64), cursor);
    const start = paragraphStart >= 0 ? paragraphStart : cursor;
    cursor = start + paragraph.length;

    if (!buffer) {
      buffer = paragraph;
      bufferStart = start;
      continue;
    }
    if (buffer.length + paragraph.length + 2 <= target) {
      buffer = `${buffer}\n\n${paragraph}`;
      continue;
    }
    flush();
    // Overlap: carry the tail of the previous chunk into the next one so a
    // fact split across a chunk boundary stays retrievable from both sides.
    if (overlap > 0 && buffer.length > overlap) {
      const tail = buffer.slice(-overlap);
      const boundary = tail.indexOf("\n");
      const overlapText = boundary > 0 ? tail.slice(boundary + 1) : tail;
      buffer = `${overlapText}\n\n${paragraph}`;
      bufferStart = start - overlapText.length;
    } else {
      buffer = paragraph;
      bufferStart = start;
    }
  }
  flush();
  return chunks;
}
