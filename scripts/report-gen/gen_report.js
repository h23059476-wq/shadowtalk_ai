/**
 * ShadowTalk AI — Research-to-Visualization Investigation Report (.docx)
 * Generated with docx-js per the docx skill (R1 cover recipe, DM-1 palette,
 * 3-section page numbering, Template C testing-report structure, English).
 * (Recreated after sandbox recycle; includes all postcheck fixes inline.)
 */
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  Header, Footer, PageNumber, NumberFormat, AlignmentType, HeadingLevel,
  WidthType, BorderStyle, ShadingType, TableOfContents, PageBreak,
  SectionType, TableLayoutType,
} = require("docx");
const fs = require("fs");

/* ---------------------------------------------------------------- */
/* Palette (DM-1 Deep Cyan — AI/tech) + table tokens                */
/* ---------------------------------------------------------------- */
const P = {
  bg: "162235",
  accent: "37DCF2",
  cover: { titleColor: "FFFFFF", subtitleColor: "B0B8C0", metaColor: "90989F", footerColor: "687078" },
  primary: "162235",           // body heading color (dark navy)
  body: "000000",              // Profile A: pure black body text
  secondary: "5A6878",
  table: { headerBg: "1B6B7A", headerText: "FFFFFF", innerLine: "C8DDE2", surface: "EDF3F5" },
};

const NB = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" };
const noBorders = { top: NB, bottom: NB, left: NB, right: NB };
const allNoBorders = { top: NB, bottom: NB, left: NB, right: NB, insideHorizontal: NB, insideVertical: NB };

const FONT = { ascii: "Times New Roman", eastAsia: "Times New Roman" };

/* ---------------------------------------------------------------- */
/* Cover title layout helpers (from design-system.md — mandatory)   */
/* ---------------------------------------------------------------- */
function splitTitleLines(title, charsPerLine) {
  if (title.length <= charsPerLine) return [title];
  const breakAfter = new Set([..."\uFF0C\u3002\u3001\uFF1B\uFF1A\uFF01\uFF1F", ..."-_\u2014\u2013\u00B7/", ..." \t"]);
  const lines = [];
  let remaining = title;
  while (remaining.length > charsPerLine) {
    let breakAt = -1;
    for (let i = charsPerLine; i >= Math.floor(charsPerLine * 0.6); i--) {
      if (i < remaining.length && breakAfter.has(remaining[i - 1])) { breakAt = i; break; }
    }
    if (breakAt === -1) {
      const limit = Math.min(remaining.length, Math.ceil(charsPerLine * 1.3));
      for (let i = charsPerLine + 1; i < limit; i++) {
        if (breakAfter.has(remaining[i - 1])) { breakAt = i; break; }
      }
    }
    if (breakAt === -1) breakAt = charsPerLine;
    lines.push(remaining.slice(0, breakAt).trim());
    remaining = remaining.slice(breakAt).trim();
  }
  if (remaining) lines.push(remaining);
  if (lines.length > 1 && lines[lines.length - 1].length <= 2) {
    const last = lines.pop();
    lines[lines.length - 1] += last;
  }
  return lines;
}

function calcTitleLayout(title, maxWidthTwips, preferredPt = 40, minPt = 24) {
  // English chars are ~half CJK width; use pt*12 as effective char width.
  const charWidth = (pt) => pt * 12;
  const charsPerLine = (pt) => Math.floor(maxWidthTwips / charWidth(pt));
  let titlePt = preferredPt;
  let lines;
  while (titlePt >= minPt) {
    const cpl = charsPerLine(titlePt);
    if (cpl < 2) { titlePt -= 2; continue; }
    lines = splitTitleLines(title, cpl);
    if (lines.length <= 3) break;
    titlePt -= 2;
  }
  if (!lines || lines.length > 3) {
    lines = splitTitleLines(title, charsPerLine(minPt));
    titlePt = minPt;
  }
  return { titlePt, titleLines: lines };
}

function calcCoverSpacing(params) {
  const {
    titleLineCount = 1, titlePt = 36, hasSubtitle = false,
    hasEnglishLabel = false, metaLineCount = 0,
    fixedHeight = 800, pageHeight = 16838, marginTop = 0, marginBottom = 0,
  } = params;
  const SAFETY = 1200;
  const usableHeight = pageHeight - marginTop - marginBottom - SAFETY;
  const titleHeight = titleLineCount * (titlePt * 23 + 200);
  const subtitleHeight = hasSubtitle ? (12 * 23 + 600) : 0;
  const englishLabelHeight = hasEnglishLabel ? (9 * 23 + 600) : 0;
  const metaHeight = metaLineCount * (10 * 23 + 100);
  const implicitParaHeight = 3 * 300;
  const contentHeight = titleHeight + subtitleHeight + englishLabelHeight + metaHeight + fixedHeight + implicitParaHeight;
  const remainingSpace = usableHeight - contentHeight;
  const safeRemaining = Math.max(remainingSpace, 400);
  const FOOTER_MIN = 800;
  const rawTop = Math.floor(safeRemaining * 0.45);
  const rawBottom = Math.floor(safeRemaining * 0.45);
  const bottomSpacing = Math.max(rawBottom, FOOTER_MIN);
  const topSpacing = Math.max(rawTop - Math.max(0, FOOTER_MIN - rawBottom), 400);
  const midSpacing = Math.max(safeRemaining - topSpacing - bottomSpacing, 0);
  return { topSpacing, midSpacing, bottomSpacing };
}

/* ---------------------------------------------------------------- */
/* Cover Recipe R1 (Pure Paragraph Left) — from design-system.md     */
/* ---------------------------------------------------------------- */
function buildCoverR1(config) {
  const C = config.palette;
  const padL = 1200, padR = 800;
  const availableWidth = 11906 - padL - padR - 300;
  const { titlePt, titleLines } = calcTitleLayout(config.title, availableWidth, 40, 24);
  const titleSize = titlePt * 2;
  const spacing = calcCoverSpacing({
    titleLineCount: titleLines.length, titlePt,
    hasSubtitle: !!config.subtitle, hasEnglishLabel: !!config.englishLabel,
    metaLineCount: (config.metaLines || []).length,
    fixedHeight: 400,
  });
  const accentLeft = { style: BorderStyle.SINGLE, size: 8, color: C.accent, space: 12 };
  const children = [];

  children.push(new Paragraph({ spacing: { before: spacing.topSpacing } }));

  if (config.englishLabel) {
    children.push(new Paragraph({
      indent: { left: padL, right: padR }, spacing: { after: 500 },
      border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: C.accent, space: 8 } },
      children: [new TextRun({ text: config.englishLabel.split("").join("  "),
        size: 18, color: C.accent, font: { ascii: "Arial", eastAsia: "SimHei" }, characterSpacing: 40 })],
    }));
  }

  for (let i = 0; i < titleLines.length; i++) {
    children.push(new Paragraph({
      indent: { left: padL },
      spacing: { after: i < titleLines.length - 1 ? 100 : 300, line: Math.ceil(titlePt * 23), lineRule: "atLeast" },
      children: [new TextRun({ text: titleLines[i], size: titleSize, bold: true,
        color: C.cover.titleColor, font: { eastAsia: "SimHei", ascii: "Arial" } })],
    }));
  }

  if (config.subtitle) {
    children.push(new Paragraph({
      indent: { left: padL, right: padR }, spacing: { after: 800 },
      children: [new TextRun({ text: config.subtitle, size: 24, color: C.cover.subtitleColor,
        font: { eastAsia: "Microsoft YaHei", ascii: "Arial" } })],
    }));
  }

  for (const line of (config.metaLines || [])) {
    children.push(new Paragraph({
      indent: { left: padL + 200, right: padR }, spacing: { after: 80 },
      border: { left: accentLeft },
      children: [new TextRun({ text: line, size: 24, color: C.cover.metaColor,
        font: { eastAsia: "Microsoft YaHei", ascii: "Arial" } })],
    }));
  }

  children.push(new Paragraph({ spacing: { before: spacing.bottomSpacing } }));

  children.push(new Paragraph({
    indent: { left: padL, right: padR },
    border: { top: { style: BorderStyle.SINGLE, size: 2, color: C.accent, space: 8 } },
    spacing: { before: 200 },
    children: [
      new TextRun({ text: config.footerLeft || "", size: 16, color: C.cover.footerColor, font: { ascii: "Arial" } }),
      new TextRun({ text: "                                        " }),
      new TextRun({ text: config.footerRight || "", size: 16, color: C.cover.footerColor, font: { ascii: "Arial" } }),
    ],
  }));

  return [new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    layout: TableLayoutType.FIXED,
    borders: allNoBorders,
    rows: [new TableRow({
      height: { value: 16838, rule: "exact" },
      children: [new TableCell({
        shading: { type: ShadingType.CLEAR, fill: C.bg }, borders: noBorders,
        verticalAlign: "top",
        children,
      })],
    })],
  })];
}

/* ---------------------------------------------------------------- */
/* Body content builders                                            */
/* ---------------------------------------------------------------- */
function h1(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 360, after: 160, line: 312 },
    children: [new TextRun({ text, bold: true, size: 32, color: P.primary, font: FONT })],
  });
}
function h2(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 240, after: 120, line: 312 },
    children: [new TextRun({ text, bold: true, size: 28, color: P.primary, font: FONT })],
  });
}
function h3(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_3,
    spacing: { before: 200, after: 100, line: 312 },
    children: [new TextRun({ text, bold: true, size: 24, color: P.primary, font: FONT })],
  });
}
/** Body paragraph — accepts a string or an array of TextRun option objects. */
function body(content, opts = {}) {
  const runs = (Array.isArray(content) ? content : [{ text: content }]).map(
    (r) => new TextRun({ size: 24, color: P.body, font: FONT, ...r }),
  );
  return new Paragraph({
    alignment: AlignmentType.JUSTIFIED,
    spacing: { line: 312, after: opts.after ?? 120 },
    keepNext: opts.keepNext ?? false,
    children: runs,
  });
}
function bullet(text, level = 0) {
  return new Paragraph({
    bullet: { level },
    alignment: AlignmentType.LEFT,
    spacing: { line: 312, after: 60 },
    children: [new TextRun({ text, size: 24, color: P.body, font: FONT })],
  });
}
function caption(text) {
  return new Paragraph({
    keepNext: true,
    alignment: AlignmentType.LEFT,
    spacing: { before: 120, after: 80, line: 312 },
    children: [new TextRun({ text, bold: true, size: 21, color: P.primary, font: FONT })],
  });
}
/** Horizontal-Only business table (design-system style 3). */
function dataTable(headers, rows, widths) {
  const mk = (text, isHeader, w) => new TableCell({
    children: [new Paragraph({
      alignment: AlignmentType.LEFT,
      spacing: { line: 312 },
      children: [new TextRun({ text: String(text), bold: isHeader, size: 20,
        color: isHeader ? P.table.headerText : P.body, font: FONT })],
    })],
    shading: isHeader ? { type: ShadingType.CLEAR, fill: P.table.headerBg } : undefined,
    margins: { top: 60, bottom: 60, left: 120, right: 120 },
    width: { size: w, type: WidthType.PERCENTAGE },
  });
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: { style: BorderStyle.SINGLE, size: 2, color: P.table.headerBg },
      bottom: { style: BorderStyle.SINGLE, size: 2, color: P.table.headerBg },
      left: NB, right: NB,
      insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: P.table.innerLine },
      insideVertical: NB,
    },
    rows: [
      new TableRow({
        tableHeader: true, cantSplit: true,
        children: headers.map((t, i) => mk(t, true, widths[i])),
      }),
      ...rows.map((r) => new TableRow({
        cantSplit: true,
        children: r.map((t, i) => mk(t, false, widths[i])),
      })),
    ],
  });
}
function codeLine(text) {
  return new Paragraph({
    alignment: AlignmentType.LEFT,
    spacing: { line: 276, after: 40 },
    indent: { left: 360 },
    children: [new TextRun({ text, size: 20, color: "1B4A5A", font: { ascii: "Consolas", eastAsia: "Consolas" } })],
  });
}
function spacer(after = 120) {
  return new Paragraph({ spacing: { after }, children: [] });
}

/* ---------------------------------------------------------------- */
/* Body content                                                     */
/* ---------------------------------------------------------------- */
const bodyChildren = [];

/* ============ 1. Executive Summary ============ */
bodyChildren.push(h1("1. Executive Summary"));
bodyChildren.push(body([
  { text: "This report documents an investigation of the Research-to-Visualization feature of ShadowTalk AI, triggered by a test screenshot of a generated " },
  { text: "USDT exposure decision tree", italics: true },
  { text: " (docs/architecture/research-visualization/screenshots/viz-8-concept-decision-tree.png). The investigation covered the complete pipeline — intent detection, context resolution, gap assessment, model-assisted generation, schema validation, provenance assignment and SVG rendering — and executed the five requested test cases (A–E) as a 17-assertion harness against the real pipeline modules. No production code was modified, no schema was changed, and nothing was committed." },
]));
bodyChildren.push(body([
  { text: "Overall verdict: ", bold: true },
  { text: "the feature is structurally safe but not yet semantically trustworthy. The closed-schema security model is genuinely solid — the model can only author JSON, every candidate passes a zod validation gate, renderers treat all labels as plain text, and conceptual diagrams can never present a fabricated number as data. However, the decision-tree graph contract is enforced only by prompt wording and not by code, the context resolver injects conversation content that can be irrelevant to the current request, and model-attached source URLs are accepted without an allowlist check. All three areas produced reproducible defects, each confirmed by executed code paths rather than by inspecting rendered output." },
]));
bodyChildren.push(body([
  { text: "The four findings with the highest impact are: " },
  { text: "(1)", bold: true },
  { text: " decision nodes may ship with fewer than two outgoing edges and without condition labels, which explains the single-branch \u201CReserves verified?\u201D node in the screenshot; " },
  { text: "(2)", bold: true },
  { text: " disconnected nodes are silently permitted and are rendered in the root row as pseudo-start-nodes, which explains the floating \u201CReview reserve reports\u201D node; " },
  { text: "(3)", bold: true },
  { text: " any structured dataset captured anywhere in the session marks every later request as \u201Csufficient\u201D regardless of topic, so a USDT research block is fed as grounding context to an unrelated \u201Cstablecoin data platform\u201D request, together with its source URL — reproducing exactly the \u201CAI-EXTRACTED \u00B7 1 source\u201D card combination shown in the screenshot; " },
  { text: "(4)", bold: true },
  { text: " when no context matches at all, the resolver unconditionally injects the newest assistant message as grounding evidence, even with zero keyword overlap." },
]));
bodyChildren.push(body([
  { text: "On the screenshot\u2019s timestamp question: the 12:40 PM prompt \u201CDraw the architecture of a stablecoin data platform.\u201D appears below the 12:35 PM USDT response because chat messages render in array order with per-message creation timestamps. The later prompt postdates the response and therefore " },
  { text: "cannot have contaminated the USDT tree", bold: true },
  { text: "; the contamination risk runs forward, from the earlier USDT research into the later architecture request. Recommended fixes are listed in Section 10 with priorities; none have been implemented." },
]));

/* ============ 2. Scope, Method and Evidence Base ============ */
bodyChildren.push(h1("2. Scope, Method and Evidence Base"));
bodyChildren.push(h2("2.1 Scope"));
bodyChildren.push(body([
  { text: "The investigation targeted the conceptual (Batch 3) diagram pipeline with emphasis on decision trees: generation entry points in the chat page, the context resolver and gap assessor, the model bridge and prompt contracts, the visualization specification schema and its cross-field validation, the provenance policy, and the conceptual diagram renderer. Data-chart kinds (line, bar, pie, candlestick and related), storage mechanics and provider integrations were reviewed only where they interact with the decision-tree path." },
]));
bodyChildren.push(h2("2.2 Method and evidence"));
bodyChildren.push(body("Three evidence channels were combined. First, static analysis of 21 source files with exact line references (Appendix A). Second, an executed test harness — a temporary vitest file, deleted after the run — that exercised the real modules (contextResolver, gapAnalysis, modelBridge, conceptualPipeline, spec validator and the React renderer) with a mocked model and research bridge; its 17 assertions are listed with results in Section 5 and Appendix B. Third, review of the shipped screenshot and of the feature\u2019s own architecture documents (PHASE1_AUDIT.md, BATCH2_REPORT.md, BATCH3_REPORT.md) to separate newly found defects from documented design intent."));
bodyChildren.push(body([
  { text: "Constraint compliance: ", bold: true },
  { text: "investigation only. Production code, schemas and the visualization feature were left untouched; the working tree was verified clean afterward (git status: 0 changes); no commits or pushes were made. Semantic correctness is never claimed from rendering alone — every semantic claim in this report is backed by an executed code path or an exact code citation." },
]));
bodyChildren.push(h2("2.3 Limitations"));
bodyChildren.push(body("The harness mocks the model and research calls, so findings about model behaviour are findings about what the pipeline permits a model to do, not observations about one specific provider. The screenshot\u2019s underlying session data was not available, so the exact node IDs and edge list of the original USDT tree are reconstructed from the visible labels, edge labels and layout rather than read from a persisted specification."));

/* ============ 3. Pipeline Architecture ============ */
bodyChildren.push(h1("3. Feature and Pipeline Architecture"));
bodyChildren.push(body("A visualization request travels through a deterministic routing layer into an AI-assisted conceptual pipeline. The stages below are the ones relevant to decision trees; file and function references are exact (line numbers as of commit 77368ac0 on feature/appearance-studio)."));
bodyChildren.push(caption("Table 1: Decision-tree generation pipeline, stage by stage"));
bodyChildren.push(dataTable(
  ["Stage", "Location", "Role"],
  [
    ["1. Intent detection", "src/lib/visualization/intentDetector.ts — detectVisualizationIntent (L128\u2013199)", "Classifies create / refine / explain; \u201CDraw the architecture of \u2026\u201D matches create pattern 5 (L85) without a type hint"],
    ["2. Session wiring", "src/pages/ChatbotPage.tsx — runVisualizationRequest (L1531\u20131543), toPipelineMessages (L1480\u20131491)", "Passes the FULL session (welcome message filtered only) plus BYOK model and research calls"],
    ["3. Routing", "src/lib/visualization/chatPipeline.ts — handleVisualizationRequest (L525\u2013541)", "Decision-tree hints and conceptual ops route to handleConceptualRequest"],
    ["4. Context resolution", "src/lib/visualization/contextResolver.ts — resolveResearchContext (L121\u2013243)", "Scores ALL prior AI messages by priority class, keyword overlap and recency; unconditional newest-message fallback (L182\u2013189)"],
    ["5. Gap assessment", "src/lib/visualization/conceptual/gapAnalysis.ts — assessGaps (L89\u2013138), buildContextDigest (L38\u201359)", "Verdict sufficient / needs-research / cannot-derive; digest = dataset lines + evidence excerpts + declared gaps"],
    ["6. Deterministic build", "gapAnalysis.ts — buildConceptFromDatasets (L165\u2013327)", "Roadmap / mindmap / architecture from structured datasets; no decision-tree builder exists — trees are always model-authored"],
    ["7. Model generation", "conceptual/conceptualPipeline.ts — generateConceptSpec (L176\u2013245); conceptual/prompts.ts (L16\u201372)", "Closed-schema JSON prompt; sources offered as \u201CCITABLE SOURCES you may attach\u201D (L64\u201367); one repair round on validation failure"],
    ["8. Normalize + gate", "conceptual/modelBridge.ts — normalizeConceptCandidate (L103\u2013308), validateConceptCandidate (L323\u2013337); spec.ts — validateVisualizationSpec (L788\u2013873)", "Kind coercion, string capping, unknown-key stripping, decision-tree cross-checks (L530\u2013540)"],
    ["9. Provenance finalize", "conceptualPipeline.ts — finalizeConceptProvenance (L94\u2013113), conceptOutcome (L115\u2013137)", "sources > 0 \u2192 ai-extracted; none \u2192 unverified + gap note; response text and source chips derive from the spec"],
    ["10. Rendering", "src/components/visualization/ConceptualDiagramRenderer.tsx — layoutDecisionTree (L266\u2013326), DecisionTreeSvg (L769\u2013827); VisualizationCard.tsx (L51\u201355)", "Re-parses the spec (parseVisualizationSpec), BFS level layout, SVG paths, kind-coloured nodes"],
  ],
  [16, 38, 46],
));
bodyChildren.push(body([
  { text: "Two properties of this architecture matter for the findings. First, the pipeline is " },
  { text: "session-scoped, not topic-scoped", bold: true },
  { text: ": stage 2 passes the entire session and stage 4 scores every prior assistant message. Second, the " },
  { text: "validation gate is the only semantic boundary", bold: true },
  { text: ": everything the prompt promises (\u201Cevery node kind decision must have \u22652 outgoing edges with condition labels\u201D, \u201Clabels must come from the supplied context\u201D, \u201Csources: ONLY urls that were supplied to you\u201D) is enforced nowhere except by asking the model to comply." },
]));

/* ============ 4. Screenshot evidence ============ */
bodyChildren.push(h1("4. Screenshot Evidence and Interaction Sequence"));
bodyChildren.push(h2("4.1 What the screenshot shows"));
bodyChildren.push(body("The card is titled \u201CUSDT exposure decision tree\u201D with an AI-EXTRACTED badge and a \u201C1 source\u201D chip; the response text above it reads \u201CProvenance: synthesized by the model from the attached sources (labelled ai-extracted).\u201D Five nodes are visible: \u201CPeg under $0.99?\u201D (amber, decision), \u201CReview reserve reports\u201D (grey, no edges attached), \u201CHold allocation\u201D and \u201CReduce exposure\u201D (green, outcomes), and \u201CReserves verified?\u201D (amber, decision). Three edges are traceable: Peg\u2014no\u2192Hold, Peg\u2014yes\u2192Reserves verified?, and Reserves verified?\u2014no\u2192Reduce exposure. \u201CReserves verified?\u201D therefore shows only one outgoing branch and no visible yes-outcome; \u201CReview reserve reports\u201D is completely disconnected; and the \u201Cyes\u201D label of the long Peg\u2192Reserves edge renders at the curve midpoint directly beside \u201CHold allocation\u201D, where it is easy to misread as an edge leaving \u201CHold allocation\u201D. The zoom indicator reads 87%."));
bodyChildren.push(h2("4.2 Establishing the actual interaction sequence"));
bodyChildren.push(body([
  { text: "The displayed prompt \u201CDraw the architecture of a stablecoin data platform.\u201D carries a 12:40 PM timestamp, five minutes after the 12:35 PM response. Message ordering in the chat is array order, and each message is stamped with a creation Date at push time (ChatbotPage.tsx L1537 creates the placeholder AI message with new Date(); MessageBubble.tsx L522\u2013524 renders format(message.timestamp, \u201CMMM d, h:mm a\u201D)). The later-timestamped prompt is therefore simply the next user turn, sent after the USDT tree was answered. " },
  { text: "It cannot have contaminated the 12:35 response.", bold: true },
]));
bodyChildren.push(body([
  { text: "The contamination question must instead be asked forward: what session context fed the 12:40 architecture request, whose answer is not visible in the screenshot? Section 5 (case B) shows that the pipeline would resolve the earlier USDT research as primary evidence, classify sufficiency without checking topic overlap, and offer the USDT source URL to the model as an attachable citation. In other words, the screenshot\u2019s \u201CAI-EXTRACTED \u00B7 1 source\u201D combination is legitimate for the tree itself (assuming one source genuinely backed the USDT discussion), while the same mechanism makes the " },
  { text: "next", italics: true },
  { text: " response the contamination risk. Whether the original \u201C1 source\u201D was real cannot be verified from the screenshot alone; no persisted session was available for inspection (see Section 7, SD-4)." },
]));

/* ============ 5. Test results ============ */
bodyChildren.push(h1("5. Test Case Results (A\u2013E)"));
bodyChildren.push(body("All five requested cases were executed as a 17-assertion vitest harness importing the real modules (resolveResearchContext, assessGaps, buildContextDigest, handleConceptualRequest with a mocked ConceptModelCall, validateVisualizationSpec and the rendered ConceptualDiagramRenderer). Every assertion below passed, which means every behaviour described as a defect was reproduced against the production code. The harness file was deleted after execution; reproduction steps are in Section 9."));
bodyChildren.push(caption("Table 2: Executed results for test cases A\u2013E (17 assertions, all passed)"));
bodyChildren.push(dataTable(
  ["ID", "Assertion", "Result / significance"],
  [
    ["A1", "Well-formed tree (2 decisions, 4 labelled edges, 2 outcomes) passes validation", "Baseline works as intended"],
    ["A2", "Decision node with a single outgoing edge passes", "DEFECT \u2014 branch-factor rule is prompt-only (CD-1)"],
    ["A3", "Decision node with zero outgoing edges passes", "DEFECT \u2014 dead-end decision allowed (CD-1)"],
    ["A4", "Decision edges without condition labels pass", "DEFECT \u2014 labels optional in schema (CD-1)"],
    ["A5", "Fully untyped node list passes and its first node is force-typed \u201Cdecision\u201D", "DEFECT \u2014 validator/renderer semantics diverge (CD-7)"],
    ["A6", "Duplicate edges and a self-loop edge pass", "DEFECT \u2014 no uniqueness or self-loop check (CD-8)"],
    ["A7", "A cyclic \u201Ctree\u201D passes", "DEFECT \u2014 no acyclicity check (CD-8)"],
    ["B1", "Architecture request resolves the USDT message as primary evidence", "CONFIRMED \u2014 session-scoped context (CD-3)"],
    ["B2", "assessGaps returns \u201Csufficient\u201D with topicOverlap=false (1/5 tokens)", "DEFECT \u2014 datasets>0 short-circuits relevance (CD-3)"],
    ["B3", "Digest handed to the model contains USDT dataset + excerpt", "CONFIRMED \u2014 irrelevant grounding delivered (CD-3)"],
    ["B4", "End-to-end: new architecture spec ships with the old USDT source, provenance ai-extracted, response says \u201C1 source\u201D", "DEFECT \u2014 reproduces the screenshot card combination (CD-5)"],
    ["B5", "Model attaches a never-supplied URL; gate accepts it", "DEFECT \u2014 no source allowlist (CD-6)"],
    ["C1", "\u201CDecision tree from the previous research\u201D resolves research-data evidence and a grounded digest", "WORKS AS DESIGNED"],
    ["D1", "Unrelated conversation: newest AI answer injected with zero keyword overlap", "DEFECT \u2014 unconditional fallback (CD-4)"],
    ["D2", "Truly empty session produces no evidence and provenance unverified", "Correct boundary behaviour"],
    ["E1", "Intentionally disconnected node: validation ok=true, errors=[]", "DEFECT \u2014 silently permitted, no recorded reason (CD-2)"],
    ["E2", "Rendered DOM: disconnected node\u2019s rect y equals the start decision\u2019s y", "DEFECT \u2014 drawn in the root row, indistinguishable (CD-2)"],
  ],
  [8, 52, 40],
));

/* ============ 6. Confirmed defects ============ */
bodyChildren.push(h1("6. Confirmed Defects and Root Causes"));
bodyChildren.push(body("Each defect below was reproduced by an executed assertion (Section 5). Severity reflects impact on trustworthiness: High means the feature can present a misleading structure or attribution as validated fact."));

bodyChildren.push(h2("CD-1 \u2014 Decision-branch contract is prompt-only (High)"));
bodyChildren.push(body([
  { text: "The system prompt requires \u201Cevery node kind decision must have \u22652 outgoing edges with condition labels\u201D (conceptual/prompts.ts L43), but neither the schema nor the cross-field validator enforces it. decisionEdgeSchema declares the condition label optional (spec.ts L310\u2013315), and validateDecisionKind (spec.ts L530\u2013540) checks only three things: unique node ids, edge endpoints that reference existing nodes, and the presence of at least one node of kind \u201Cdecision\u201D. Outgoing-edge counts per decision node, label presence, duplicate edges, self-loops and acyclicity are all unchecked; normalizeConceptCandidate likewise filters edges only for dangling references (modelBridge.ts L199\u2013207). " },
  { text: "Consequence:", bold: true },
  { text: " a decision node with one branch and no labels validates cleanly — precisely the \u201CReserves verified?\u201D shape in the screenshot, where the yes-branch outcome is missing and the tree answers a decision without presenting its alternative." },
]));

bodyChildren.push(h2("CD-2 \u2014 Disconnected nodes are silently permitted and drawn as pseudo-start-nodes (High)"));
bodyChildren.push(body([
  { text: "validateDecisionKind has no reachability or connectivity check, so an isolated node produces ok=true with an empty error list (assertion E1) — permitted, but not intentional: neither spec.ts nor the Batch 3 report documents or records any reason for isolation. The renderer then places every unreachable node at level 0: layoutDecisionTree seeds its BFS from the first decision node (ConceptualDiagramRenderer.tsx L280) and assigns unmatched nodes `levelOf.get(n.id) ?? 0` (L294\u2013297), which drops them into the top row beside the real start node, styled identically to any connected option node (L798\u2013823). " },
  { text: "Consequence:", bold: true },
  { text: " \u201CReview reserve reports\u201D in the screenshot renders as a floating sibling of the root question with no visual distinction, no caption and no warning — the viewer cannot tell an intentional side-note from a broken edge." },
]));

bodyChildren.push(h2("CD-3 \u2014 Topic-irrelevant context is classified \u201Csufficient\u201D (High)"));
bodyChildren.push(body([
  { text: "assessGaps decides with `if (hasContext && (topicOverlap || context.datasets.length > 0))` (gapAnalysis.ts L103). The documented design is \u201Csufficient: context has datasets/evidence AND topic overlap\u201D (L84\u201385), but the implemented OR makes the topic check dead whenever one structured dataset exists anywhere in the session. Assertion B2 shows the request \u201CDraw the architecture of a stablecoin data platform.\u201D scoring 1/5 topic tokens against USDT research and still receiving verdict \u201Csufficient\u201D; B3 shows the digest actually handed to the model containing the USDT dataset line and the USDT excerpt. " },
  { text: "Consequence:", bold: true },
  { text: " every later diagram in a session inherits the first research topic as its grounding context, and the honesty rule \u201Clabels MUST come from the supplied research context\u201D (prompts.ts L19) then actively pushes USDT vocabulary into unrelated diagrams." },
]));

bodyChildren.push(h2("CD-4 \u2014 Unconditional newest-message fallback injects unrelated content (High)"));
bodyChildren.push(body([
  { text: "When no candidate scores, resolveResearchContext pushes the newest non-empty assistant message as text-match evidence with score 0 (contextResolver.ts L182\u2013189) — regardless of keyword overlap. Assertion D1: in a session about Dante\u2019s Divine Comedy, the request \u201CDraw a decision tree for launching a product.\u201D resolves primaryMessageId = the Dante answer, and the digest (via buildContextDigest) delivers its text as \u201CRESEARCH CONTEXT available to ground labels\u201D. Assertion D2 shows the only safe boundary: a completely empty session injects nothing. " },
  { text: "Consequence:", bold: true },
  { text: " test case D\u2019s requirement \u2014 that a new unrelated conversation must not receive previous research — holds only for pristine sessions; any prior exchange, however unrelated, is injected." },
]));

bodyChildren.push(h2("CD-5 \u2014 Cross-request provenance carry-over (High)"));
bodyChildren.push(body([
  { text: "conceptualCreateFlow builds the prompt\u2019s attachable source list from context.citations (conceptualPipeline.ts L519\u2013521) — the union of prior citations and any fresh research — and the model\u2019s attached sources become the spec\u2019s sources (modelBridge.ts L291\u2013300), which drive both the AI-EXTRACTED badge (finalizeConceptProvenance, L94\u2013113: any source \u2192 ai-extracted) and the \u201CN source(s)\u201D chip and source list (VisualizationContainer.tsx L312\u2013335, SourceList). Assertion B4 runs the full flow end-to-end: a mocked model attaching the USDT URL to the new stablecoin-architecture spec produces provenance ai-extracted, sources.length = 1 pointing at the old URL, and the response text \u201C1 source attached\u201D. " },
  { text: "Consequence:", bold: true },
  { text: " the exact card combination in the screenshot can be produced for a request that has nothing to do with the attached source. The label \u201Cai-extracted\u201D is honest about synthesis, but the source chip implies the source substantiates this diagram." },
]));

bodyChildren.push(h2("CD-6 \u2014 No allowlist on model-attached source URLs (Medium)"));
bodyChildren.push(body([
  { text: "The prompt restricts attachments to \u201CONLY urls that were supplied to you\u201D (prompts.ts L36, L64\u201367), but normalizeConceptCandidate accepts every http(s) URL the model emits (modelBridge.ts L291\u2013300) with no cross-check against the supplied citations. Assertion B5: a fabricated URL (https://made-up-source.example.org/report.pdf) passes the gate and is rendered by SourceList as a clickable link with name and timestamps. " },
  { text: "Consequence:", bold: true },
  { text: " a hallucinated or adversarial completion can dress an unverified diagram in a plausible-looking citation; the http(s) scheme check blocks javascript:/data: but not fabrication." },
]));

bodyChildren.push(h2("CD-7 \u2014 Untyped nodes mean different things to the validator and the renderer (Medium)"));
bodyChildren.push(body([
  { text: "decisionNodeSchema makes kind optional (spec.ts L304\u2013308). validateDecisionKind counts untyped nodes as decisions for its \u201Cat least one decision\u201D rule (`(n.kind ?? \u201Cdecision\u201D)`, spec.ts L537); the renderer instead types every untyped node as \u201Coption\u201D (`node.kind ?? \u201Coption\u201D`, renderer L306) and paints options grey; and when the model omits kinds entirely, normalizeConceptCandidate force-types the FIRST node as decision (modelBridge.ts L208\u2013211) even if it is semantically an action item rather than a question. " },
  { text: "Consequence:", bold: true },
  { text: " the same spec can validate as containing a decision while visually presenting none; branch-factor enforcement keyed on kind would also be fooled." },
]));

bodyChildren.push(h2("CD-8 \u2014 Duplicate edges, self-loops and cycles are structurally legal (Low)"));
bodyChildren.push(body([
  { text: "Assertions A6\u2013A7: two edges with the same from/to (labelled differently) render as overlapping curves; a self-loop folds back on the same node; a 2-cycle renders as two stacked opposing curves. None are rejected, and the deterministic \u201Csimplify\u201D BFS pruning (conceptualPipeline.ts L383\u2013413) follows adjacency blindly, so cycles can also affect which nodes survive simplification. Impact is cosmetic-to-moderate, but it widens the gap between the name \u201Cdecision-tree\u201D and what the kind accepts." },
]));

/* ============ 7. Suspected defects ============ */
bodyChildren.push(h1("7. Suspected Defects and Open Risks"));
bodyChildren.push(h2("SD-1 \u2014 Edge-label ambiguity and overlap (Medium, partially confirmed)"));
bodyChildren.push(body("DecisionTreeSvg draws each condition label at the exact curve midpoint ((x1+x2)/2, midY\u22124) with no collision handling (ConceptualDiagramRenderer.tsx L785\u2013789). The screenshot\u2019s confusing \u201Cyes\u201D placement next to \u201CHold allocation\u201D is consistent with this mechanism — the label belongs to the long Peg\u2192Reserves edge — and assertion E2 confirms the layout geometry that produces such long diagonals. What is not fully confirmed is the worst-case behaviour (label overlapping a node rectangle) on dense trees; that requires rendering a larger corpus of generated trees, which was out of scope for a read-only investigation."));
bodyChildren.push(h2("SD-2 \u2014 Outcome semantics are unchecked (Medium)"));
bodyChildren.push(body("Nothing requires decision branches to terminate in outcome nodes, or leaf nodes to be outcomes; \u201Coutcome\u201D is purely a colour choice in the renderer. A tree can legally end a branch on another decision (as \u201CReserves verified?\u201D effectively does with its missing branch) or on an option node. The prompt\u2019s node vocabulary implies the invariant; the schema does not state it."));
bodyChildren.push(h2("SD-3 \u2014 First-node force-typing can mislabel the entry (Medium)"));
bodyChildren.push(body("When the model omits kinds, modelBridge.ts L208\u2013211 promotes nodes[0] to \u201Cdecision\u201D. Both the BFS layout (renderer L280) and any future branch-factor validation would then treat that node as the entry question even when the label reads like an action (\u201CReview reserve reports\u201D). Not observed in the screenshot (its first node is a genuine question), hence classified suspected; the mechanism is verified by code reading and assertion A5."));
bodyChildren.push(h2("SD-4 \u2014 \u201C1 source\u201D on the original card is unverifiable from the screenshot (Low)"));
bodyChildren.push(body("The displayed source count is faithful to spec.sources.length by construction (VisualizationContainer.tsx L335), but whether the original USDT tree\u2019s single source was a genuinely captured research citation or a model-attached URL cannot be determined without the persisted session. CD-5/CD-6 show both paths exist. Verifying real deployments requires exporting a session\u2019s message list and inspecting the message-level citations alongside the spec."));

/* ============ 8. Verified working ============ */
bodyChildren.push(h1("8. What Is Verified Working"));
bodyChildren.push(body("The trustworthiness verdict must be balanced against what the investigation confirmed to be solid. These properties were verified by code reading and, where noted, by executed assertions:"));
bodyChildren.push(bullet("Closed schema and no injection surface: every candidate is zod-parsed with unknown keys stripped recursively (spec.ts L882\u2013888), strings are length-capped at normalization (modelBridge.ts L95, L103\u2013308), and renderers emit labels only as SVG text children that React escapes; no code/HTML path exists from model output to the DOM."));
bodyChildren.push(bullet("Honest failure modes: JSON extraction tolerates fences and prose (modelBridge.ts L58\u201372); one repair round feeds exact validation errors back (conceptualPipeline.ts L216\u2013242); persistent failure produces an explicit refusal text instead of a diagram; no numeric data surface exists on conceptual kinds at all."));
bodyChildren.push(bullet("Provenance ceiling: finalizeConceptProvenance can only raise a spec to ai-extracted, never to source-verified, and adds a synthesis note (L94\u2013113); unverified requires an acknowledging gap note (spec.ts L868\u2013870). The response wording in the screenshot matches conceptOutcome\u2019s template exactly (conceptualPipeline.ts L115\u2013137)."));
bodyChildren.push(bullet("Renderer fidelity: the decision-tree renderer displays exactly the validated specification — nodes, kinds, edges, edge labels and their direction (source bottom-centre to target top-centre with an arrowhead) map 1:1 to the spec (assertions E2 and C1; layout and SVG sections L266\u2013326, L769\u2013827). Label truncation to 22\u201324 characters per line is a display choice, not content loss in the spec."));
bodyChildren.push(bullet("Intended grounding path works: case C confirmed that \u201Cdecision tree from the previous research\u201D resolves research-data evidence with a grounded digest — the core feature goal is achieved when the request and the context genuinely match."));
bodyChildren.push(bullet("Interaction timestamps are per-message creation times rendered in array order (ChatbotPage.tsx L1537; MessageBubble.tsx L522\u2013524) — the sequence ambiguity in the screenshot is resolved by Section 4, not a defect."));

/* ============ 9. Reproduction steps ============ */
bodyChildren.push(h1("9. Reproduction Steps"));
bodyChildren.push(h2("9.1 Harness reproduction (code level)"));
bodyChildren.push(body("The harness was a temporary vitest file placed at src/lib/visualization/__tests__/ and removed after execution. To reproduce: create a scratch *.test.tsx importing resolveResearchContext (contextResolver.ts), assessGaps / buildContextDigest / formatDigestForPrompt (gapAnalysis.ts), handleConceptualRequest with a vi.fn() model returning a fixed JSON candidate (conceptualPipeline.ts + modelBridge.ts), validateVisualizationSpec (spec.ts) and render(ConceptualDiagramRenderer) from @testing-library/react. Fixtures: a USDT session message carrying researchData (dataset + one source) and citations; an unrelated literature session with plain text only. Then assert the behaviours listed in Table 2 — each one is a single expect() against the named module. The renderer assertion compares rect y-attributes of the disconnected node and the start node."));
bodyChildren.push(h2("9.2 UI reproduction (application level)"));
bodyChildren.push(bullet("Case A/B (contamination + provenance): open /chatbot, send \u201CResearch USDT exposure risk and reserves\u201D and let a research tool return at least one cited source; then send \u201CDraw the architecture of a stablecoin data platform.\u201D with a BYOK key configured. The generated architecture card can attach the USDT source and shows the AI-EXTRACTED badge with \u201C1 source\u201D; Expand \u2192 Sources & timestamps lists the old URL (VisualizationContainer.tsx SourceList)."));
bodyChildren.push(bullet("Case C (intended reuse): in the same session ask for \u201Ca decision tree from the previous research\u201D — the tree\u2019s labels track the USDT research (expected behaviour)."));
bodyChildren.push(bullet("Case D (unrelated injection): start a fresh conversation on any non-research topic, then send \u201CDraw a decision tree for launching a product.\u201D With a BYOK key, expand the generation prompt (mock the model call or inspect request logs): the user prompt\u2019s RESEARCH CONTEXT section contains the unrelated answer text."));
bodyChildren.push(bullet("Case E (disconnected node): in an expanded diagram ask \u201Cadd a note node Review reserve reports\u201D — or craft the spec through the harness — and observe the node appear in the top row with normal styling, no warning, and validation passing (Expand dialog shows no defects)."));

/* ============ 10. Recommended fixes ============ */
bodyChildren.push(h1("10. Recommended Fixes (Not Implemented)"));
bodyChildren.push(body("Fixes are listed with priority, target location and expected effect. None have been applied; production code and schemas are unchanged."));
bodyChildren.push(caption("Table 3: Prioritized recommendations"));
bodyChildren.push(dataTable(
  ["Prio", "Fix", "Target", "Expected effect"],
  [
    ["P0-1", "Enforce the graph contract in validateDecisionKind: every decision node \u22652 outgoing edges, each with a non-empty label; reject duplicate edges and self-loops; require acyclicity and reachability from the entry decision; for an intentionally isolated node require an explicit acknowledged reason in gaps (mirroring the unverified-gap pattern of spec.ts L868\u2013870)", "spec.ts validateDecisionKind (L530\u2013540); optionally decisionEdgeSchema", "Single-branch and floating nodes are rejected or explicitly acknowledged; the gate matches the prompt"],
    ["P0-2", "Repair the sufficiency check: replace `topicOverlap || context.datasets.length > 0` with a requirement of genuine topic overlap, or an explicit referential request (\u201Cthis / the previous research\u201D); attach the computed overlap and the chosen evidence ids to the digest", "gapAnalysis.ts assessGaps (L89\u2013138), buildContextDigest (L38\u201359)", "Unrelated requests trigger scoped research instead of inheriting the session\u2019s first topic"],
    ["P0-3", "Make the zero-candidate fallback conditional: inject the newest AI message only when the request is referential (no content keywords) or the message carries research-data/citations; never inject plain text with zero keyword overlap", "contextResolver.ts (L182\u2013189)", "Test case D passes: unrelated conversations receive no injected grounding"],
    ["P0-4", "Source allowlist: filter model-attached sources to the URLs supplied in the prompt (mergedCitations); drop or downgrade others with a gap note; drive the source-count chip from verified sources only", "modelBridge.ts (L291\u2013300); conceptualPipeline.ts (L519\u2013521); VisualizationContainer.tsx source chip", "\u201C1 source\u201D can no longer mean a fabricated or carried-over URL"],
    ["P1-1", "Require explicit kinds on all decision-tree nodes at normalization (reject or sensibly infer with a recorded note); align the validator\u2019s untyped-as-decision rule with the renderer\u2019s untyped-as-option rendering", "modelBridge.ts (L179\u2013214); spec.ts (L537); renderer (L306)", "Validator semantics, renderer styling and branch checks agree"],
    ["P1-2", "Outcome semantics: validate that every decision branch terminates in a leaf and prefer leaf = outcome; renderer marks unreachable nodes distinctly (dashed border, separate \u201Cunlinked\u201D row with caption) and offsets edge labels to avoid node/edge overlap", "spec.ts; ConceptualDiagramRenderer.tsx (L280\u2013297, L785\u2013789)", "Structural completeness becomes visible; the screenshot\u2019s two ambiguities disappear"],
    ["P1-3", "Surface context provenance on the card: record which message ids fed the digest (verdict, topicOverlap, evidence ids) in the spec or the outcome notes so \u201Cgrounded in what?\u201D is inspectable per card", "conceptualPipeline.ts (finalizeConceptProvenance / conceptOutcome)", "Trust review per card becomes possible without session exports"],
    ["P2-1", "Renderer hardening: deterministic BFS child ordering (sort by id or spec order), label collision pass, entry-node \u201CSTART\u201D cue", "ConceptualDiagramRenderer.tsx", "Stable, readable layouts across regenerations"],
    ["P2-2", "Promote the 17 harness assertions to permanent regression tests (context relevance, gate strictness, provenance allowlist, disconnected-node rendering)", "src/lib/visualization/__tests__/", "Fixes cannot silently regress"],
  ],
  [8, 40, 26, 26],
));
bodyChildren.push(body([
  { text: "Sequencing note: ", bold: true },
  { text: "P0-1 and P0-2/P0-3 are independent and can land in either order; P0-4 depends only on threading the supplied-URL list into normalizeConceptCandidate\u2019s options. P1-1 should precede any stricter kind-keyed validation, otherwise untyped nodes bypass it (CD-7)." },
]));

/* ============ 11. Conclusion ============ */
bodyChildren.push(h1("11. Conclusion"));
bodyChildren.push(body([
  { text: "Against the investigation\u2019s three-part goal: " },
  { text: "visually impressive", bold: true },
  { text: " — yes, and the renderer is a faithful, escape-only projector of the validated specification; " },
  { text: "structurally valid", bold: true },
  { text: " — at the security boundary yes (closed schema, no injection, honest refusals), but at the graph-semantics level no: the decision-tree contract exists only in the prompt, so disconnected nodes, single-branch decisions, unlabeled conditions, duplicates and cycles all validate (CD-1, CD-2, CD-7, CD-8); " },
  { text: "contextually relevant and trustworthy", bold: true },
  { text: " — partially: intended reuse (case C) works, but relevance is not enforced (CD-3, CD-4) and provenance chips can reference sources that are old, carried-over or entirely fabricated (CD-5, CD-6)." },
]));
bodyChildren.push(body("The screenshot\u2019s four visible problems are therefore explained by confirmed root causes rather than rendering errors: the disconnected node is a validation gap made visible by the level-0 placement rule; the confusing condition labels are an edge-midpoint drawing choice over long BFS diagonals; the unclear outcomes reflect missing branch-completeness enforcement; and the AI-EXTRACTED / 1-source combination is the provenance system working as coded, with its weakest link (source allowlisting) exposed. The feature earns its safety story but not yet its trust story; the P0 set in Section 10 closes the gap with changes confined to two validators, the resolver/assessor and the source-normalization pass."));

/* ============ Appendix A ============ */
bodyChildren.push(h1("Appendix A: Exact Files and Functions Responsible"));
bodyChildren.push(caption("Table 4: Responsibility map (paths relative to repository root; lines at commit 77368ac0)"));
bodyChildren.push(dataTable(
  ["Defect", "File", "Function / location"],
  [
    ["CD-1", "src/lib/visualization/spec.ts", "decisionEdgeSchema (L310\u2013315, label optional); validateDecisionKind (L530\u2013540, no branch/label/connectivity checks)"],
    ["CD-1", "src/lib/visualization/conceptual/prompts.ts", "conceptCreateSystemPrompt L43 (the \u22652-edges rule exists only here)"],
    ["CD-2", "src/lib/visualization/spec.ts", "validateDecisionKind (no reachability check)"],
    ["CD-2", "src/components/visualization/ConceptualDiagramRenderer.tsx", "layoutDecisionTree L280 (BFS seed), L292\u2013297 (`?? 0` level for unreachable nodes); DecisionTreeSvg L798\u2013823 (uniform styling)"],
    ["CD-3", "src/lib/visualization/conceptual/gapAnalysis.ts", "assessGaps L103 (`topicOverlap || datasets.length > 0`); buildContextDigest L38\u201359"],
    ["CD-4", "src/lib/visualization/contextResolver.ts", "resolveResearchContext L182\u2013189 (unconditional newest-AI-message fallback)"],
    ["CD-5", "src/lib/visualization/conceptual/conceptualPipeline.ts", "conceptualCreateFlow L519\u2013521 (merged citations \u2192 prompt sources); finalizeConceptProvenance L94\u2013113; conceptOutcome L115\u2013137"],
    ["CD-5", "src/components/visualization/VisualizationContainer.tsx", "source chip + Sources & timestamps (L312\u2013335), SourceList"],
    ["CD-6", "src/lib/visualization/conceptual/modelBridge.ts", "normalizeConceptCandidate L291\u2013300 (http(s) filter only, no allowlist)"],
    ["CD-7", "src/lib/visualization/spec.ts + modelBridge.ts + renderer", "spec.ts L537 (`?? \u201Cdecision\u201D`); modelBridge.ts L208\u2013211 (force-type nodes[0]); renderer L306 (`?? \u201Coption\u201D`)"],
    ["CD-8", "src/lib/visualization/spec.ts", "validateDecisionKind (no duplicate/self-loop/cycle checks); conceptualPipeline.ts pruneConceptSpec L383\u2013413 (BFS over adjacency)"],
    ["Routing / context scope", "src/pages/ChatbotPage.tsx", "detectVisualizationIntent call L1697\u20131712; runVisualizationRequest L1531\u20131543; toPipelineMessages L1480\u20131491 (full session)"],
    ["Timestamp mechanism", "src/pages/ChatbotPage.tsx + src/components/chat/MessageBubble.tsx", "L1537 (new Date() stamp); L522\u2013524 (per-message time render)"],
  ],
  [14, 34, 52],
));

/* ============ Appendix B ============ */
bodyChildren.push(h1("Appendix B: Investigation Harness Composition"));
bodyChildren.push(body("The scratch harness (deleted after execution) contained one describe block per test case and imported only production modules — no production file was edited, and no schema was altered. Its 17 assertions are enumerated in Table 2; the fixture sessions were: (1) a USDT research exchange whose assistant message carries one researchData block (dataset \u201CUSDT reserve composition\u201D, one source URL) plus a matching citation; (2) a literature exchange (\u201CWho wrote the Divine Comedy?\u201D) with plain assistant text and no research artifacts; (3) two architecture decision-tree candidates (one well-formed, one with an isolated node) and two model responses for the end-to-end flow (one attaching the old USDT URL, one attaching a fabricated URL). The renderer assertion rendered ConceptualDiagramRenderer directly and compared SVG rect y-attributes."));
bodyChildren.push(body("Compliance statement: during the investigation the repository working tree was verified clean (git status: no modifications); the only artifacts created were the temporary harness file (removed) and this report, which lives outside the repository. No commits, pushes, schema edits or feature changes were made, and no claim of semantic correctness is based on rendered appearance alone."));

/* ---------------------------------------------------------------- */
/* Assembly — 3 sections (cover / TOC roman / body arabic)           */
/* ---------------------------------------------------------------- */
function pageFooter() {
  return new Footer({
    children: [new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ children: [PageNumber.CURRENT], size: 18, color: "808080", font: FONT })],
    })],
  });
}
function pageHeader() {
  return new Header({
    children: [new Paragraph({
      alignment: AlignmentType.RIGHT,
      children: [new TextRun({ text: "Research-to-Visualization Investigation \u2014 ShadowTalk AI", size: 18, color: "808080", font: FONT })],
    })],
  });
}

const coverConfig = {
  title: "Research-to-Visualization Investigation Report",
  subtitle: "Decision-tree generation: structural validity, context relevance and provenance trust",
  englishLabel: "ENGINEERING INVESTIGATION",
  metaLines: [
    "Component: ShadowTalk AI \u2014 Research-to-Visualization pipeline (Batch 1\u20133)",
    "Trigger: USDT exposure decision tree test screenshot (viz-8)",
    "Method: Static analysis + executed 17-assertion harness (cases A\u2013E)",
    "Constraints: Investigation only \u2014 no production code modified",
    "Date: November 13, 2026",
  ],
  footerLeft: "ShadowTalk AI \u2014 Engineering Investigation",
  footerRight: "Internal \u2014 Investigation Report",
  palette: P,
};

const doc = new Document({
  styles: {
    default: {
      document: {
        run: { font: FONT, size: 24, color: P.body },
        paragraph: { spacing: { line: 312 } },
      },
      heading1: {
        run: { font: FONT, size: 32, bold: true, color: P.primary },
        paragraph: { spacing: { before: 360, after: 160, line: 312 }, outlineLevel: 0 },
      },
      heading2: {
        run: { font: FONT, size: 28, bold: true, color: P.primary },
        paragraph: { spacing: { before: 240, after: 120, line: 312 }, outlineLevel: 1 },
      },
      heading3: {
        run: { font: FONT, size: 24, bold: true, color: P.primary },
        paragraph: { spacing: { before: 200, after: 100, line: 312 }, outlineLevel: 2 },
      },
    },
  },
  sections: [
    { /* Section 1: Cover — no page numbers, no footer */
      properties: {
        page: { size: { width: 11906, height: 16838 }, margin: { top: 0, bottom: 0, left: 0, right: 0 } },
      },
      children: buildCoverR1(coverConfig),
    },
    { /* Section 2: TOC — Roman numerals */
      properties: {
        type: SectionType.NEXT_PAGE,
        page: {
          size: { width: 11906, height: 16838 },
          margin: { top: 1440, bottom: 1440, left: 1701, right: 1417 },
          pageNumbers: { start: 1, formatType: NumberFormat.UPPER_ROMAN },
        },
      },
      footers: { default: pageFooter() },
      children: [
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 480, after: 360 },
          children: [new TextRun({ text: "Table of Contents", bold: true, size: 32, color: P.primary, font: FONT })],
        }),
        new TableOfContents("Table of Contents", { hyperlink: true, headingStyleRange: "1-3" }),
        new Paragraph({
          spacing: { before: 200 },
          children: [new TextRun({
            text: "Note: This Table of Contents is generated via field codes. To ensure page number accuracy after editing, please right-click the TOC and select \u201CUpdate Field.\u201D",
            italics: true, size: 18, color: "888888", font: FONT,
          })],
        }),
      ],
    },
    { /* Section 3: Body — Arabic numerals from 1 */
      properties: {
        type: SectionType.NEXT_PAGE,
        page: {
          size: { width: 11906, height: 16838 },
          margin: { top: 1440, bottom: 1440, left: 1701, right: 1417 },
          pageNumbers: { start: 1, formatType: NumberFormat.DECIMAL },
        },
      },
      headers: { default: pageHeader() },
      footers: { default: pageFooter() },
      children: bodyChildren,
    },
  ],
});

Packer.toBuffer(doc).then((buf) => {
  const out = "/home/z/my-project/download/ShadowTalk_ResearchToViz_Investigation_Report.docx";
  fs.writeFileSync(out, buf);
  console.log("written:", out, buf.length, "bytes");
});


