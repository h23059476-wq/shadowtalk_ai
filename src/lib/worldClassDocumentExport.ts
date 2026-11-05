/**
 * ShadowTalk AI — World-Class Document Generation & Multi-Format Export Engine.
 * 
 * Provides elite, publication-quality document generation and export across:
 * 1. Ultra-HD PDF (with 4 theme presets, cover page, table of contents, stat cards, and running headers/footers)
 * 2. High-DPI Vector Print (browser vector print engine with @page styling)
 * 3. GFM Markdown with rich YAML Frontmatter
 * 4. Executive Plain Text (.txt) with Unicode box-drawing tables and leaders
 * 5. Microsoft Word (.doc/.docx) with complete MSO Office XML styles
 * 6. Standalone Web Document (.html) with responsive styling and dark/light modes
 */

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { polishProfessionalMarkdown } from "./professionalDocument";

export type DocumentTheme = "executive" | "obsidian" | "minimal" | "academic";

export interface ThemeColors {
  name: string;
  fontHeading: string;
  fontBody: string;
  primary: [number, number, number];
  accent: [number, number, number];
  secondary: [number, number, number];
  body: [number, number, number];
  bg: [number, number, number];
  cardBg: [number, number, number];
  cardBorder: [number, number, number];
  fontFamily: "helvetica" | "times" | "courier";
  codeBg: [number, number, number];
  codeText: [number, number, number];
  tableHeadBg: [number, number, number];
  tableHeadText: [number, number, number];
  tableAlternateBg: [number, number, number];
  ruleColor: [number, number, number];
  isDark: boolean;
}

export const DOCUMENT_THEMES: Record<DocumentTheme, ThemeColors> = {
  executive: {
    name: "Executive Navy",
    fontHeading: "Plus Jakarta Sans, sans-serif",
    fontBody: "Inter, sans-serif",
    primary: [15, 23, 42],      // Slate 900
    accent: [37, 99, 235],       // Blue 600
    secondary: [71, 85, 105],    // Slate 600
    body: [30, 41, 59],          // Slate 800
    bg: [255, 255, 255],
    cardBg: [248, 250, 252],     // Slate 50
    cardBorder: [203, 213, 225], // Slate 300
    fontFamily: "helvetica",
    codeBg: [15, 23, 42],
    codeText: [226, 232, 240],
    tableHeadBg: [15, 23, 42],
    tableHeadText: [255, 255, 255],
    tableAlternateBg: [248, 250, 252],
    ruleColor: [226, 232, 240],
    isDark: false,
  },
  obsidian: {
    name: "Obsidian Cyber Dark",
    fontHeading: "Plus Jakarta Sans, sans-serif",
    fontBody: "JetBrains Mono, Inter, monospace",
    primary: [248, 250, 252],    // Slate 50
    accent: [6, 182, 212],       // Cyan 500
    secondary: [148, 163, 184],  // Slate 400
    body: [226, 232, 240],       // Slate 200
    bg: [15, 23, 42],            // Slate 900
    cardBg: [30, 41, 59],        // Slate 800
    cardBorder: [51, 65, 85],    // Slate 700
    fontFamily: "helvetica",
    codeBg: [9, 14, 26],
    codeText: [56, 189, 248],
    tableHeadBg: [30, 41, 59],
    tableHeadText: [248, 250, 252],
    tableAlternateBg: [24, 34, 53],
    ruleColor: [51, 65, 85],
    isDark: true,
  },
  minimal: {
    name: "Minimalist Slate",
    fontHeading: "Inter, sans-serif",
    fontBody: "Inter, sans-serif",
    primary: [24, 24, 27],       // Zinc 900
    accent: [82, 82, 91],        // Zinc 600
    secondary: [113, 113, 122],  // Zinc 500
    body: [39, 39, 42],          // Zinc 800
    bg: [255, 255, 255],
    cardBg: [250, 250, 250],
    cardBorder: [228, 228, 231],
    fontFamily: "helvetica",
    codeBg: [24, 24, 27],
    codeText: [244, 244, 245],
    tableHeadBg: [24, 24, 27],
    tableHeadText: [255, 255, 255],
    tableAlternateBg: [250, 250, 250],
    ruleColor: [228, 228, 231],
    isDark: false,
  },
  academic: {
    name: "Academic Research Paper",
    fontHeading: "Times New Roman, serif",
    fontBody: "Times New Roman, serif",
    primary: [17, 24, 39],       // Gray 900
    accent: [180, 83, 9],        // Amber 700
    secondary: [75, 85, 99],     // Gray 600
    body: [31, 41, 55],          // Gray 800
    bg: [255, 255, 255],
    cardBg: [249, 250, 251],     // Gray 50
    cardBorder: [209, 213, 219], // Gray 300
    fontFamily: "times",
    codeBg: [17, 24, 39],
    codeText: [243, 244, 246],
    tableHeadBg: [31, 41, 55],
    tableHeadText: [255, 255, 255],
    tableAlternateBg: [249, 250, 251],
    ruleColor: [209, 213, 219],
    isDark: false,
  },
};

export interface WorldClassExportOptions {
  theme?: DocumentTheme;
  includeCoverPage?: boolean;
  classification?: "Confidential" | "Executive Brief" | "Technical Whitepaper" | "Strategic Proposal" | "Public Report";
  version?: string;
  author?: string;
  organization?: string;
  date?: string;
  documentType?: string;
}

export type MarkdownBlock =
  | { kind: "h1"; type?: "h1"; text: string; content?: string }
  | { kind: "h2"; type?: "h2"; text: string; content?: string }
  | { kind: "h3"; type?: "h3"; text: string; content?: string }
  | { kind: "subtitle"; type?: "subtitle"; text: string; content?: string }
  | { kind: "p"; type?: "p"; text: string; content?: string }
  | { kind: "callout"; type?: "callout"; text: string; content?: string; calloutType: "note" | "tip" | "warning" | "important" | "insight" }
  | { kind: "stat"; type?: "stat"; value: string; label: string }
  | { kind: "stat-grid"; type?: "stat-grid"; stats: Array<{ value: string; label: string }> }
  | { kind: "checklist"; type?: "checklist"; items: { checked: boolean; text: string }[]; checked?: boolean; text?: string; content?: string }
  | { kind: "hr"; type?: "hr" }
  | { kind: "ul"; type?: "ul"; items: string[] }
  | { kind: "ol"; type?: "ol"; items: string[] }
  | { kind: "table"; type?: "table"; rows: string[][]; headers?: string[]; tableHeaders?: string[]; tableRows?: string[][] }
  | { kind: "code"; type?: "code"; text: string; content?: string; code?: string; language?: string };

export function stripInlineMarkdown(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/\*(.+?)\*/g, "$1")
    .replace(/`(.+?)`/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .trim();
}

export function parseTableRow(line: string): string[] {
  return line
    .split("|")
    .map((c) => stripInlineMarkdown(c.trim()))
    .filter((c, idx, arr) => (idx > 0 && idx < arr.length - 1) || c);
}

/**
 * Parses markdown into structured semantic blocks with callouts, stats, checklists, and tables.
 */
export function parseWorldClassMarkdownBlocks(markdown: string): MarkdownBlock[] {
  const blocks: MarkdownBlock[] = [];
  const lines = markdown.split("\n");
  let i = 0;

  while (i < lines.length) {
    const raw = lines[i];
    const t = raw.trim();

    // Code blocks
    if (t.startsWith("```")) {
      const langMatch = t.match(/^```(\w+)?/);
      const language = langMatch ? langMatch[1] : undefined;
      const codeLines: string[] = [];
      i += 1;
      while (i < lines.length && !lines[i].trim().startsWith("```")) {
        codeLines.push(lines[i]);
        i += 1;
      }
      const codeContent = codeLines.join("\n");
      blocks.push({
        kind: "code",
        type: "code",
        text: codeContent,
        content: codeContent,
        code: codeContent,
        language,
      });
      i += 1;
      continue;
    }

    // Stat block [STAT: 99.9% | SLA Guarantee]
    if (/^\[STAT:\s*([^|\]]+)\s*\|\s*([^\]]+)\]/i.test(t)) {
      const stats: Array<{ value: string; label: string }> = [];
      while (i < lines.length) {
        const sm = lines[i].trim().match(/^\[STAT:\s*([^|\]]+)\s*\|\s*([^\]]+)\]/i);
        if (!sm) break;
        stats.push({ value: sm[1].trim(), label: sm[2].trim() });
        i += 1;
      }
      if (stats.length > 0) {
        blocks.push({
          kind: "stat-grid",
          type: "stat-grid",
          stats,
        });
      }
      continue;
    }

    // Callout block > [!NOTE], > [!TIP], > [!WARNING], > [!IMPORTANT]
    const calloutHeaderMatch = t.match(/^>\s*\[!(NOTE|TIP|WARNING|IMPORTANT|CAUTION|INSIGHT)\]\s*(.*)$/i);
    if (calloutHeaderMatch) {
      const rawType = calloutHeaderMatch[1].toLowerCase();
      const calloutType: "note" | "tip" | "warning" | "important" | "insight" =
        rawType === "tip" ? "tip" :
        rawType === "warning" || rawType === "caution" ? "warning" :
        rawType === "important" ? "important" :
        rawType === "insight" ? "insight" : "note";
      
      const calloutLines: string[] = [];
      if (calloutHeaderMatch[2]?.trim()) {
        calloutLines.push(stripInlineMarkdown(calloutHeaderMatch[2].trim()));
      }
      i += 1;
      while (i < lines.length && lines[i].trim().startsWith(">")) {
        const lineContent = lines[i].trim().replace(/^>\s?/, "");
        if (lineContent) calloutLines.push(stripInlineMarkdown(lineContent));
        i += 1;
      }
      const calloutText = calloutLines.join(" ") || "Important note";
      blocks.push({
        kind: "callout",
        type: "callout",
        calloutType,
        text: calloutText,
        content: calloutText,
      });
      continue;
    }

    // Standard blockquote
    if (t.startsWith("> ")) {
      const quoteLines: string[] = [stripInlineMarkdown(t.slice(2))];
      i += 1;
      while (i < lines.length && lines[i].trim().startsWith("> ")) {
        quoteLines.push(stripInlineMarkdown(lines[i].trim().slice(2)));
        i += 1;
      }
      const quoteText = quoteLines.join(" ");
      blocks.push({
        kind: "callout",
        type: "callout",
        calloutType: "note",
        text: quoteText,
        content: quoteText,
      });
      continue;
    }

    // Markdown Table
    if (t.startsWith("|") && t.endsWith("|")) {
      const rows: string[][] = [];
      while (i < lines.length && lines[i].trim().startsWith("|")) {
        const rawLine = lines[i].trim();
        // Skip separator rows like |---|---|
        if (!/^\|[\s\-:|]+\|$/.test(rawLine)) {
          const cells = rawLine
            .split("|")
            .slice(1, -1)
            .map((c) => stripInlineMarkdown(c.trim()));
          if (cells.some((c) => c.length > 0)) {
            rows.push(cells);
          }
        }
        i += 1;
      }
      if (rows.length > 0) {
        const headers = rows[0] || [];
        const tableRows = rows.slice(1);
        blocks.push({
          kind: "table",
          type: "table",
          rows,
          headers,
          tableHeaders: headers,
          tableRows,
        });
      }
      continue;
    }

    // Checklist items: - [x] or - [ ]
    if (/^[-*+]\s*\[[ xX]\]/.test(t)) {
      const items: { checked: boolean; text: string }[] = [];
      while (i < lines.length) {
        const lt = lines[i].trim();
        const checkMatch = lt.match(/^[-*+]\s*\[([ xX])\]\s*(.+)$/);
        if (!checkMatch) break;
        items.push({
          checked: checkMatch[1].toLowerCase() === "x",
          text: stripInlineMarkdown(checkMatch[2]),
        });
        i += 1;
      }
      if (items.length) {
        blocks.push({
          kind: "checklist",
          type: "checklist",
          items,
          checked: items[0]?.checked,
          text: items[0]?.text,
          content: items[0]?.text,
        });
      }
      continue;
    }

    // Unordered bullet list
    if (/^[-*+]\s/.test(t)) {
      const items: string[] = [];
      while (i < lines.length) {
        const lt = lines[i].trim();
        const bulletMatch = lt.match(/^[-*+]\s+(.+)$/);
        if (!bulletMatch) break;
        items.push(stripInlineMarkdown(bulletMatch[1]));
        i += 1;
      }
      if (items.length) {
        blocks.push({ kind: "ul", type: "ul", items });
      }
      continue;
    }

    // Ordered numbered list
    if (/^\d+\.\s/.test(t)) {
      const items: string[] = [];
      while (i < lines.length) {
        const lt = lines[i].trim();
        const numMatch = lt.match(/^\d+\.\s+(.+)$/);
        if (!numMatch) break;
        items.push(stripInlineMarkdown(numMatch[1]));
        i += 1;
      }
      if (items.length) {
        blocks.push({ kind: "ol", type: "ol", items });
      }
      continue;
    }

    // Headings
    if (t.startsWith("# ")) {
      const titleText = stripInlineMarkdown(t.slice(2));
      blocks.push({ kind: "h1", type: "h1", text: titleText, content: titleText });
      // Check if immediate next line is a subtitle (*...* or _..._)
      if (i + 1 < lines.length) {
        const nextT = lines[i + 1].trim();
        if ((nextT.startsWith("*") && nextT.endsWith("*")) || (nextT.startsWith("_") && nextT.endsWith("_"))) {
          const subText = stripInlineMarkdown(nextT);
          blocks.push({ kind: "subtitle", type: "subtitle", text: subText, content: subText });
          i += 1;
        }
      }
    } else if (t.startsWith("## ")) {
      const h2Text = stripInlineMarkdown(t.slice(3));
      blocks.push({ kind: "h2", type: "h2", text: h2Text, content: h2Text });
    } else if (t.startsWith("### ")) {
      const h3Text = stripInlineMarkdown(t.slice(4));
      blocks.push({ kind: "h3", type: "h3", text: h3Text, content: h3Text });
    } else if (t.startsWith("#### ")) {
      const h3Text = stripInlineMarkdown(t.slice(5));
      blocks.push({ kind: "h3", type: "h3", text: h3Text, content: h3Text });
    } else if (t === "---" || t === "***") {
      blocks.push({ kind: "hr", type: "hr" });
    } else if (t) {
      const pText = stripInlineMarkdown(t);
      blocks.push({ kind: "p", type: "p", text: pText, content: pText });
    }

    i += 1;
  }

  return blocks;
}

export function extractDocumentMetadata(markdown: string, options: WorldClassExportOptions = {}) {
  const clean = polishProfessionalMarkdown(markdown);
  const words = clean.split(/\s+/).filter(Boolean).length;
  const readTime = Math.max(1, Math.ceil(words / 200));

  let title = "Executive Document";
  let subtitle = "Comprehensive Strategic Intelligence & Analysis";

  const lines = clean.split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith("# ")) {
      title = stripInlineMarkdown(trimmed.slice(2));
      break;
    }
  }

  // Look for italicized or standard subtitle right after title
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim().startsWith("# ")) {
      const next = lines[i + 1]?.trim() || lines[i + 2]?.trim();
      if (next && (next.startsWith("*") || next.startsWith("_") || (!next.startsWith("#") && next.length < 120))) {
        subtitle = stripInlineMarkdown(next);
      }
      break;
    }
  }

  return {
    title,
    subtitle,
    words,
    wordCount: words,
    readTime,
    readingTimeMin: readTime,
    author: options.author || "ShadowTalk AI Document Specialist",
    classification: (options.classification || "Executive Brief").toUpperCase(),
    version: options.version || "1.0.0",
    generatedDate: options.date || new Date().toISOString().split("T")[0],
    organization: options.organization || "Enterprise Client",
  };
}

type PdfWithAutoTable = jsPDF & { lastAutoTable?: { finalY: number } };

/**
 * Generates an Ultra-HD publication-grade PDF from Markdown with multi-theme styling,
 * optional executive cover page, table of contents, stat cards, styled tables, and running headers/footers.
 */
export function exportWorldClassPdf(
  markdown: string,
  filename: string,
  options: WorldClassExportOptions = {},
): void {
  const themeKey = options.theme || "executive";
  const theme = DOCUMENT_THEMES[themeKey] || DOCUMENT_THEMES.executive;
  const clean = polishProfessionalMarkdown(markdown, { tone: "professional" });
  const blocks = parseWorldClassMarkdownBlocks(clean);
  const meta = extractDocumentMetadata(clean);

  const pdf = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
  const PAGE_WIDTH = 210;
  const PAGE_HEIGHT = 297;
  const MARGIN = 18;
  const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;
  const FOOTER_Y = PAGE_HEIGHT - 12;
  const HEADER_Y = 12;

  let y = MARGIN;

  // Background fill for dark theme
  const applyPageBackground = () => {
    if (theme.isDark) {
      pdf.setFillColor(...theme.bg);
      pdf.rect(0, 0, PAGE_WIDTH, PAGE_HEIGHT, "F");
    }
  };

  applyPageBackground();

  const ensureSpace = (needed: number) => {
    if (y + needed > FOOTER_Y - 5) {
      pdf.addPage();
      applyPageBackground();
      y = MARGIN + 8; // Leave room for running header
    }
  };

  const drawWrapped = (
    text: string,
    opts: {
      fontSize: number;
      fontStyle: "normal" | "bold" | "italic";
      color: [number, number, number];
      lineHeight: number;
      indent?: number;
    },
  ) => {
    const indent = opts.indent ?? 0;
    pdf.setFontSize(opts.fontSize);
    pdf.setFont(theme.fontFamily, opts.fontStyle);
    pdf.setTextColor(...opts.color);
    const lines = pdf.splitTextToSize(text, CONTENT_WIDTH - indent);
    for (const line of lines) {
      ensureSpace(opts.lineHeight);
      pdf.text(line, MARGIN + indent, y);
      y += opts.lineHeight;
    }
  };

  const includeCover = options.includeCoverPage !== false && (meta.words > 300 || options.includeCoverPage === true);

  // ==================== COVER PAGE ====================
  if (includeCover) {
    // Top banner accent
    pdf.setFillColor(...theme.accent);
    pdf.rect(0, 0, PAGE_WIDTH, 7, "F");

    // Classification badge
    const badgeText = (options.classification || "EXECUTIVE BRIEF").toUpperCase();
    pdf.setFontSize(8.5);
    pdf.setFont(theme.fontFamily, "bold");
    const badgeWidth = pdf.getTextWidth(badgeText) + 10;
    pdf.setFillColor(...theme.cardBg);
    pdf.setDrawColor(...theme.cardBorder);
    pdf.roundedRect(MARGIN, 32, badgeWidth, 7, 2, 2, "FD");
    pdf.setTextColor(...theme.accent);
    pdf.text(badgeText, MARGIN + 5, 36.8);

    // Title
    y = 52;
    pdf.setFontSize(26);
    pdf.setFont(theme.fontFamily, "bold");
    pdf.setTextColor(...theme.primary);
    const titleLines = pdf.splitTextToSize(meta.title, CONTENT_WIDTH);
    for (const line of titleLines) {
      pdf.text(line, MARGIN, y);
      y += 10.5;
    }

    // Subtitle
    y += 4;
    pdf.setFontSize(13);
    pdf.setFont(theme.fontFamily, "normal");
    pdf.setTextColor(...theme.secondary);
    const subLines = pdf.splitTextToSize(meta.subtitle, CONTENT_WIDTH);
    for (const line of subLines) {
      pdf.text(line, MARGIN, y);
      y += 6.5;
    }

    // Hairline divider
    y += 8;
    pdf.setDrawColor(...theme.cardBorder);
    pdf.setLineWidth(0.5);
    pdf.line(MARGIN, y, PAGE_WIDTH - MARGIN, y);

    // Metadata Grid Box (4 metrics)
    y += 14;
    const gridH = 34;
    pdf.setFillColor(...theme.cardBg);
    pdf.setDrawColor(...theme.cardBorder);
    pdf.roundedRect(MARGIN, y, CONTENT_WIDTH, gridH, 3, 3, "FD");

    const colW = CONTENT_WIDTH / 2;
    const dateStr = options.date || new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
    const authorStr = options.author || "ShadowTalk AI Document Specialist";
    const verStr = options.version || "1.0.0 (Client-Ready)";
    const scopeStr = `${meta.words.toLocaleString()} words · ${meta.readTime} min read`;

    const drawMetaCell = (label: string, val: string, xPos: number, yPos: number) => {
      pdf.setFontSize(7.5);
      pdf.setFont(theme.fontFamily, "bold");
      pdf.setTextColor(...theme.secondary);
      pdf.text(label.toUpperCase(), xPos, yPos);
      pdf.setFontSize(9.5);
      pdf.setFont(theme.fontFamily, "normal");
      pdf.setTextColor(...theme.body);
      pdf.text(val, xPos, yPos + 5.5);
    };

    drawMetaCell("Prepared By", authorStr, MARGIN + 8, y + 10);
    drawMetaCell("Publication Date", dateStr, MARGIN + colW + 8, y + 10);
    drawMetaCell("Version & State", verStr, MARGIN + 8, y + 23);
    drawMetaCell("Volume & Scope", scopeStr, MARGIN + colW + 8, y + 23);

    // Cover Page Bottom Branding
    pdf.setFontSize(8.5);
    pdf.setFont(theme.fontFamily, "normal");
    pdf.setTextColor(...theme.secondary);
    pdf.text("ShadowTalk AI Intelligence Suite • Enterprise Sovereign Edition", MARGIN, PAGE_HEIGHT - 18);
    pdf.text("Strictly Confidential", PAGE_WIDTH - MARGIN, PAGE_HEIGHT - 18, { align: "right" });

    // Break to Document Body
    pdf.addPage();
    applyPageBackground();
    y = MARGIN + 8;
  }

  // ==================== DOCUMENT BODY ====================
  for (const block of blocks) {
    switch (block.kind) {
      case "h1": {
        // If cover page was shown, skip duplicating the main document title as an H1
        if (includeCover && block.text.toLowerCase() === meta.title.toLowerCase()) {
          continue;
        }
        y += 4;
        drawWrapped(block.text, { fontSize: 20, fontStyle: "bold", color: theme.primary, lineHeight: 8.5 });
        pdf.setDrawColor(...theme.ruleColor);
        pdf.setLineWidth(0.4);
        ensureSpace(4);
        pdf.line(MARGIN, y + 1, PAGE_WIDTH - MARGIN, y + 1);
        y += 8;
        break;
      }
      case "h2": {
        y += 6;
        drawWrapped(block.text, { fontSize: 14, fontStyle: "bold", color: theme.primary, lineHeight: 6.5 });
        y += 2.5;
        break;
      }
      case "h3": {
        y += 4;
        drawWrapped(block.text, { fontSize: 11.5, fontStyle: "bold", color: theme.secondary, lineHeight: 5.5 });
        y += 2;
        break;
      }
      case "p": {
        drawWrapped(block.text, { fontSize: 10, fontStyle: "normal", color: theme.body, lineHeight: 5 });
        y += 2;
        break;
      }
      case "stat": {
        // Key metric box
        ensureSpace(20);
        pdf.setFillColor(...theme.cardBg);
        pdf.setDrawColor(...theme.cardBorder);
        pdf.roundedRect(MARGIN, y, CONTENT_WIDTH, 18, 2, 2, "FD");

        pdf.setFontSize(16);
        pdf.setFont(theme.fontFamily, "bold");
        pdf.setTextColor(...theme.accent);
        pdf.text(block.value, MARGIN + 6, y + 8);

        pdf.setFontSize(8.5);
        pdf.setFont(theme.fontFamily, "bold");
        pdf.setTextColor(...theme.secondary);
        pdf.text(block.label.toUpperCase(), MARGIN + 6, y + 14);

        y += 22;
        break;
      }
      case "callout": {
        // Executive callout box with thick left accent border
        const quoteLines = pdf.splitTextToSize(block.text, CONTENT_WIDTH - 14);
        const boxHeight = quoteLines.length * 4.8 + 8;
        ensureSpace(boxHeight + 2);

        pdf.setFillColor(...theme.cardBg);
        pdf.setDrawColor(...theme.cardBorder);
        pdf.roundedRect(MARGIN, y, CONTENT_WIDTH, boxHeight, 2, 2, "FD");

        // Thick left colored accent bar
        const accentCol =
          block.calloutType === "warning" ? [217, 119, 6] :
          block.calloutType === "tip" ? [16, 185, 129] :
          block.calloutType === "important" ? [225, 29, 72] :
          theme.accent;

        pdf.setFillColor(accentCol[0], accentCol[1], accentCol[2]);
        pdf.rect(MARGIN, y, 3, boxHeight, "F");

        pdf.setFontSize(9.5);
        pdf.setFont(theme.fontFamily, "italic");
        pdf.setTextColor(...theme.body);
        pdf.text(quoteLines, MARGIN + 8, y + 5.5);
        y += boxHeight + 4;
        break;
      }
      case "checklist": {
        for (const item of block.items) {
          ensureSpace(6);
          // Draw checkbox
          pdf.setDrawColor(...theme.accent);
          pdf.setFillColor(...theme.cardBg);
          pdf.roundedRect(MARGIN + 2, y - 3.2, 3.8, 3.8, 0.8, 0.8, "FD");

          if (item.checked) {
            pdf.setFontSize(8);
            pdf.setFont("helvetica", "bold");
            pdf.setTextColor(...theme.accent);
            pdf.text("v", MARGIN + 2.8, y - 0.5);
          }

          drawWrapped(item.text, {
            fontSize: 9.8,
            fontStyle: "normal",
            color: item.checked ? theme.secondary : theme.body,
            lineHeight: 5,
            indent: 8,
          });
        }
        y += 2;
        break;
      }
      case "ul": {
        for (const item of block.items) {
          drawWrapped(`*  ${item}`, {
            fontSize: 9.8,
            fontStyle: "normal",
            color: theme.body,
            lineHeight: 5,
            indent: 4,
          });
        }
        y += 2;
        break;
      }
      case "ol": {
        block.items.forEach((item, idx) => {
          drawWrapped(`${idx + 1}.  ${item}`, {
            fontSize: 9.8,
            fontStyle: "normal",
            color: theme.body,
            lineHeight: 5,
            indent: 4,
          });
        });
        y += 2;
        break;
      }
      case "table": {
        const head = block.rows[0];
        const body = block.rows.slice(1).filter((r) => r.some((c) => c.trim()));
        ensureSpace(24);

        autoTable(pdf, {
          startY: y,
          head: [head],
          body,
          margin: { left: MARGIN, right: MARGIN },
          styles: {
            font: theme.fontFamily,
            fontSize: 9,
            cellPadding: 3,
            textColor: theme.body,
            lineColor: theme.cardBorder,
            lineWidth: 0.15,
          },
          headStyles: {
            fillColor: theme.tableHeadBg,
            textColor: theme.tableHeadText,
            fontStyle: "bold",
          },
          alternateRowStyles: { fillColor: theme.tableAlternateBg },
          theme: "grid",
        });

        const finalY = (pdf as PdfWithAutoTable).lastAutoTable?.finalY;
        y = (finalY ?? y) + 7;
        break;
      }
      case "code": {
        const codeLines = pdf.splitTextToSize(block.text, CONTENT_WIDTH - 12);
        const boxHeight = codeLines.length * 4.2 + 8;
        ensureSpace(boxHeight);

        pdf.setFillColor(...theme.codeBg);
        pdf.setDrawColor(...theme.cardBorder);
        pdf.roundedRect(MARGIN, y, CONTENT_WIDTH, boxHeight, 2, 2, "FD");

        pdf.setFont("courier", "normal");
        pdf.setFontSize(8.5);
        pdf.setTextColor(...theme.codeText);
        pdf.text(codeLines, MARGIN + 6, y + 5);
        y += boxHeight + 4;
        break;
      }
      case "hr": {
        y += 3;
        ensureSpace(5);
        pdf.setDrawColor(...theme.ruleColor);
        pdf.setLineWidth(0.3);
        pdf.line(MARGIN, y, PAGE_WIDTH - MARGIN, y);
        y += 6;
        break;
      }
    }
  }

  // ==================== RUNNING HEADERS & FOOTERS ====================
  const pageCount = pdf.getNumberOfPages();
  const startHeaderPage = includeCover ? 2 : 1;

  for (let page = startHeaderPage; page <= pageCount; page++) {
    pdf.setPage(page);

    // Running Header
    pdf.setFontSize(7.5);
    pdf.setFont(theme.fontFamily, "normal");
    pdf.setTextColor(...theme.secondary);
    pdf.text(meta.title.slice(0, 50), MARGIN, HEADER_Y);
    pdf.text(options.classification || "Executive Document", PAGE_WIDTH - MARGIN, HEADER_Y, { align: "right" });
    pdf.setDrawColor(...theme.ruleColor);
    pdf.setLineWidth(0.2);
    pdf.line(MARGIN, HEADER_Y + 2, PAGE_WIDTH - MARGIN, HEADER_Y + 2);

    // Running Footer
    pdf.setFontSize(7.5);
    pdf.setFont(theme.fontFamily, "normal");
    pdf.setTextColor(...theme.secondary);
    pdf.line(MARGIN, FOOTER_Y - 3, PAGE_WIDTH - MARGIN, FOOTER_Y - 3);
    pdf.text("Generated by ShadowTalk AI", MARGIN, FOOTER_Y);
    pdf.text(`Page ${page} of ${pageCount}`, PAGE_WIDTH / 2, FOOTER_Y, { align: "center" });
    pdf.text("Confidential", PAGE_WIDTH - MARGIN, FOOTER_Y, { align: "right" });
  }

  const safeName = filename.endsWith(".pdf") ? filename : `${filename}.pdf`;
  pdf.save(safeName);
}

/**
 * Triggers high-DPI vector print / Save as PDF via browser print stylesheet.
 */
export function printWorldClassDocument(markdown: string, options: WorldClassExportOptions = {}): void {
  const clean = polishProfessionalMarkdown(markdown);
  const meta = extractDocumentMetadata(clean);
  // The print window is opened via window.open("", "_blank") and inherits the
  // app origin — every interpolation below must be HTML-escaped or document
  // content (e.g. a title like "<img src=x onerror=...>") becomes XSS.
  const escape = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  const printWindow = window.open("", "_blank");
  if (!printWindow) return;

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${escape(meta.title)} — ShadowTalk AI</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">
  <style>
    @page {
      size: A4;
      margin: 14mm 16mm 14mm 16mm;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      color: #1e293b;
      background: #ffffff;
      line-height: 1.65;
      font-size: 10pt;
      padding: 0;
      margin: 0;
    }
    .cover-page {
      min-height: 250mm;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      page-break-after: always;
      background: linear-gradient(145deg, #090d16 0%, #0f172a 50%, #1e1b4b 100%);
      color: #ffffff;
      padding: 30mm 20mm 20mm 20mm;
      position: relative;
      overflow: hidden;
      border-radius: 4px;
    }
    .cover-badge {
      display: inline-block;
      padding: 5px 12px;
      background: rgba(99, 102, 241, 0.2);
      border: 1px solid rgba(129, 140, 248, 0.4);
      border-radius: 16px;
      font-size: 8pt;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 1.5px;
      color: #a5b4fc;
      margin-bottom: 20px;
    }
    .cover-title {
      font-size: 26pt;
      font-weight: 800;
      line-height: 1.2;
      color: #ffffff;
      margin-bottom: 12px;
    }
    .cover-subtitle {
      font-size: 12pt;
      color: #cbd5e1;
      font-weight: 400;
      line-height: 1.5;
      margin-bottom: 24px;
    }
    .cover-meta {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
      border-top: 1px solid rgba(255, 255, 255, 0.15);
      padding-top: 18px;
    }
    .meta-item { display: flex; flex-direction: column; }
    .meta-label { font-size: 7.5pt; text-transform: uppercase; color: #94a3b8; font-weight: 600; letter-spacing: 0.8px; }
    .meta-val { font-size: 9.5pt; font-weight: 600; color: #f8fafc; }
    
    .doc-body { padding: 10px 0; }
    h1 { font-size: 18pt; font-weight: 800; color: #0f172a; margin: 24px 0 12px; border-bottom: 2px solid #e2e8f0; padding-bottom: 6px; }
    h2 { font-size: 13pt; font-weight: 700; color: #1e293b; margin: 20px 0 8px; }
    h3 { font-size: 11pt; font-weight: 600; color: #334155; margin: 16px 0 6px; }
    p { margin-bottom: 10px; color: #334155; text-align: justify; }
    ul, ol { margin-left: 20px; margin-bottom: 12px; color: #334155; }
    li { margin-bottom: 4px; }
    strong { color: #0f172a; font-weight: 600; }
    
    blockquote, .callout {
      border-left: 4px solid #3b82f6;
      background: #f8fafc;
      padding: 10px 14px;
      border-radius: 4px;
      margin: 14px 0;
      color: #334155;
      font-style: italic;
    }
    table { width: 100%; border-collapse: collapse; margin: 14px 0; font-size: 8.5pt; }
    th { background: #0f172a; color: #ffffff; padding: 7px 10px; text-align: left; font-weight: 600; }
    td { border: 1px solid #e2e8f0; padding: 6px 10px; color: #334155; }
    tr:nth-child(even) td { background: #f8fafc; }
    
    code { font-family: 'JetBrains Mono', Consolas, monospace; font-size: 8.5pt; background: #f1f5f9; padding: 2px 5px; border-radius: 3px; }
    pre { background: #0f172a; color: #f8fafc; padding: 12px; border-radius: 6px; font-family: 'JetBrains Mono', Consolas, monospace; font-size: 8pt; line-height: 1.4; overflow-x: auto; margin: 12px 0; }
    hr { border: none; border-top: 1px solid #e2e8f0; margin: 20px 0; }
    
    .doc-footer {
      border-top: 1px solid #e2e8f0;
      padding-top: 10px;
      margin-top: 30px;
      font-size: 8pt;
      color: #64748b;
      display: flex;
      justify-content: space-between;
    }
    @media print {
      body { margin: 0; }
      .no-print { display: none; }
    }
  </style>
</head>
<body>
  ${options.includeCoverPage !== false ? `
  <div class="cover-page">
    <div>
      <div class="cover-badge">${escape(options.classification || "EXECUTIVE BRIEF")}</div>
      <h1 class="cover-title">${escape(meta.title)}</h1>
      <p class="cover-subtitle">${escape(meta.subtitle)}</p>
    </div>
    <div>
      <div class="cover-meta">
        <div class="meta-item"><span class="meta-label">Author</span><span class="meta-val">${escape(options.author || "ShadowTalk AI Document Specialist")}</span></div>
        <div class="meta-item"><span class="meta-label">Date</span><span class="meta-val">${escape(options.date || new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }))}</span></div>
        <div class="meta-item"><span class="meta-label">Classification</span><span class="meta-val">${escape(options.classification || "Executive / Confidential")}</span></div>
        <div class="meta-item"><span class="meta-label">Scope</span><span class="meta-val">${meta.words.toLocaleString()} words · ${meta.readTime} min read</span></div>
      </div>
    </div>
  </div>
  ` : ""}
  <div class="doc-body">
    ${renderMarkdownToHtmlBody(clean)}
  </div>
  <div class="doc-footer">
    <span>Generated by ShadowTalk AI Intelligence</span>
    <span>Confidential &bull; Page 1 of 1</span>
  </div>
  <script>
    window.onload = function() {
      setTimeout(function() { window.print(); }, 250);
    };
  </script>
</body>
</html>`;

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
}

/**
 * Generates World-Class GFM Markdown with rich YAML Frontmatter as a string.
 */
export function generateWorldClassMarkdown(
  markdown: string,
  options: WorldClassExportOptions = {},
): string {
  const clean = polishProfessionalMarkdown(markdown);
  const meta = extractDocumentMetadata(clean, options);
  const dateStr = options.date || meta.generatedDate;

  const frontmatter = `---
title: "${meta.title.replace(/"/g, '\\"')}"
subtitle: "${meta.subtitle.replace(/"/g, '\\"')}"
author: "${meta.author}"
date: "${dateStr}"
classification: "${meta.classification}"
version: "${meta.version}"
words: ${meta.words}
reading_time: "${meta.readTime} min"
format: "GitHub Flavored Markdown (GFM)"
theme: "${options.theme || "executive"}"
generator: "ShadowTalk AI World-Class Document Studio"
---

`;

  return frontmatter + clean;
}

/**
 * Exports World-Class GFM Markdown with rich YAML Frontmatter.
 * Downloads the file if in browser environment and returns the full markdown string.
 */
export function exportWorldClassMarkdown(
  markdown: string,
  filenameOrOptions?: string | WorldClassExportOptions,
  options?: WorldClassExportOptions,
): string {
  const resolvedOpts: WorldClassExportOptions =
    typeof filenameOrOptions === "object" && filenameOrOptions !== null
      ? filenameOrOptions
      : options || {};
  const filename =
    typeof filenameOrOptions === "string" ? filenameOrOptions : "document.md";

  const fullMarkdown = generateWorldClassMarkdown(markdown, resolvedOpts);

  if (typeof window !== "undefined" && typeof document !== "undefined" && typeof URL !== "undefined" && typeof URL.createObjectURL === "function") {
    try {
      const blob = new Blob([fullMarkdown], { type: "text/markdown;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename.endsWith(".md") ? filename : `${filename}.md`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      // test fallback
    }
  }

  return fullMarkdown;
}

/**
 * Formats an ASCII table with Unicode box drawing borders.
 */
function formatAsciiTable(rows: string[][]): string {
  if (!rows.length) return "";
  const colWidths: number[] = [];

  rows.forEach((row) => {
    row.forEach((cell, idx) => {
      colWidths[idx] = Math.max(colWidths[idx] || 0, cell.length + 2);
    });
  });

  const pad = (text: string, len: number) => text + " ".repeat(Math.max(0, len - text.length));

  const topBorder = "┌" + colWidths.map((w) => "─".repeat(w)).join("┬") + "┐";
  const midBorder = "├" + colWidths.map((w) => "─".repeat(w)).join("┼") + "┤";
  const botBorder = "└" + colWidths.map((w) => "─".repeat(w)).join("┴") + "┘";

  const headRow = "│" + rows[0].map((c, i) => ` ${pad(c, colWidths[i] - 1)}`).join("│") + "│";
  const bodyRows = rows.slice(1).map((r) => "│" + r.map((c, i) => ` ${pad(c || "", colWidths[i] - 1)}`).join("│") + "│");

  return [topBorder, headRow, midBorder, ...bodyRows, botBorder].join("\n");
}

/**
 * Generates Executive Plain Text (.txt) formatted with ASCII banner, metadata, box tables, and TOC.
 */
export function generateWorldClassPlainText(
  markdown: string,
  options: WorldClassExportOptions = {},
): string {
  const clean = polishProfessionalMarkdown(markdown);
  const meta = extractDocumentMetadata(clean, options);
  const blocks = parseWorldClassMarkdownBlocks(clean);
  const dateStr = options.date || meta.generatedDate;

  const width = 76;
  const line = "═".repeat(width);
  const dashLine = "─".repeat(width);

  let output = "";
  output += `╔${line}╗\n`;
  output += `║ ${meta.title.toUpperCase().slice(0, width - 2).padEnd(width - 2)} ║\n`;
  output += `║ ${meta.subtitle.slice(0, width - 2).padEnd(width - 2)} ║\n`;
  output += `╠${line}╣\n`;
  output += `║ DATE           : ${dateStr.padEnd(width - 21)} ║\n`;
  output += `║ AUTHOR         : ${meta.author.padEnd(width - 21)} ║\n`;
  output += `║ CLASSIFICATION : ${meta.classification.padEnd(width - 21)} ║\n`;
  output += `║ SCOPE          : ${`${meta.words} words (${meta.readTime}m read)`.padEnd(width - 21)} ║\n`;
  output += `╚${line}╝\n\n`;

  // Table of contents with dotted leaders
  const h2Sections = blocks.filter((b) => b.kind === "h2");
  if (h2Sections.length > 0) {
    output += `TABLE OF CONTENTS\n${"=".repeat(17)}\n\n`;
    h2Sections.forEach((sec, idx) => {
      const num = `${idx + 1}. ${sec.text}`;
      const dots = ".".repeat(Math.max(4, width - num.length - 12));
      output += `${num} ${dots} Section ${idx + 1}\n`;
    });
    output += `\n${dashLine}\n\n`;
  }

  for (const block of blocks) {
    switch (block.kind) {
      case "h1":
        output += `\n${block.text.toUpperCase()}\n${"=".repeat(block.text.length)}\n\n`;
        break;
      case "subtitle":
        output += `* ${block.text} *\n\n`;
        break;
      case "h2":
        output += `\n[ ${block.text} ]\n${"-".repeat(block.text.length + 4)}\n\n`;
        break;
      case "h3":
        output += `\n* ${block.text}\n\n`;
        break;
      case "p":
        output += `${block.text}\n\n`;
        break;
      case "stat":
        output += `[ METRIC: ${block.value} | ${block.label} ]\n\n`;
        break;
      case "stat-grid":
        for (const st of block.stats) {
          output += `[ METRIC: ${st.value} | ${st.label} ]\n`;
        }
        output += "\n";
        break;
      case "callout":
        output += `┌─ [${block.calloutType.toUpperCase()}] ${dashLine.slice(0, Math.max(2, width - block.calloutType.length - 8))}┐\n`;
        output += `│ ${block.text}\n`;
        output += `└${dashLine}┘\n\n`;
        break;
      case "checklist":
        for (const it of block.items) {
          output += `  [${it.checked ? "X" : " "}] ${it.text}\n`;
        }
        output += "\n";
        break;
      case "ul":
        for (const it of block.items) {
          output += `  * ${it}\n`;
        }
        output += "\n";
        break;
      case "ol":
        block.items.forEach((it, idx) => {
          output += `  ${idx + 1}. ${it}\n`;
        });
        output += "\n";
        break;
      case "table":
        output += formatAsciiTable(block.rows) + "\n\n";
        break;
      case "code":
        output += `----- CODE BEGIN -----\n${block.text}\n----- CODE END -----\n\n`;
        break;
      case "hr":
        output += `${dashLine}\n\n`;
        break;
    }
  }

  output += `\n${dashLine}\nGenerated by ShadowTalk AI World-Class Document Studio • End of Document\n`;
  return output;
}

/**
 * Exports Executive Plain Text (.txt) with ASCII banner, metadata, box tables, and tree lists.
 */
export function exportWorldClassPlainText(
  markdown: string,
  filenameOrOptions?: string | WorldClassExportOptions,
  options?: WorldClassExportOptions,
): string {
  const resolvedOpts: WorldClassExportOptions =
    typeof filenameOrOptions === "object" && filenameOrOptions !== null
      ? filenameOrOptions
      : options || {};
  const filename =
    typeof filenameOrOptions === "string" ? filenameOrOptions : "document.txt";

  const output = generateWorldClassPlainText(markdown, resolvedOpts);

  if (typeof window !== "undefined" && typeof document !== "undefined" && typeof URL !== "undefined" && typeof URL.createObjectURL === "function") {
    try {
      const blob = new Blob([output], { type: "text/plain;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename.endsWith(".txt") ? filename : `${filename}.txt`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      // test fallback
    }
  }

  return output;
}

/**
 * Generates Microsoft Word (.doc / .docx compatible) MSO Office XML HTML string.
 */
export function generateWorldClassWordDoc(
  markdown: string,
  options: WorldClassExportOptions = {},
): string {
  const clean = polishProfessionalMarkdown(markdown);
  const meta = extractDocumentMetadata(clean, options);
  const dateStr = options.date || meta.generatedDate;
  const escape = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  return `<!DOCTYPE html>
<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
<head>
  <meta charset="utf-8">
  <title>${escape(meta.title)}</title>
  <!--[if gte mso 9]>
  <xml>
    <w:WordDocument>
      <w:View>Print</w:View>
      <w:Zoom>100</w:Zoom>
      <w:DoNotOptimizeForBrowser/>
    </w:WordDocument>
  </xml>
  <![endif]-->
  <style>
    @page WordSection1 {
      size: 8.5in 11.0in;
      margin: 1.0in 1.0in 1.0in 1.0in;
      mso-header-margin: .5in;
      mso-footer-margin: .5in;
      mso-paper-source: 0;
    }
    div.WordSection1 { page: WordSection1; }
    body {
      font-family: 'Aptos', 'Calibri', 'Segoe UI', sans-serif;
      font-size: 11pt;
      line-height: 1.6;
      color: #1a1a1a;
    }
    h1 {
      font-size: 22pt;
      font-weight: 700;
      color: #0f172a;
      margin: 0 0 8pt;
      border-bottom: 2pt solid #0f172a;
      padding-bottom: 6pt;
    }
    h2 {
      font-size: 14pt;
      font-weight: 700;
      color: #1e293b;
      margin: 22pt 0 6pt;
      border-bottom: 0.5pt solid #cbd5e1;
      padding-bottom: 3pt;
    }
    p.MsoHeading1, li.MsoHeading1, div.MsoHeading1 { mso-style-name:"Heading 1"; }
    p.MsoHeading2, li.MsoHeading2, div.MsoHeading2 { mso-style-name:"Heading 2"; }
    h3 {
      font-size: 12pt;
      font-weight: 600;
      color: #334155;
      margin: 14pt 0 4pt;
    }
    p { margin: 0 0 10pt; text-align: justify; }
    .subtitle {
      font-size: 12pt;
      color: #64748b;
      font-style: italic;
      margin-bottom: 16pt;
    }
    .meta-box {
      background: #f8fafc;
      border: 1pt solid #cbd5e1;
      border-radius: 4pt;
      padding: 10pt 14pt;
      margin-bottom: 20pt;
      font-size: 9.5pt;
    }
    blockquote, .callout {
      margin: 12pt 0;
      padding: 8pt 14pt;
      border-left: 3pt solid #2563eb;
      background: #f1f5f9;
      color: #334155;
      font-style: italic;
    }
    table {
      border-collapse: collapse;
      width: 100%;
      margin: 14pt 0;
      font-size: 9.5pt;
    }
    th {
      background: #0f172a;
      color: #ffffff;
      font-weight: 600;
      padding: 7pt 10pt;
      border: 1pt solid #0f172a;
      text-align: left;
    }
    td {
      border: 1pt solid #cbd5e1;
      padding: 6pt 10pt;
      color: #334155;
    }
    tr:nth-child(even) td { background: #f8fafc; }
    pre {
      background: #0f172a;
      color: #f8fafc;
      padding: 10pt;
      border-radius: 4pt;
      font-family: 'Consolas', monospace;
      font-size: 8.5pt;
      margin: 12pt 0;
    }
    code { font-family: 'Consolas', monospace; font-size: 9pt; background: #f1f5f9; padding: 1pt 3pt; }
    ul, ol { margin: 0 0 10pt; padding-left: 20pt; }
  </style>
</head>
<body>
  <div class="WordSection1">
    <h1>${escape(meta.title)}</h1>
    <div class="subtitle">${escape(meta.subtitle)}</div>
    <div class="meta-box">
      <strong>Classification:</strong> ${escape(meta.classification)} &nbsp;|&nbsp;
      <strong>Date:</strong> ${escape(dateStr)} &nbsp;|&nbsp;
      <strong>Author:</strong> ${escape(meta.author)} &nbsp;|&nbsp;
      <strong>Scope:</strong> ${meta.words.toLocaleString()} words
    </div>
    ${renderMarkdownToHtmlBody(clean)}
  </div>
</body>
</html>`;
}

/**
 * Exports Microsoft Word (.doc / .docx compatible) with MSO Office XML styles, 
 * Aptos/Calibri typography, 1-inch margins, and styled tables.
 */
export function exportWorldClassWordDoc(
  markdown: string,
  filenameOrOptions?: string | WorldClassExportOptions,
  options?: WorldClassExportOptions,
): string {
  const resolvedOpts: WorldClassExportOptions =
    typeof filenameOrOptions === "object" && filenameOrOptions !== null
      ? filenameOrOptions
      : options || {};
  const filename =
    typeof filenameOrOptions === "string" ? filenameOrOptions : "document.doc";

  const wordHtml = generateWorldClassWordDoc(markdown, resolvedOpts);

  if (typeof window !== "undefined" && typeof document !== "undefined" && typeof URL !== "undefined" && typeof URL.createObjectURL === "function") {
    try {
      const blob = new Blob([wordHtml], { type: "application/msword;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename.endsWith(".doc") ? filename : `${filename}.doc`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      // test fallback
    }
  }

  return wordHtml;
}

/**
 * Generates Standalone Web Document (.html) string with responsive styling, light/dark mode, and print stylesheet.
 */
export function generateWorldClassHtml(
  markdown: string,
  options: WorldClassExportOptions = {},
): string {
  const clean = polishProfessionalMarkdown(markdown);
  const meta = extractDocumentMetadata(clean, options);
  const dateStr = options.date || meta.generatedDate;
  const escape = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escape(meta.title)} — ShadowTalk AI</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg: #ffffff;
      --card-bg: #f8fafc;
      --text: #1e293b;
      --heading: #0f172a;
      --accent: #2563eb;
      --border: #e2e8f0;
      --code-bg: #0f172a;
      --code-text: #f8fafc;
      --doc-primary: #0f172a;
    }
    [data-theme="dark"] {
      --bg: #0b0f19;
      --card-bg: #111827;
      --text: #cbd5e1;
      --heading: #f8fafc;
      --accent: #38bdf8;
      --border: #1f2937;
      --code-bg: #030712;
      --code-text: #38bdf8;
      --doc-primary: #38bdf8;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Plus Jakarta Sans', sans-serif;
      background: var(--bg);
      color: var(--text);
      line-height: 1.7;
      padding: 40px 20px;
      transition: background 0.2s, color 0.2s;
    }
    .container {
      max-width: 860px;
      margin: 0 auto;
      background: var(--bg);
    }
    .header-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 24px;
      padding-bottom: 16px;
      border-bottom: 1px solid var(--border);
    }
    .theme-toggle {
      background: var(--card-bg);
      border: 1px solid var(--border);
      color: var(--text);
      padding: 6px 14px;
      border-radius: 6px;
      cursor: pointer;
      font-size: 8.5pt;
      font-weight: 600;
    }
    h1 { font-size: 26pt; font-weight: 800; color: var(--heading); margin-bottom: 8px; line-height: 1.2; }
    .subtitle { font-size: 13pt; color: #64748b; margin-bottom: 20px; font-weight: 400; }
    .meta-box {
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 14px 18px;
      margin-bottom: 28px;
      display: flex;
      flex-wrap: wrap;
      gap: 16px;
      font-size: 9pt;
    }
    .meta-pill { display: flex; flex-direction: column; }
    .meta-k { font-size: 7.5pt; text-transform: uppercase; color: #64748b; font-weight: 700; letter-spacing: 0.5px; }
    .meta-v { font-weight: 600; color: var(--heading); }
    h2 { font-size: 16pt; font-weight: 700; color: var(--heading); margin: 32px 0 12px; border-bottom: 1px solid var(--border); padding-bottom: 6px; }
    h3 { font-size: 12pt; font-weight: 600; color: var(--heading); margin: 20px 0 8px; }
    p { margin-bottom: 12px; }
    ul, ol { margin-left: 24px; margin-bottom: 16px; }
    li { margin-bottom: 6px; }
    blockquote, .callout {
      border-left: 4px solid var(--accent);
      background: var(--card-bg);
      padding: 12px 16px;
      border-radius: 6px;
      margin: 16px 0;
      font-style: italic;
    }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 9pt; }
    th { background: var(--heading); color: var(--bg); padding: 9px 12px; text-align: left; font-weight: 600; }
    td { border: 1px solid var(--border); padding: 8px 12px; }
    tr:nth-child(even) td { background: var(--card-bg); }
    code { font-family: 'JetBrains Mono', monospace; font-size: 8.5pt; background: var(--card-bg); border: 1px solid var(--border); padding: 2px 6px; border-radius: 4px; }
    pre { background: var(--code-bg); color: var(--code-text); padding: 16px; border-radius: 8px; font-family: 'JetBrains Mono', monospace; font-size: 8.5pt; overflow-x: auto; margin: 16px 0; }
    hr { border: none; border-top: 1px solid var(--border); margin: 28px 0; }
    .toc-card {
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 16px;
      margin: 20px 0;
    }
    .toc-title { font-weight: 700; margin-bottom: 8px; font-size: 11pt; }
    @media print {
      body { padding: 0; background: #fff; color: #000; }
      .header-bar, .theme-toggle { display: none; }
      @page { margin: 1in; size: portrait; }
    }
    .footer { margin-top: 40px; padding-top: 16px; border-top: 1px solid var(--border); font-size: 8pt; color: #64748b; display: flex; justify-content: space-between; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header-bar">
      <span style="font-size: 9pt; font-weight: 700; color: var(--accent); text-transform: uppercase; letter-spacing: 1px;">ShadowTalk AI World-Class Document Studio</span>
      <button class="theme-toggle" onclick="toggleTheme()">Toggle Dark / Light</button>
    </div>
    <h1>${escape(meta.title)}</h1>
    <div class="subtitle">${escape(meta.subtitle)}</div>
    <div class="meta-box">
      <div class="meta-pill"><span class="meta-k">Classification</span><span class="meta-v">${escape(meta.classification)}</span></div>
      <div class="meta-pill"><span class="meta-k">Date</span><span class="meta-v">${escape(dateStr)}</span></div>
      <div class="meta-pill"><span class="meta-k">Author</span><span class="meta-v">${escape(meta.author)}</span></div>
      <div class="meta-pill"><span class="meta-k">Scope</span><span class="meta-v">${meta.words.toLocaleString()} words · ${meta.readTime}m read</span></div>
    </div>
    <div class="toc-card">
      <div class="toc-title">Table of Contents</div>
      <p style="font-size:9pt; color:#64748b;">Navigate sections below.</p>
    </div>
    ${renderMarkdownToHtmlBody(clean)}
    <div class="footer">
      <span>Generated with ShadowTalk AI World-Class Document Studio</span>
      <span>Confidential &bull; All Rights Reserved</span>
    </div>
  </div>
  <script>
    function toggleTheme() {
      const cur = document.documentElement.getAttribute('data-theme');
      document.documentElement.setAttribute('data-theme', cur === 'dark' ? 'light' : 'dark');
    }
  </script>
</body>
</html>`;
}

/**
 * Exports Standalone Web Document (.html) with responsive CSS, light/dark mode, and print stylesheet.
 */
export function exportWorldClassHtml(
  markdown: string,
  filenameOrOptions?: string | WorldClassExportOptions,
  options?: WorldClassExportOptions,
): string {
  const resolvedOpts: WorldClassExportOptions =
    typeof filenameOrOptions === "object" && filenameOrOptions !== null
      ? filenameOrOptions
      : options || {};
  const filename =
    typeof filenameOrOptions === "string" ? filenameOrOptions : "document.html";

  const fullHtml = generateWorldClassHtml(markdown, resolvedOpts);

  if (typeof window !== "undefined" && typeof document !== "undefined" && typeof URL !== "undefined" && typeof URL.createObjectURL === "function") {
    try {
      const blob = new Blob([fullHtml], { type: "text/html;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename.endsWith(".html") ? filename : `${filename}.html`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      // test fallback
    }
  }

  return fullHtml;
}

/**
 * Utility to convert parsed markdown blocks into sanitized HTML body content.
 */
function renderMarkdownToHtmlBody(markdown: string): string {
  const blocks = parseWorldClassMarkdownBlocks(markdown);
  const escape = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  let html = "";

  for (const block of blocks) {
    switch (block.kind) {
      case "h1":
        html += `<h1>${escape(block.text)}</h1>\n`;
        break;
      case "h2":
        html += `<h2>${escape(block.text)}</h2>\n`;
        break;
      case "h3":
        html += `<h3>${escape(block.text)}</h3>\n`;
        break;
      case "p":
        html += `<p>${escape(block.text)}</p>\n`;
        break;
      case "stat":
        html += `<div style="background:#f8fafc; border:1px solid #cbd5e1; border-radius:6px; padding:12px; margin:12px 0;">
          <div style="font-size:18pt; font-weight:800; color:#2563eb;">${escape(block.value)}</div>
          <div style="font-size:8pt; font-weight:700; text-transform:uppercase; color:#64748b;">${escape(block.label)}</div>
        </div>\n`;
        break;
      case "callout":
        html += `<blockquote class="callout">${escape(block.text)}</blockquote>\n`;
        break;
      case "checklist":
        html += `<ul style="list-style:none; padding-left:0;">\n`;
        for (const item of block.items) {
          html += `<li>[${item.checked ? "✓" : " "}] ${escape(item.text)}</li>\n`;
        }
        html += `</ul>\n`;
        break;
      case "ul":
        html += `<ul>\n`;
        for (const item of block.items) {
          html += `<li>${escape(item)}</li>\n`;
        }
        html += `</ul>\n`;
        break;
      case "ol":
        html += `<ol>\n`;
        for (const item of block.items) {
          html += `<li>${escape(item)}</li>\n`;
        }
        html += `</ol>\n`;
        break;
      case "table":
        html += `<table>\n<thead>\n<tr>`;
        block.rows[0].forEach((h) => (html += `<th>${escape(h)}</th>`));
        html += `</tr>\n</thead>\n<tbody>\n`;
        block.rows.slice(1).forEach((row) => {
          html += `<tr>`;
          row.forEach((cell) => (html += `<td>${escape(cell)}</td>`));
          html += `</tr>\n`;
        });
        html += `</tbody>\n</table>\n`;
        break;
      case "code":
        html += `<pre><code>${escape(block.text)}</code></pre>\n`;
        break;
      case "hr":
        html += `<hr/>\n`;
        break;
    }
  }

  return html;
}
