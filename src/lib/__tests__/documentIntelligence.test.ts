/**
 * Tests for Document Intelligence module.
 * Tests text extraction for PDF, DOCX, TXT, and edge cases.
 * PDF/DOCX tests use small inline fixtures — no real provider calls.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock pdfjs-dist + mammoth so tests don't need real binaries
vi.mock("pdfjs-dist/build/pdf.mjs", () => ({
  GlobalWorkerOptions: { workerSrc: "" },
  version: "6.4.299",
  getDocument: vi.fn(() => ({
    promise: Promise.resolve({
      numPages: 3,
      getPage: (n: number) => Promise.resolve({
        getTextContent: () => Promise.resolve({
          items: [{ str: `Page ${n} content here. ` }, { str: "More text." }],
        }),
      }),
    }),
  })),
}));

vi.mock("mammoth/mammoth.browser", () => ({
  extractRawText: vi.fn(() => Promise.resolve({
    value: "DOCX extracted text. This is paragraph one. This is paragraph two.",
  })),
}));

import { detectDocumentFormat, validateFileSize, extractDocument, formatDocumentForChat, isSupportedDocument, chunkDocument, selectRelevantChunks, formatRetrievedChunksForChat } from "../documentIntelligence";

describe("Document Intelligence", () => {
  describe("detectDocumentFormat", () => {
    it("detects PDF by extension", () => {
      expect(detectDocumentFormat("report.pdf", "application/pdf")).toBe("pdf");
    });
    it("detects DOCX by extension", () => {
      expect(detectDocumentFormat("doc.docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document")).toBe("docx");
    });
    it("detects TXT", () => {
      expect(detectDocumentFormat("notes.txt", "text/plain")).toBe("txt");
    });
    it("detects Markdown", () => {
      expect(detectDocumentFormat("readme.md", "text/markdown")).toBe("md");
    });
    it("detects CSV", () => {
      expect(detectDocumentFormat("data.csv", "text/csv")).toBe("csv");
    });
    it("detects JSON", () => {
      expect(detectDocumentFormat("config.json", "application/json")).toBe("json");
    });
    it("detects code files", () => {
      expect(detectDocumentFormat("app.ts", "")).toBe("code");
      expect(detectDocumentFormat("main.py", "")).toBe("code");
      expect(detectDocumentFormat("style.css", "")).toBe("code");
    });
    it("returns unknown for unsupported formats", () => {
      expect(detectDocumentFormat("file.xyz", "application/octet-stream")).toBe("unknown");
    });
  });

  describe("validateFileSize", () => {
    it("passes for files under the limit", () => {
      expect(validateFileSize({ size: 1024 }, 1024 * 1024).ok).toBe(true);
    });
    it("fails for files over the limit", () => {
      const result = validateFileSize({ size: 2 * 1024 * 1024 }, 1024 * 1024);
      expect(result.ok).toBe(false);
      expect(result.error).toContain("too large");
    });
  });

  describe("isSupportedDocument", () => {
    it("returns true for PDF", () => {
      expect(isSupportedDocument("file.pdf", "application/pdf")).toBe(true);
    });
    it("returns true for DOCX", () => {
      expect(isSupportedDocument("file.docx", "")).toBe(true);
    });
    it("returns false for unknown", () => {
      expect(isSupportedDocument("file.xyz", "")).toBe(false);
    });
  });

  describe("extractDocument", () => {
    it("extracts text from a TXT file", async () => {
      const text = "Hello, this is a test document.";
      const dataUrl = `data:text/plain;base64,${btoa(text)}`;
      const result = await extractDocument(dataUrl, "test.txt", "text/plain");
      expect(result.format).toBe("txt");
      expect(result.text).toContain("Hello, this is a test document.");
      expect(result.empty).toBe(false);
      expect(result.truncated).toBe(false);
    });

    it("handles empty TXT files", async () => {
      const dataUrl = `data:text/plain;base64,${btoa("")}`;
      const result = await extractDocument(dataUrl, "empty.txt", "text/plain");
      expect(result.empty).toBe(true);
      expect(result.notice).toContain("empty");
    });

    it("extracts text from a PDF (mocked)", async () => {
      const dataUrl = "data:application/pdf;base64,JVBERi0xLjQKJcfsj6I="; // minimal
      const result = await extractDocument(dataUrl, "test.pdf", "application/pdf");
      expect(result.format).toBe("pdf");
      expect(result.pageCount).toBe(3);
      expect(result.text).toContain("Page 1 content");
      expect(result.text).toContain("Page 2 content");
      expect(result.text).toContain("Page 3 content");
    });

    it("extracts text from a DOCX (mocked)", async () => {
      const dataUrl = "data:application/vnd.openxmlformats-officedocument.wordprocessingml.document;base64,UEsDBA==";
      const result = await extractDocument(dataUrl, "test.docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
      expect(result.format).toBe("docx");
      expect(result.text).toContain("DOCX extracted text");
    });

    it("returns error for unsupported format", async () => {
      const result = await extractDocument("data:application/octet-stream;base64,", "file.xyz", "application/octet-stream");
      expect(result.format).toBe("unknown");
      expect(result.empty).toBe(true);
      expect(result.notice).toContain("Unsupported file format");
    });

    it("truncates long text", async () => {
      const longText = "A".repeat(600000);
      const dataUrl = `data:text/plain;base64,${btoa(longText)}`;
      const result = await extractDocument(dataUrl, "big.txt", "text/plain", { maxTextLength: 100000 });
      expect(result.truncated).toBe(true);
      expect(result.notice).toContain("truncated");
      expect(result.text.length).toBeLessThanOrEqual(100000);
    });
  });

  describe("formatDocumentForChat", () => {
    it("formats a document with metadata", () => {
      const doc = {
        text: "Document content here.",
        filename: "report.pdf",
        format: "pdf" as const,
        pageCount: 5,
        truncated: false,
        empty: false,
      };
      const formatted = formatDocumentForChat(doc);
      expect(formatted).toContain("[Document Analysis]");
      expect(formatted).toContain("File: report.pdf");
      expect(formatted).toContain("Format: PDF");
      expect(formatted).toContain("Pages: 5");
      expect(formatted).toContain("Document content here.");
    });

    it("includes notice when present", () => {
      const doc = {
        text: "",
        filename: "scanned.pdf",
        format: "pdf" as const,
        truncated: false,
        empty: true,
        notice: "Scanned PDF — no text layer.",
      };
      const formatted = formatDocumentForChat(doc);
      expect(formatted).toContain("Scanned PDF — no text layer.");
    });

    it("discloses partial coverage when truncated", () => {
      const doc = {
        text: "A".repeat(100),
        filename: "big.pdf",
        format: "pdf" as const,
        truncated: true,
        empty: false,
      };
      const formatted = formatDocumentForChat(doc);
      expect(formatted).toContain("Partial");
    });
  });

  describe("chunkDocument", () => {
    it("returns single chunk for small documents", () => {
            const chunks = chunkDocument("Small text.");
      expect(chunks).toHaveLength(1);
      expect(chunks[0].isLast).toBe(true);
      expect(chunks[0].total).toBe(1);
    });

    it("splits large text into multiple chunks", () => {
            const longText = Array(100).fill("Paragraph content here. ").join("\n\n");
      const chunks = chunkDocument(longText, 200);
      expect(chunks.length).toBeGreaterThan(1);
      expect(chunks[0].index).toBe(0);
      expect(chunks[chunks.length - 1].isLast).toBe(true);
      // All chunks should have correct total
      for (const c of chunks) expect(c.total).toBe(chunks.length);
    });

    it("preserves page boundaries for PDF format", () => {
            const pdfText = "--- Page 1 ---\nPage 1 content\n\n--- Page 2 ---\nPage 2 content\n\n--- Page 3 ---\nPage 3 content";
      const chunks = chunkDocument(pdfText, 30, "pdf");
      expect(chunks.length).toBeGreaterThan(1);
      // Each chunk should have page numbers
      for (const c of chunks) {
        if (c.pages) expect(c.pages.length).toBeGreaterThan(0);
      }
    });
  });

  describe("encrypted/corrupt PDF handling", () => {
    it("returns clear error for encrypted PDFs", async () => {
      // Re-mock pdfjs to throw PasswordException
      const pdfjs = await import("pdfjs-dist/build/pdf.mjs");
      const mockGetDocument = pdfjs.getDocument as any;
      mockGetDocument.mockImplementationOnce(() => ({
        promise: Promise.reject({ name: "PasswordException", message: "password required" }),
      }));

      const result = await extractDocument(
        "data:application/pdf;base64,JVBERi0xLjQK",
        "encrypted.pdf",
        "application/pdf",
      );
      expect(result.empty).toBe(true);
      expect(result.notice).toContain("encrypted");
    });

    it("returns clear error for corrupt PDFs", async () => {
      const pdfjs = await import("pdfjs-dist/build/pdf.mjs");
      const mockGetDocument = pdfjs.getDocument as any;
      mockGetDocument.mockImplementationOnce(() => ({
        promise: Promise.reject({ name: "InvalidPDFException", message: "Invalid PDF" }),
      }));

      const result = await extractDocument(
        "data:application/pdf;base64,JVBERi0xLjQK",
        "corrupt.pdf",
        "application/pdf",
      );
      expect(result.empty).toBe(true);
      expect(result.notice).toContain("corrupt");
    });
  });

  describe("selectRelevantChunks", () => {
    it("returns full document when all chunks fit budget", () => {
      const chunks = [
        { text: "Small chunk one.", index: 0, total: 2, isLast: false },
        { text: "Small chunk two.", index: 1, total: 2, isLast: true },
      ];
      const result = selectRelevantChunks(chunks, "any question", 100_000);
      expect(result.fullDocument).toBe(true);
      expect(result.selected).toHaveLength(2);
      expect(result.disclosure).toContain("all 2 chunks");
    });

    it("selects relevant chunks by keyword match", () => {
      const chunks = [
        { text: "This chunk discusses revenue growth and quarterly earnings.", index: 0, total: 5, isLast: false },
        { text: "This chunk is about employee benefits and HR policies.", index: 1, total: 5, isLast: false },
        { text: "Revenue projections for next year look strong.", index: 2, total: 5, isLast: false },
        { text: "The office cafeteria menu has changed.", index: 3, total: 5, isLast: false },
        { text: "Conclusion and future outlook.", index: 4, total: 5, isLast: true },
      ];
      const result = selectRelevantChunks(chunks, "What is the revenue growth?", 200, 3);
      expect(result.fullDocument).toBe(false);
      expect(result.selected.length).toBeLessThanOrEqual(3);
      // Chunks mentioning "revenue" should be selected (indices 0 and 2)
      expect(result.selectedIndices).toContain(0);
      expect(result.selectedIndices).toContain(2);
    });

    it("falls back to beginning/middle/end when no keywords match", () => {
      const chunks = Array(10).fill(null).map((_, i) => ({
        text: `Generic content ${i}. `.repeat(50),
        index: i,
        total: 10,
        isLast: i === 9,
      }));
      const result = selectRelevantChunks(chunks, "summarize", 200, 5);
      expect(result.fullDocument).toBe(false);
      expect(result.selected.length).toBeGreaterThanOrEqual(2);
      // Should include first and last chunk
      expect(result.selectedIndices).toContain(0);
      expect(result.selectedIndices).toContain(9);
    });

    it("disclosure mentions partial analysis", () => {
      const chunks = Array(5).fill(null).map((_, i) => ({
        text: `Chunk ${i}. `.repeat(100),
        index: i,
        total: 5,
        isLast: i === 4,
      }));
      const result = selectRelevantChunks(chunks, "test question", 200, 3);
      expect(result.disclosure).toContain("of 5 chunks");
      expect(result.disclosure).toContain("missed");
    });
  });

  describe("formatRetrievedChunksForChat", () => {
    it("includes filename + chunk count + disclosure", () => {
      const retrieval = {
        selected: [
          { text: "Chunk 0 content.", index: 0, total: 3, isLast: false, pages: [1, 2] },
          { text: "Chunk 2 content.", index: 2, total: 3, isLast: true, pages: [5] },
        ],
        selectedIndices: [0, 2],
        totalChunks: 3,
        fullDocument: false,
        disclosure: "Analyzed 2 of 3 chunks. Some content may have been missed.",
      };
      const formatted = formatRetrievedChunksForChat(retrieval, "report.pdf", "pdf");
      expect(formatted).toContain("File: report.pdf");
      expect(formatted).toContain("Chunks analyzed: 2 of 3");
      expect(formatted).toContain("Chunk 1 of 3");
      expect(formatted).toContain("pages 1-2");
      expect(formatted).toContain("Some content may have been missed");
    });
  });
});
