/**
 * Document Intelligence — local text extraction for PDF, DOCX, TXT, MD, CSV, JSON.
 *
 * Extracts text entirely in the browser — no document content is uploaded to
 * any external service for extraction. The extracted text is then sent to the
 * user's configured BYOK provider as a normal chat message.
 *
 * Supported formats:
 *   - PDF (pdfjs-dist, page-by-page, page boundaries preserved)
 *   - DOCX (mammoth, paragraph + heading extraction)
 *   - TXT / MD / CSV / JSON / code files (plain text read)
 *
 * Limits:
 *   - Max file size: 25 MB
 *   - Max extracted text: 500,000 chars (~125K tokens) — if exceeded, the text
 *     is chunked and only the first chunk is sent, with a clear notice
 *   - Max PDF pages processed: 200 (beyond that, a notice is shown)
 *
 * Scanned PDFs (image-only, no text layer) return a clear "no extractable text"
 * error — OCR is not implemented (would require a vision model call, which is
 * a separate explicit step the user can trigger via image analysis).
 */

export interface ExtractedDocument {
  /** The extracted text content, ready to send to a chat model. */
  text: string;
  /** The filename, preserved for metadata. */
  filename: string;
  /** The detected format. */
  format: "pdf" | "docx" | "pptx" | "xlsx" | "odt" | "txt" | "md" | "csv" | "json" | "code" | "unknown";
  /** Number of pages (PDF only). */
  pageCount?: number;
  /** Whether the text was truncated due to size limits. */
  truncated: boolean;
  /** Whether the document had no extractable text (e.g., scanned PDF). */
  empty: boolean;
  /** A human-readable notice about the extraction (e.g., truncation). */
  notice?: string;
}

export interface DocumentExtractionOptions {
  /** Max file size in bytes (default 25MB). */
  maxFileSize?: number;
  /** Max extracted text length in chars (default 500,000). */
  maxTextLength?: number;
  /** Max PDF pages to process (default 200). */
  maxPdfPages?: number;
}

const DEFAULTS: Required<DocumentExtractionOptions> = {
  maxFileSize: 25 * 1024 * 1024,
  maxTextLength: 500_000,
  maxPdfPages: 200,
};

/** Detect the document format from the filename + MIME type. */
export function detectDocumentFormat(filename: string, mimeType: string): ExtractedDocument["format"] {
  const ext = filename.split(".").pop()?.toLowerCase() || "";
  if (ext === "pdf" || mimeType === "application/pdf") return "pdf";
  if (ext === "docx" || mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") return "docx";
  if (ext === "pptx" || mimeType === "application/vnd.openxmlformats-officedocument.presentationml.presentation") return "pptx";
  if (ext === "xlsx" || mimeType === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet") return "xlsx";
  if (ext === "odt" || mimeType === "application/vnd.oasis.opendocument.text") return "odt";
  if (ext === "txt" || mimeType === "text/plain") return "txt";
  if (ext === "md" || mimeType === "text/markdown") return "md";
  if (ext === "csv" || mimeType === "text/csv") return "csv";
  if (ext === "json" || mimeType === "application/json") return "json";
  // Code file extensions
  if (["js", "ts", "jsx", "tsx", "py", "rb", "go", "rs", "java", "c", "cpp", "h", "css", "html", "xml", "yml", "yaml", "sh", "sql"].includes(ext)) return "code";
  return "unknown";
}

/** Return decoded byte size for a data URL, or UTF-8 size for desktop text. */
export function estimateFileSize(data: string): number {
  if (!data.startsWith("data:")) return new TextEncoder().encode(data).length;
  const base64 = data.slice(data.indexOf(",") + 1).replace(/\s/g, "");
  return Math.max(0, Math.floor(base64.length * 3 / 4) - (base64.endsWith("==") ? 2 : base64.endsWith("=") ? 1 : 0));
}

/** Validate file size before processing. */
export function validateFileSize(file: { size: number }, maxBytes: number = DEFAULTS.maxFileSize): { ok: boolean; error?: string } {
  if (file.size > maxBytes) {
    return { ok: false, error: `File is too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Maximum is ${maxBytes / 1024 / 1024} MB.` };
  }
  return { ok: true };
}

/**
 * Extract text from a PDF using pdfjs-dist.
 * Runs entirely in the browser — no upload.
 */
async function extractPdf(
  dataUrl: string,
  opts: Required<DocumentExtractionOptions>,
): Promise<{ text: string; pageCount: number; truncated: boolean; empty: boolean; notice?: string }> {
  // pdfjs-dist — load the main module + worker.
  // Use Vite's ?url import for the worker so it's bundled locally (no CDN
  // dependency, works with strict CSP, survives ad blockers).
  const pdfjs = await import("pdfjs-dist");
  // Set up the PDF worker. Try multiple approaches for cross-platform compat:
  // 1. Vite ?url import (best — bundles the worker locally)
  // 2. CDN fallback (works everywhere but depends on network)
  try {
    const workerUrl = (await import("pdfjs-dist/build/pdf.worker.min.mjs?url")).default;
    pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;
  } catch {
    // Fallback: CDN (matches the installed version)
    pdfjs.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;
  }

  // Convert data URL to Uint8Array
  const base64 = dataUrl.split(",")[1] || "";
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i);

  const loadingTask = pdfjs.getDocument({ data: bytes });
  const pdf = await loadingTask.promise;
  const totalPages = pdf.numPages;
  const pagesToProcess = Math.min(totalPages, opts.maxPdfPages);

  const pageTexts: string[] = [];
  let totalChars = 0;
  let truncated = false;

  for (let i = 1; i <= pagesToProcess; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const pageText = content.items
      .map((item: unknown) => (item as { str?: string }).str || "")
      .join(" ")
      .trim();
    if (pageText) {
      pageTexts.push(`--- Page ${i} ---\n${pageText}`);
      totalChars += pageText.length;
      if (totalChars > opts.maxTextLength) {
        truncated = true;
        break;
      }
    }
  }

  const text = pageTexts.join("\n\n");
  const empty = text.length === 0;

  let notice: string | undefined;
  if (truncated) {
    notice = `Document was truncated at ${opts.maxTextLength.toLocaleString()} characters. ${pagesToProcess} of ${totalPages} pages processed.`;
  } else if (pagesToProcess < totalPages) {
    notice = `Only the first ${pagesToProcess} of ${totalPages} pages were processed (limit).`;
  } else if (empty) {
    notice = "This PDF appears to be scanned (image-only) with no extractable text layer. Try uploading page screenshots as images for vision-based analysis.";
  }

  return { text, pageCount: totalPages, truncated, empty, notice };
}

/** Render a bounded number of scanned PDF pages for vision-model analysis. */
export async function renderScannedPdfPages(
  dataUrl: string,
  maxPages = 5,
): Promise<Array<{ page: number; dataUrl: string }>> {
  if (!dataUrl.startsWith("data:")) throw new Error("The PDF data is not available for page rendering.");
  const pdfjs = await import("pdfjs-dist");
  try {
    const workerUrl = (await import("pdfjs-dist/build/pdf.worker.min.mjs?url")).default;
    pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;
  } catch {
    pdfjs.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;
  }
  const binary = atob(dataUrl.slice(dataUrl.indexOf(",") + 1));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  const pdf = await pdfjs.getDocument({ data: bytes }).promise;
  const pages: Array<{ page: number; dataUrl: string }> = [];
  for (let pageNumber = 1; pageNumber <= Math.min(pdf.numPages, maxPages); pageNumber++) {
    const page = await pdf.getPage(pageNumber);
    const baseViewport = page.getViewport({ scale: 1 });
    const scale = Math.min(1.5, 1400 / Math.max(baseViewport.width, baseViewport.height));
    const viewport = page.getViewport({ scale });
    const canvas = document.createElement("canvas");
    canvas.width = Math.ceil(viewport.width);
    canvas.height = Math.ceil(viewport.height);
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Your browser could not render the scanned PDF pages.");
    await page.render({ canvas, canvasContext: context, viewport }).promise;
    pages.push({ page: pageNumber, dataUrl: canvas.toDataURL("image/jpeg", 0.82) });
  }
  return pages;
}

/**
 * Extract text from a DOCX using mammoth.
 * Runs entirely in the browser — no upload.
 */
async function extractDocx(
  dataUrl: string,
  opts: Required<DocumentExtractionOptions>,
): Promise<{ text: string; truncated: boolean; empty: boolean; notice?: string }> {
  const mammoth = await import("mammoth/mammoth.browser");
  // Convert data URL to ArrayBuffer
  const base64 = dataUrl.split(",")[1] || "";
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i);

  const result = await mammoth.extractRawText({ arrayBuffer: bytes.buffer });
  let text = result.value || "";
  const empty = text.trim().length === 0;
  let truncated = false;
  let notice: string | undefined;

  if (text.length > opts.maxTextLength) {
    text = text.slice(0, opts.maxTextLength);
    truncated = true;
    notice = `Document was truncated at ${opts.maxTextLength.toLocaleString()} characters.`;
  }
  if (empty) {
    notice = "This DOCX appears to be empty or contains no extractable text.";
  }

  return { text, truncated, empty, notice };
}

async function extractOfficeXml(
  dataUrl: string,
  format: "pptx" | "xlsx" | "odt",
  opts: Required<DocumentExtractionOptions>,
): Promise<{ text: string; truncated: boolean; empty: boolean; notice?: string }> {
  if (!dataUrl.startsWith("data:")) throw new Error("Select this office file with the browser file picker and try again.");
  const base64 = dataUrl.slice(dataUrl.indexOf(",") + 1);
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  const { unzipSync } = await import("fflate");
  const archive = unzipSync(bytes);
  const parse = (path: string): Document => {
    const content = archive[path];
    if (!content) throw new Error(`The ${format.toUpperCase()} document is missing ${path}.`);
    const document = new DOMParser().parseFromString(new TextDecoder().decode(content), "application/xml");
    if (document.querySelector("parsererror")) throw new Error("The Office document contains invalid XML.");
    return document;
  };
  let text = "";
  if (format === "pptx") {
    const slides = Object.keys(archive)
      .filter((path) => /^ppt\/slides\/slide\d+\.xml$/.test(path))
      .sort((a, b) => Number(a.match(/slide(\d+)/)?.[1]) - Number(b.match(/slide(\d+)/)?.[1]));
    text = slides.map((path, index) => {
      const values = Array.from(parse(path).getElementsByTagNameNS("*", "t"), (node) => node.textContent || "").filter(Boolean);
      return values.length ? `--- Slide ${index + 1} ---\n${values.join(" ")}` : "";
    }).filter(Boolean).join("\n\n");
  } else if (format === "xlsx") {
    const shared = archive["xl/sharedStrings.xml"]
      ? Array.from(parse("xl/sharedStrings.xml").getElementsByTagNameNS("*", "si"), (item) =>
          Array.from(item.getElementsByTagNameNS("*", "t"), (node) => node.textContent || "").join(""),
        )
      : [];
    const sheets = Object.keys(archive)
      .filter((path) => /^xl\/worksheets\/sheet\d+\.xml$/.test(path))
      .sort((a, b) => Number(a.match(/sheet(\d+)/)?.[1]) - Number(b.match(/sheet(\d+)/)?.[1]));
    text = sheets.map((path, sheetIndex) => {
      const rows = Array.from(parse(path).getElementsByTagNameNS("*", "row"), (row) =>
        Array.from(row.getElementsByTagNameNS("*", "c"), (cell) => {
          const type = cell.getAttribute("t");
          const value = type === "inlineStr"
            ? Array.from(cell.getElementsByTagNameNS("*", "t"), (node) => node.textContent || "").join("")
            : cell.getElementsByTagNameNS("*", "v")[0]?.textContent || "";
          return type === "s" ? shared[Number(value)] || "" : value;
        }).join("\t"),
      ).filter((row) => row.trim());
      return rows.length ? `--- Sheet ${sheetIndex + 1} ---\n${rows.join("\n")}` : "";
    }).filter(Boolean).join("\n\n");
  } else {
    const content = parse("content.xml");
    text = Array.from(content.getElementsByTagNameNS("*", "p"), (node) => node.textContent || "").filter(Boolean).join("\n\n");
  }
  const truncated = text.length > opts.maxTextLength;
  if (truncated) text = text.slice(0, opts.maxTextLength);
  const empty = !text.trim();
  return {
    text,
    truncated,
    empty,
    ...(truncated ? { notice: `Document was truncated at ${opts.maxTextLength.toLocaleString()} characters.` } : {}),
    ...(!truncated && empty ? { notice: "No extractable text was found in this document." } : {}),
  };
}

/**
 * Extract text from a plain-text file (TXT, MD, CSV, JSON, code).
 */
function extractPlainText(dataUrl: string, opts: Required<DocumentExtractionOptions>): { text: string; truncated: boolean; empty: boolean; notice?: string } {
  if (!dataUrl.startsWith("data:")) {
    let text = dataUrl;
    const truncated = text.length > opts.maxTextLength;
    if (truncated) text = text.slice(0, opts.maxTextLength);
    const empty = !text.trim();
    return {
      text,
      truncated,
      empty,
      ...(truncated ? { notice: `Document was truncated at ${opts.maxTextLength.toLocaleString()} characters.` } : {}),
      ...(!truncated && empty ? { notice: "This file is empty." } : {}),
    };
  }
  // data URL format: data:<mime>;base64,<data>
  const base64 = dataUrl.split(",")[1] || "";
  let text: string;
  try {
    // Decode base64 as UTF-8
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i);
    text = new TextDecoder("utf-8").decode(bytes);
  } catch {
    return { text: "", truncated: false, empty: true, notice: "Could not decode the file as UTF-8 text." };
  }

  const empty = text.trim().length === 0;
  let truncated = false;
  let notice: string | undefined;

  if (text.length > opts.maxTextLength) {
    text = text.slice(0, opts.maxTextLength);
    truncated = true;
    notice = `Document was truncated at ${opts.maxTextLength.toLocaleString()} characters.`;
  }
  if (empty) {
    notice = "This file is empty.";
  }

  return { text, truncated, empty, notice };
}

/**
 * Main entry point — extract text from a supported document.
 * @param dataUrl The file as a data URL (base64)
 * @param filename The original filename
 * @param mimeType The MIME type
 * @param opts Extraction options
 */
export async function extractDocument(
  dataUrl: string,
  filename: string,
  mimeType: string,
  opts: DocumentExtractionOptions = {},
): Promise<ExtractedDocument> {
  const fullOpts = { ...DEFAULTS, ...opts };
  const format = detectDocumentFormat(filename, mimeType);

  if (format === "unknown") {
    return {
      text: "",
      filename,
      format,
      truncated: false,
      empty: true,
      notice: `Unsupported file format: ${filename}. Supported: PDF, DOCX, PPTX, XLSX, ODT, TXT, MD, CSV, JSON, and code files.`,
    };
  }

  try {
    if (format === "pdf") {
      const result = await extractPdf(dataUrl, fullOpts);
      return { text: result.text, filename, format, pageCount: result.pageCount, ...result };
    }
    if (format === "docx") {
      const result = await extractDocx(dataUrl, fullOpts);
      return { text: result.text, filename, format, ...result };
    }
    if (format === "pptx" || format === "xlsx" || format === "odt") {
      const result = await extractOfficeXml(dataUrl, format, fullOpts);
      return { text: result.text, filename, format, ...result };
    }
    // Plain text formats
    const result = extractPlainText(dataUrl, fullOpts);
    return { text: result.text, filename, format, ...result };
  } catch (err: any) {
    // Detect encrypted/password-protected PDFs (pdfjs throws PasswordException)
    const errName = err?.name || "";
    const errMessage = err?.message || "Unknown error";
    if (errName === "PasswordException" || errMessage.includes("password")) {
      return {
        text: "",
        filename,
        format,
        truncated: false,
        empty: true,
        notice: `This PDF is encrypted or password-protected. Remove the password and try again.`,
      };
    }
    if (errName === "InvalidPDFException" || errMessage.includes("Invalid PDF")) {
      return {
        text: "",
        filename,
        format,
        truncated: false,
        empty: true,
        notice: `This PDF is corrupt or invalid. The file may be incomplete or not a real PDF.`,
      };
    }
    return {
      text: "",
      filename,
      format,
      truncated: false,
      empty: true,
      notice: `Failed to extract text from ${filename}: ${errMessage}`,
    };
  }
}

/**
 * Chunk a document for context-window-safe processing.
 *
 * Most chat models have context windows of 4K-32K tokens (~16K-128K chars).
 * Sending a 500K-char document in one request will fail for most models.
 * This function splits the document into chunks at page boundaries (for PDFs)
 * or at paragraph boundaries (for other formats), each under `chunkSize` chars.
 *
 * The caller should:
 *   1. Send the first chunk with the user's question
 *   2. If the user asks about content in a later chunk, send that chunk
 *   3. Always disclose which chunk was processed
 */
export interface DocumentChunk {
  /** The chunk text. */
  text: string;
  /** 0-based chunk index. */
  index: number;
  /** Total number of chunks. */
  total: number;
  /** Page numbers covered by this chunk (PDF only). */
  pages?: number[];
  /** Whether this is the last chunk. */
  isLast: boolean;
}

export function chunkDocument(
  text: string,
  chunkSize: number = 30_000,
  format?: ExtractedDocument["format"],
): DocumentChunk[] {
  if (text.length <= chunkSize) {
    return [{ text, index: 0, total: 1, isLast: true }];
  }

  // For PDFs, split at page boundaries (--- Page N ---)
  if (format === "pdf") {
    const pageParts = text.split(/\n\n--- Page \d+ ---\n/);
    const pageMarkers = text.match(/--- Page (\d+) ---/g) || [];
    const chunks: DocumentChunk[] = [];
    let currentChunk = "";
    let currentPages: number[] = [];
    let currentSize = 0;

    for (let i = 0; i < pageParts.length; i++) {
      const part = pageParts[i];
      const pageMarker = pageMarkers[i - 1]?.match(/\d+/);
      const pageNum = pageMarker ? parseInt(pageMarker[0], 10) : i + 1;

      if (currentSize + part.length > chunkSize && currentChunk) {
        chunks.push({
          text: currentChunk,
          index: chunks.length,
          total: -1, // filled in after
          pages: currentPages,
          isLast: false,
        });
        currentChunk = "";
        currentPages = [];
        currentSize = 0;
      }
      if (part.trim()) {
        currentChunk += (currentChunk ? "\n\n" : "") + `--- Page ${pageNum} ---\n${part}`;
        currentPages.push(pageNum);
        currentSize += part.length;
      }
    }
    if (currentChunk) {
      chunks.push({
        text: currentChunk,
        index: chunks.length,
        total: -1,
        pages: currentPages,
        isLast: true,
      });
    }
    // Fill in total
    return chunks.map((c) => ({ ...c, total: chunks.length }));
  }

  // For other formats, split at paragraph boundaries (double newline)
  const paragraphs = text.split(/\n\n+/);
  const chunks: DocumentChunk[] = [];
  let currentChunk = "";
  let currentSize = 0;

  for (const para of paragraphs) {
    if (currentSize + para.length > chunkSize && currentChunk) {
      chunks.push({
        text: currentChunk,
        index: chunks.length,
        total: -1,
        isLast: false,
      });
      currentChunk = "";
      currentSize = 0;
    }
    if (para.trim()) {
      currentChunk += (currentChunk ? "\n\n" : "") + para;
      currentSize += para.length;
    }
  }
  if (currentChunk) {
    chunks.push({
      text: currentChunk,
      index: chunks.length,
      total: -1,
      isLast: true,
    });
  }
  return chunks.map((c) => ({ ...c, total: chunks.length }));
}

/**
 * Select the most relevant chunks for a user's question using keyword overlap.
 *
 * Simple keyword-based retrieval (no vector DB, no embeddings, no external
 * service). Each chunk is scored by how many question keywords appear in it.
 * The top chunks that fit within the context budget are returned.
 *
 * This is appropriate for the existing architecture — it keeps processing
 * local and doesn't require any provider calls for retrieval.
 *
 * @param chunks The document chunks (from chunkDocument())
 * @param question The user's question
 * @param contextBudget Maximum chars to include (default 60K ≈ 15K tokens,
 *   leaving room for the question + model response in a 16K-token context)
 * @param maxChunks Maximum number of chunks to select (default 5)
 */
export interface RetrievalResult {
  /** The selected chunks, in document order. */
  selected: DocumentChunk[];
  /** The indices of the selected chunks (0-based). */
  selectedIndices: number[];
  /** Total number of chunks available. */
  totalChunks: number;
  /** Whether the entire document fit (no retrieval needed). */
  fullDocument: boolean;
  /** A human-readable disclosure of what was analyzed. */
  disclosure: string;
}

export function selectRelevantChunks(
  chunks: DocumentChunk[],
  question: string,
  contextBudget: number = 60_000,
  maxChunks: number = 5,
): RetrievalResult {
  // If all chunks fit within the budget, send everything
  const totalChars = chunks.reduce((sum, c) => sum + c.text.length, 0);
  if (totalChars <= contextBudget) {
    return {
      selected: chunks,
      selectedIndices: chunks.map((_, i) => i),
      totalChunks: chunks.length,
      fullDocument: true,
      disclosure: chunks.length > 1
        ? `Analyzed all ${chunks.length} chunks of the document.`
        : `Analyzed the full document.`,
    };
  }

  // Extract keywords from the question (words 3+ chars, lowercase, no stopwords)
  const stopWords = new Set([
    "the", "and", "for", "are", "but", "not", "you", "all", "can", "her",
    "was", "one", "our", "out", "has", "have", "had", "did", "this", "that",
    "with", "from", "they", "will", "would", "there", "their", "what", "about",
    "which", "when", "who", "how", "why", "where", "your", "any", "some",
    "into", "than", "them", "then", "these", "those", "also", "only", "very",
    "just", "more", "most", "such", "much", "many", "like", "even", "still",
  ]);
  const keywords = question
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length >= 3 && !stopWords.has(w));

  // Score each chunk by keyword occurrences
  const scored = chunks.map((chunk, idx) => {
    const lowerText = chunk.text.toLowerCase();
    let score = 0;
    for (const kw of keywords) {
      // Count occurrences (whole-word match)
      const matches = lowerText.match(new RegExp(`\\b${kw}\\b`, "g"));
      if (matches) score += matches.length;
    }
    // Small bonus for chunks with page metadata (PDFs)
    if (chunk.pages && chunk.pages.length > 0) score += 0.5;
    return { chunk, idx, score };
  });

  // Sort by score descending, take top maxChunks
  scored.sort((a, b) => b.score - a.score);
  const top = scored.slice(0, maxChunks);

  // If no keywords matched (e.g., question is "summarize"), take the first
  // and last chunks (beginning + conclusion) + middle for coverage
  if (top.every((t) => t.score === 0)) {
    const indices: number[] = [];
    if (chunks.length > 0) indices.push(0);
    if (chunks.length > 2) {
      const mid = Math.floor(chunks.length / 2);
      indices.push(mid);
    }
    if (chunks.length > 1) indices.push(chunks.length - 1);
    const selected = indices
      .filter((v, i, a) => a.indexOf(v) === i) // dedupe
      .map((i) => chunks[i])
      .sort((a, b) => a.index - b.index);
    return {
      selected,
      selectedIndices: selected.map((c) => c.index),
      totalChunks: chunks.length,
      fullDocument: false,
      disclosure: `Analyzed ${selected.length} of ${chunks.length} chunks (beginning, middle, and end) — the document is too large to analyze in full. Some content may have been missed.`,
    };
  }

  // Sort selected back into document order
  top.sort((a, b) => a.idx - b.idx);
  const selected = top.map((t) => t.chunk);

  return {
    selected,
    selectedIndices: top.map((t) => t.idx),
    totalChunks: chunks.length,
    fullDocument: false,
    disclosure: `Analyzed ${selected.length} of ${chunks.length} chunks (selected by relevance to your question). Some content may have been missed. Ask about specific topics for more targeted retrieval.`,
  };
}

/**
 * Format retrieved chunks as a chat message prefix.
 * Includes the disclosure + the selected chunk text with page references.
 */
export function formatRetrievedChunksForChat(
  retrieval: RetrievalResult,
  filename: string,
  format: ExtractedDocument["format"],
): string {
  const meta: string[] = [
    `File: ${filename}`,
    `Format: ${format.toUpperCase()}`,
    `Chunks analyzed: ${retrieval.selected.length} of ${retrieval.totalChunks}`,
  ];

  let body = "";
  for (const chunk of retrieval.selected) {
    const pageRef = chunk.pages && chunk.pages.length > 0
      ? ` (pages ${chunk.pages[0]}${chunk.pages.length > 1 ? `-${chunk.pages[chunk.pages.length - 1]}` : ""})`
      : "";
    body += `\n\n--- Chunk ${chunk.index + 1} of ${chunk.total}${pageRef} ---\n${chunk.text}`;
  }

  return `[Document Analysis — Retrieval]\n${meta.join(" · ")}\nDisclosure: ${retrieval.disclosure}\n\n--- Retrieved Content ---${body}`;
}

/**
 * Format the extracted document as a chat message prefix.
 * This is prepended to the user's question so the model has the document context.
 */
export function formatDocumentForChat(doc: ExtractedDocument): string {
  const meta: string[] = [`File: ${doc.filename}`, `Format: ${doc.format.toUpperCase()}`];
  if (doc.pageCount) meta.push(`Pages: ${doc.pageCount}`);
  if (doc.truncated) meta.push("⚠️ Truncated");
  if (doc.empty) meta.push("⚠️ No extractable text");

  // Disclose partial coverage
  if (doc.truncated) {
    meta.push("⚠️ Partial — only first chunk sent");
  }
  const header = `[Document Analysis]\n${meta.join(" · ")}\n${doc.notice ? `Note: ${doc.notice}\n` : ""}\n--- Document Content ---\n`;
  return header + (doc.text || "[No text extracted]");
}

/** Check if a file is a supported document format. */
export function isSupportedDocument(filename: string, mimeType: string): boolean {
  return detectDocumentFormat(filename, mimeType) !== "unknown";
}
