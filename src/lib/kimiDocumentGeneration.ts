import { turboComplete } from "@/lib/turbo/turboEngine";
/**
 * Kimi-style long-form document generation for ShadowTalk.
 * Publication-quality markdown, TOC, tables, citations.
 */

import {
  PROFESSIONAL_DOCUMENT_STANDARDS,
  polishProfessionalMarkdown,
} from "./professionalDocument";
import { exportWorldClassWordDoc } from "./worldClassDocumentExport";
import { stringifyChatBody } from "@/lib/chatRequest";

export type KimiDocumentType =
  | "article" | "email" | "report" | "proposal" | "blog" | "resume" | "letter"
  | "book_extract" | "case_study" | "whitepaper" | "sop" | "creative_story"
  | "essay" | "memo" | "press_release" | "business_plan" | "thesis" | "contract";

export type KimiToneType =
  | "professional" | "casual" | "academic" | "persuasive" | "creative";

export type KimiLengthType =
  | "brief" | "short" | "medium" | "long" | "comprehensive" | "epic";

export const KIMI_DOCUMENT_TYPES: { type: KimiDocumentType; label: string }[] = [
  { type: "article", label: "Article" },
  { type: "email", label: "Email" },
  { type: "report", label: "Report" },
  { type: "proposal", label: "Proposal" },
  { type: "blog", label: "Blog Post" },
  { type: "resume", label: "Resume / CV" },
  { type: "letter", label: "Formal Letter" },
  { type: "essay", label: "Essay" },
  { type: "memo", label: "Memo" },
  { type: "press_release", label: "Press Release" },
  { type: "whitepaper", label: "Whitepaper" },
  { type: "case_study", label: "Case Study" },
  { type: "business_plan", label: "Business Plan" },
  { type: "book_extract", label: "Book Chapter" },
  { type: "thesis", label: "Research / Thesis" },
  { type: "sop", label: "SOP / Guide" },
  { type: "contract", label: "Contract Draft" },
  { type: "creative_story", label: "Creative Story" },
];

export const KIMI_LENGTHS: { value: KimiLengthType; label: string; words: string }[] = [
  { value: "brief", label: "Brief", words: "~150 words" },
  { value: "short", label: "Short", words: "~500 words" },
  { value: "medium", label: "Standard", words: "~1,500 words" },
  { value: "long", label: "Long", words: "~3,500 words" },
  { value: "comprehensive", label: "Comprehensive", words: "~6,000 words" },
  { value: "epic", label: "Epic", words: "up to ~10,000 words" },
];

const LENGTH_GUIDE: Record<KimiLengthType, string> = {
  brief: "Approximately 150 words.",
  short: "Approximately 500 words.",
  medium: "Approximately 1,500 words with TOC and 4–6 sections.",
  long: "Approximately 3,500 words with tables and references.",
  comprehensive: "Approximately 6,000 words — board-ready, fully structured.",
  epic: "Up to 10,000 words — exhaustive but still tight prose (no filler paragraphs).",
};

const toneGuide = {
  professional: "formal business English. Neutral, authoritative, client-ready.",
  casual: "clear and approachable but still polished — no slang.",
  academic: "scholarly register with formal structure and references.",
  persuasive: "evidence-led argumentation with explicit recommendations.",
  creative: "literary quality permitted; still clean formatting.",
} as const;

export function getKimiDocumentSystemPrompt(
  type: KimiDocumentType,
  tone: KimiToneType,
  length: KimiLengthType
): string {
  const typeGuide = {
    article: "Lead with a sharp angle, support with specific evidence, avoid overview fluff, end with a clear takeaway.",
    email: "Use urgent-but-polite subject framing, tight bullets, scannable paragraphs, and exactly one clear next step.",
    report: "Start with conclusion-first executive summary, use numbered findings, back claims with specifics, avoid filler.",
    proposal: "Pricing/problem-value framing first, then narrow scope, exact timeline, investment, and concrete next steps.",
    blog: "Front thesis in paragraph 1, use short subheads, concrete examples, no AI voice markers.",
    resume: "Quantified achievements first, remove vague duties, use impact verbs, keep one page if brief.",
    letter: "Respect the format; keep paragraphs short, state intent early, close with a single ask.",
    book_extract: "Scene-driven prose, sensory detail, character action; avoid exposition dumps.",
    case_study: "Show impact with client/challenge/solution/outcome structure; include metrics.",
    whitepaper: "Abstract, then methodical argument with cited evidence, tables, and defensible conclusion.",
    sop: "Bullet steps first, then detailed workflow, checklists, edge cases, definition section.",
    creative_story: "Active voice, specific imagery, rising tension; remove generic descriptions.",
    essay: "Debatable thesis, layered argument, counterpoint, synthesis; no dictionary definitions.",
    memo: "Bottom-line-up-front, context, explicit ask, and owner/deadline.",
    press_release: "Newsroom style: headline, subhead, dateline, quote, boilerplate, contact.",
    business_plan: "Specific revenue model, startup costs, CAC, unit economics, GTM timeline, risks.",
    thesis: "Research question, methodology, results, discussion; keep writing academic but readable.",
    contract: "Parties, recitals, numbered terms, defined terms, signature blocks.",
  } as const;

  const lengthGuide = {
    brief: "Write ~150 words. No fluff.",
    short: "~500 words. One short section per required heading.",
    medium: "~1,500 words with concise sections.",
    long: "~3,500 words with examples, tables if useful, explicit references.",
    comprehensive: "~6,000 words board-ready. Tight argument, no repetition.",
    epic: "~10,000 words maximum. Exhaustive but still high-signal. Remove filler aggressively.",
  } as const;

  return `You are a senior document specialist. This draft must pass publication review without rewrites.

RULES
- Output ONLY the finished document. No chat preface, no meta commentary.
- Write ${toneGuide[tone] || 'in a clear professional style.'}
- Use ${lengthGuide[length]}.
- Exactly one H1 title. Use H2/H3 only where genuinely needed.
- Paragraphs must advance the argument; delete throat-clearing and repetition.
- For ${type}: ${typeGuide[type] || 'Use clear headings, scannable sections, and a strong conclusion.'}

FORBIDDEN
- Opening filler: "Sure!", "Here is", "I'd be happy to", "Below is"
- Emojis, hashtags, exclamation marks unless sourced from user material
- Meta commentary about AI/assistant
- Placeholder text: [TBD], [Insert], lorem ipsum, generic company names
- Random bolding of full sentences

OUTPUT
- Final Markdown only.
- If references/citations are used, include a ## References section.`;
}

export function inferDocumentTypeFromMessage(message: string): KimiDocumentType | undefined {
  const m = message.toLowerCase();
  if (/\b(email|e-mail)\b/.test(m)) return "email";
  if (/\b(resume|cv)\b/.test(m)) return "resume";
  if (/\bwhitepaper\b/.test(m)) return "whitepaper";
  if (/\bcase\s*study\b/.test(m)) return "case_study";
  if (/\bbusiness\s*plan\b/.test(m)) return "business_plan";
  if (/\bpress\s*release\b/.test(m)) return "press_release";
  if (/\bproposal\b/.test(m)) return "proposal";
  if (/\breport\b/.test(m)) return "report";
  if (/\bletter\b/.test(m)) return "letter";
  if (/\bblog\b/.test(m)) return "blog";
  if (/\b(thesis|dissertation|research\s+paper)\b/.test(m)) return "thesis";
  if (/\bessay\b/.test(m)) return "essay";
  if (/\b(book|chapter)\b/.test(m)) return "book_extract";
  if (/\b(story|fiction|novel)\b/.test(m)) return "creative_story";
  if (/\bmemo\b/.test(m)) return "memo";
  if (/\bsop\b/.test(m)) return "sop";
  if (/\bcontract\b/.test(m)) return "contract";
  if (/\barticle\b/.test(m)) return "article";
  return undefined;
}

export function extractDocumentTopic(message: string): string {
  return message
    .replace(/^(?:please\s+)?(?:write|create|generate|draft|compose|make)\s+(?:me\s+)?(?:a\s+|an\s+)?(?:professional\s+)?(?:\w+\s+){0,5}(?:document|doc|article|email|letter|report|proposal|whitepaper|essay|memo|plan)\s*(?:about|for|on|regarding)?\s*/i, "")
    .trim() || message;
}


export interface StreamDocumentOptions {
  topic: string;
  docType: KimiDocumentType;
  tone: KimiToneType;
  length: KimiLengthType;
  additionalContext?: string;
  accessToken?: string | null;
  onChunk: (content: string) => void;
  signal?: AbortSignal;
}

export async function streamKimiDocument(options: StreamDocumentOptions): Promise<string> {
  const { topic, docType, tone, length, additionalContext, onChunk, signal } = options;

  const label = KIMI_DOCUMENT_TYPES.find((d) => d.type === docType)?.label ?? "Document";
  const userPrompt = `Produce a publication-ready ${label} for executive review.

Topic: ${topic}
${additionalContext ? `\nRequirements:\n${additionalContext}` : ""}

The output must be clean Markdown only — suitable for immediate export to Word or PDF.`;

  const result = await turboComplete(
    `You are a professional document writer. Tone: ${tone}. Length: ${length}.`,
    userPrompt,
    {
      signal,
      onDelta: onChunk ? (accumulated) => onChunk(accumulated) : undefined,
    }
  );

  return result.content || "";
}

export function downloadAsWordDoc(markdown: string, filename: string): void {
  exportWorldClassWordDoc(markdown, filename);
}


