import { describe, expect, it } from "vitest";
import {
  DOCUMENT_THEMES,
  parseWorldClassMarkdownBlocks,
  extractDocumentMetadata,
  exportWorldClassMarkdown,
  exportWorldClassPlainText,
  exportWorldClassWordDoc,
  exportWorldClassHtml,
} from "./worldClassDocumentExport";

describe("worldClassDocumentExport engine", () => {
  const sampleMarkdown = `# Strategic AI Transformation Report
*Prepared for Enterprise Leadership*

[STAT: 99.9% | Platform Uptime]
[STAT: 4.2x | Efficiency Gain]

## Executive Summary
This document details the architectural and strategic blueprint for deploying autonomous cognitive workflows.

> High-priority initiative: Complete infrastructure hardening by Q4.

### Comparative Benchmark
| Platform | Inference Latency | Security Score | Cost per 1M Tokens |
|:---------|:-----------------:|:--------------:|-------------------:|
| ShadowTalk AI | 120ms | 99.8% | $0.15 |
| Legacy Cloud | 450ms | 82.1% | $1.20 |

### Deployment Checklist
- [x] Baseline security audit completed
- [x] Zero-retention LLM endpoint verified
- [ ] Multi-region fallback configured

\`\`\`typescript
export function runInference(prompt: string): Promise<string> {
  return shadowAi.complete({ prompt });
}
\`\`\`

## Key Recommendations
1. Modernize API gateway routing
2. Implement cryptographic proof validation
3. Scale zero-cloud local worker pools
`;

  it("defines all 4 publication themes with complete color palettes", () => {
    const themeKeys = Object.keys(DOCUMENT_THEMES);
    expect(themeKeys).toContain("executive");
    expect(themeKeys).toContain("obsidian");
    expect(themeKeys).toContain("minimal");
    expect(themeKeys).toContain("academic");

    for (const key of themeKeys) {
      const theme = DOCUMENT_THEMES[key as keyof typeof DOCUMENT_THEMES];
      expect(theme.name).toBeDefined();
      expect(theme.primary).toHaveLength(3);
      expect(theme.accent).toHaveLength(3);
      expect(theme.fontBody).toBeDefined();
      expect(theme.fontHeading).toBeDefined();
    }
  });

  it("extracts comprehensive metadata from markdown", () => {
    const meta = extractDocumentMetadata(sampleMarkdown, {
      author: "Chief AI Architect",
      classification: "Confidential",
    });

    expect(meta.title).toBe("Strategic AI Transformation Report");
    expect(meta.subtitle).toBe("Prepared for Enterprise Leadership");
    expect(meta.author).toBe("Chief AI Architect");
    expect(meta.classification).toBe("CONFIDENTIAL");
    expect(meta.wordCount).toBeGreaterThan(50);
    expect(meta.readingTimeMin).toBeGreaterThanOrEqual(1);
    expect(meta.generatedDate).toBeDefined();
  });

  it("parses rich markdown blocks correctly", () => {
    const blocks = parseWorldClassMarkdownBlocks(sampleMarkdown);

    // Should find title and subtitle
    const h1 = blocks.find((b) => b.type === "h1");
    expect(h1).toBeDefined();
    expect(h1?.content).toBe("Strategic AI Transformation Report");

    const subtitle = blocks.find((b) => b.type === "subtitle");
    expect(subtitle).toBeDefined();
    expect(subtitle?.content).toBe("Prepared for Enterprise Leadership");

    // Should find stat grid
    const statGrid = blocks.find((b) => b.type === "stat-grid");
    expect(statGrid).toBeDefined();
    expect(statGrid?.stats).toHaveLength(2);
    expect(statGrid?.stats?.[0].value).toBe("99.9%");
    expect(statGrid?.stats?.[0].label).toBe("Platform Uptime");

    // Should find table
    const table = blocks.find((b) => b.type === "table");
    expect(table).toBeDefined();
    expect(table?.tableHeaders).toEqual(["Platform", "Inference Latency", "Security Score", "Cost per 1M Tokens"]);
    expect(table?.tableRows).toHaveLength(2);
    expect(table?.tableRows?.[0][0]).toBe("ShadowTalk AI");

    // Should find checklist
    const checklist = blocks.find((b) => b.type === "checklist");
    expect(checklist).toBeDefined();
    expect(checklist?.checked).toBe(true);

    // Should find code block
    const code = blocks.find((b) => b.type === "code");
    expect(code).toBeDefined();
    expect(code?.language).toBe("typescript");
    expect(code?.content).toContain("runInference");

    // Should find callout
    const callout = blocks.find((b) => b.type === "callout");
    expect(callout).toBeDefined();
    expect(callout?.content).toContain("High-priority initiative");
  });

  it("generates publication-ready Markdown with YAML Frontmatter", () => {
    const md = exportWorldClassMarkdown(sampleMarkdown, {
      author: "Dr. Elena Rostova",
      classification: "Executive Brief",
    });

    expect(md.startsWith("---")).toBe(true);
    expect(md).toContain("title: \"Strategic AI Transformation Report\"");
    expect(md).toContain("author: \"Dr. Elena Rostova\"");
    expect(md).toContain("classification: \"EXECUTIVE BRIEF\"");
    expect(md).toContain("generator: \"ShadowTalk AI World-Class Document Studio\"");
    expect(md).toContain("# Strategic AI Transformation Report");
  });

  it("generates publication-grade Plain Text with Unicode box drawings and TOC", () => {
    const txt = exportWorldClassPlainText(sampleMarkdown, {
      author: "ShadowTalk Research Team",
      classification: "Public Report",
    });

    // Unicode box title
    expect(txt).toContain("╔═");
    expect(txt).toContain("STRATEGIC AI TRANSFORMATION REPORT");
    expect(txt).toContain("╚═");

    // Metadata section
    expect(txt).toContain("AUTHOR         : ShadowTalk Research Team");
    expect(txt).toContain("CLASSIFICATION : PUBLIC REPORT");

    // Table of contents with dot leaders
    expect(txt).toContain("TABLE OF CONTENTS");
    expect(txt).toMatch(/1\.\s+Executive Summary\s+\.{3,}/);

    // Metrics formatted
    expect(txt).toContain("[ METRIC: 99.9% | Platform Uptime ]");

    // Unicode box-drawing table
    expect(txt).toContain("┌─");
    expect(txt).toContain("┼─");
    expect(txt).toContain("└─");
    expect(txt).toContain("ShadowTalk AI");
  });

  it("generates Microsoft Word compatible HTML/XML document with MSO styles", () => {
    const docHtml = exportWorldClassWordDoc(sampleMarkdown, {
      theme: "executive",
      author: "Corporate Strategy",
    });

    expect(docHtml).toContain("urn:schemas-microsoft-com:office:word");
    expect(docHtml).toContain("@page WordSection1");
    expect(docHtml).toContain("mso-style-name:\"Heading 1\"");
    expect(docHtml).toContain("mso-style-name:\"Heading 2\"");
    expect(docHtml).toContain("Strategic AI Transformation Report");
    expect(docHtml).toContain("<table");
    expect(docHtml).toContain("Inference Latency");
  });

  it("generates self-contained standalone HTML with embedded styles and floating TOC", () => {
    const standaloneHtml = exportWorldClassHtml(sampleMarkdown, {
      theme: "obsidian",
      classification: "Confidential",
    });

    expect(standaloneHtml).toContain("<!DOCTYPE html>");
    expect(standaloneHtml).toContain("<html lang=\"en\">");
    expect(standaloneHtml).toContain("Strategic AI Transformation Report");
    expect(standaloneHtml).toContain("--doc-primary:");
    expect(standaloneHtml).toContain("Table of Contents");
    expect(standaloneHtml).toContain("@media print");
    expect(standaloneHtml).toContain("ShadowTalk AI World-Class Document Studio");
  });
});
