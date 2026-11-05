/**
 * Regression: printWorldClassDocument must HTML-escape every interpolated
 * metadata field. The print window is opened via window.open("", "_blank")
 * and inherits the app origin, so raw interpolation of document-controlled
 * strings (title / subtitle / author / classification / date) was XSS.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { printWorldClassDocument } from "@/lib/worldClassDocumentExport";

const writtenChunks: string[] = [];

describe("print export XSS escaping", () => {
  beforeEach(() => {
    writtenChunks.length = 0;
    const fakeWindow = {
      document: {
        open: vi.fn(),
        write: vi.fn((html: string) => writtenChunks.push(html)),
        close: vi.fn(),
      },
    };
    vi.spyOn(window, "open").mockReturnValue(fakeWindow as unknown as Window);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("escapes a malicious markdown title", () => {
    const payload = "<img src=x onerror=alert(1)>";
    printWorldClassDocument(`# ${payload}\n\nSome body text.`);

    const html = writtenChunks.join("");
    expect(html).not.toContain("<img src=x");
    expect(html).toContain("&lt;img src=x");
    expect(html).toContain("onerror=alert(1)"); // present but inert (escaped)
  });

  it("escapes malicious options (author / classification / date)", () => {
    printWorldClassDocument("# Safe Title\n\nBody.", {
      author: "<script>alert('author')</script>",
      classification: "<script>alert('class')</script>",
      date: "<script>alert('date')</script>",
    });

    const html = writtenChunks.join("");
    expect(html).not.toContain("<script>alert(");
    expect(html).toContain("&lt;script&gt;alert(");
  });

  it("escapes a malicious subtitle", () => {
    const payload = "<iframe src='javascript:alert(1)'></iframe>";
    printWorldClassDocument(`# Title\n\n*${payload}*\n\nBody.`);

    const html = writtenChunks.join("");
    expect(html).not.toContain("<iframe src=");
    expect(html).toContain("&lt;iframe");
  });

  it("still renders legitimate content with special characters", () => {
    printWorldClassDocument("# Q&A: R&D Notes\n\nBody text.");

    const html = writtenChunks.join("");
    expect(html).toContain("Q&amp;A: R&amp;D Notes");
    expect(html).toContain("<h1>"); // legit structure is untouched
  });
});
