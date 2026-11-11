/**
 * Unified document pipeline — Kimi Office output + Manus agent workflow.
 *
 * Kimi: typed long-form docs, professional formatting, Word/PDF export.
 * Manus: plan → research → draft → polish → deliver with reusable project context.
 */

import {
  streamKimiDocument,
  type KimiDocumentType,
  type KimiLengthType,
  type KimiToneType,
} from "@/lib/kimiDocumentGeneration";
import { stringifyChatBody } from "@/lib/chatRequest";
import { upsertDocumentProjectFromRun } from "@/lib/documentForgeProjects";
import { polishProfessionalMarkdown } from "@/lib/professionalDocument";
import {
  turboComplete,
  turboDocumentPrompt,
  turboDocumentUserContent,
} from "@/lib/turbo";

export type DocumentPipelinePhase =
  | "idle"
  | "planning"
  | "researching"
  | "drafting"
  | "polishing"
  | "done"
  | "error";

export interface UnifiedDocumentRequest {
  topic: string;
  docType: KimiDocumentType;
  tone: KimiToneType;
  length: KimiLengthType;
  audience?: string;
  additionalContext?: string;
  /** Manus-style evidence gathering before draft */
  enableResearch?: boolean;
  accessToken?: string | null;
  signal?: AbortSignal;
}

export interface UnifiedDocumentPlan {
  topic: string;
  docType: KimiDocumentType;
  tone: KimiToneType;
  length: KimiLengthType;
  audience: string;
  enableResearch: boolean;
  sections: string[];
}

export interface UnifiedDocumentResult {
  content: string;
  plan: UnifiedDocumentPlan;
  researchBrief?: string;
  wordCount: number;
}

const RESEARCH_DOC_TYPES = new Set<KimiDocumentType>([
  "report",
  "whitepaper",
  "case_study",
  "thesis",
  "business_plan",
  "proposal",
]);

const LONG_LENGTHS = new Set<KimiLengthType>(["long", "comprehensive", "epic"]);

const DEFAULT_SECTIONS: Record<KimiDocumentType, string[]> = {
  article: ["Introduction", "Main analysis", "Conclusion"],
  email: ["Subject", "Body", "Action items", "Sign-off"],
  report: ["Executive Summary", "Key Findings", "Analysis", "Recommendations", "Conclusion"],
  proposal: ["Overview", "Scope", "Approach", "Timeline", "Investment", "Next Steps"],
  blog: ["Hook", "Core sections", "CTA"],
  resume: ["Summary", "Experience", "Education", "Skills"],
  letter: ["Header", "Body", "Closing"],
  book_extract: ["Opening", "Development", "Closing beat"],
  case_study: ["Client", "Challenge", "Solution", "Outcomes"],
  whitepaper: ["Abstract", "Introduction", "Analysis", "Findings", "Recommendations", "References"],
  sop: ["Purpose", "Scope", "Procedure", "Checklist"],
  creative_story: ["Setup", "Rising action", "Climax", "Resolution"],
  essay: ["Thesis", "Arguments", "Counterpoint", "Synthesis"],
  memo: ["Summary", "Details", "Action requested"],
  press_release: ["Headline", "Lead", "Quotes", "Boilerplate"],
  business_plan: ["Executive Summary", "Market", "Model", "Financials", "GTM"],
  thesis: ["Abstract", "Literature Review", "Methodology", "Results", "Discussion", "References"],
  contract: ["Parties", "Recitals", "Terms", "Signatures"],
};

export function shouldEnableResearch(
  docType: KimiDocumentType,
  length: KimiLengthType,
  explicit?: boolean,
): boolean {
  if (explicit === false) return false;
  if (explicit === true) return true;
  return RESEARCH_DOC_TYPES.has(docType) || LONG_LENGTHS.has(length);
}

export function buildDocumentPlan(request: UnifiedDocumentRequest): UnifiedDocumentPlan {
  const audience = request.audience?.trim() || "Executive stakeholders";
  return {
    topic: request.topic.trim(),
    docType: request.docType,
    tone: request.tone,
    length: request.length,
    audience,
    enableResearch: shouldEnableResearch(
      request.docType,
      request.length,
      request.enableResearch,
    ),
    sections: DEFAULT_SECTIONS[request.docType] ?? DEFAULT_SECTIONS.report,
  };
}

async function collectSseContent(response: Response, onChunk?: (text: string) => void): Promise<string> {
  const reader = response.body?.getReader();
  const decoder = new TextDecoder();
  let content = "";

  while (reader) {
    const { done, value } = await reader.read();
    if (done) break;
    const chunk = decoder.decode(value, { stream: true });
    for (const line of chunk.split("\n")) {
      if (!line.startsWith("data: ") || line === "data: [DONE]") continue;
      try {
        const data = JSON.parse(line.slice(6));
        const text = data.choices?.[0]?.delta?.content ?? data.choices?.[0]?.message?.content;
        if (text) {
          content += text;
          onChunk?.(content);
        }
      } catch {
        /* partial SSE */
      }
    }
  }

  return content;
}

/** Manus-style research phase — gather cited evidence before drafting. */
export async function fetchDocumentResearch(
  query: string,
  accessToken: string | null | undefined,
  options?: { signal?: AbortSignal; onChunk?: (text: string) => void },
): Promise<string> {
  const result = await turboComplete(
    "You are a deep research agent. Provide a cited research brief with references.",
    query.slice(0, 500),
    {
      signal: options?.signal,
      onDelta: options?.onChunk ? (accumulated) => options.onChunk!(accumulated) : undefined,
    }
  );
  return result.content || "";
}

function buildDraftContext(
  plan: UnifiedDocumentPlan,
  additionalContext?: string,
  researchBrief?: string,
): string {
  const parts = [
    `Audience: ${plan.audience}`,
    `Planned sections: ${plan.sections.join(" → ")}`,
  ];
  if (additionalContext?.trim()) parts.push(`Requirements:\n${additionalContext.trim()}`);
  if (researchBrief?.trim()) {
    parts.push(
      `## Research evidence (cite with [n] where used; include ## References when citing)\n${researchBrief.trim()}`,
    );
  }
  return parts.join("\n\n");
}

export interface RunUnifiedDocumentPipelineOptions extends UnifiedDocumentRequest {
  onPhase?: (phase: DocumentPipelinePhase) => void;
  onChunk?: (content: string) => void;
  onResearchChunk?: (content: string) => void;
}

/**
 * Full Kimi + Manus document pipeline:
 * plan → (optional) research → draft → polish → save project
 */
export async function runUnifiedDocumentPipeline(
  options: RunUnifiedDocumentPipelineOptions,
): Promise<UnifiedDocumentResult> {
  const { onPhase, onChunk, onResearchChunk, signal, accessToken, ...request } = options;

  onPhase?.("planning");
  const plan = buildDocumentPlan(request);

  onPhase?.("researching");
  const researchQuery = `${plan.topic} — ${plan.docType} for ${plan.audience}`;
  const researchBrief = plan.enableResearch
    ? await fetchDocumentResearch(researchQuery, accessToken, { signal, onChunk: onResearchChunk })
    : undefined;

  onPhase?.("drafting");
  const draftContext = buildDraftContext(plan, request.additionalContext, researchBrief);

  // ---- TURBO FAST PATH ----
  // Direct Groq call for drafting (~2-4s faster than edge function)
  let content: string | undefined;
  try {
    const turboResult = await turboComplete(
      turboDocumentPrompt(plan.docType, plan.tone, plan.length, plan.audience),
      turboDocumentUserContent(plan.topic, plan.sections, request.additionalContext, researchBrief),
      {
        signal,
        onDelta: onChunk,
        maxTokens: plan.length === 'epic' ? 8192 : plan.length === 'comprehensive' ? 6000 : 4096,
        temperature: plan.tone === 'creative' ? 0.7 : 0.5,
      },
    );
    if (turboResult.content) {
      content = turboResult.content;
      console.log('[forge] draft via Turbo', turboResult.source, `${turboResult.totalMs?.toFixed(0)}ms`);
    }
  } catch (turboErr) {
    console.warn('[forge] Turbo draft failed, falling back to standard path', turboErr);
  }

  // ---- STANDARD PATH ----
  const draft = (ctx: string) => streamKimiDocument({
    topic: plan.topic,
    docType: plan.docType,
    tone: plan.tone,
    length: plan.length,
    additionalContext: ctx,
    signal,
    accessToken,
    onChunk,
  });

  if (!content) {
    content = await draft(draftContext);
  }

  let finalContent = content;
  const words = content.split(/\s+/).filter(Boolean).length;
  const minWords = plan.length === "brief" ? 100 : plan.length === "short" ? 350 : 900;
  if (words < minWords && !signal?.aborted) {
    const redraftContext = `${draftContext}\n\nReturn a complete deliverable only with no prefacing text.`;
    try {
      const second = await streamKimiDocument({
        topic: plan.topic,
        docType: plan.docType,
        tone: plan.tone,
        length: plan.length,
        additionalContext: redraftContext,
        signal,
        accessToken,
        onChunk: () => {},
      });
      if (second.split(/\s+/).filter(Boolean).length > words) {
        finalContent = second;
      }
    } catch {
      // Redraft failed — keep original content
    }
  }

  const polished = polishProfessionalMarkdown(finalContent, { tone: plan.tone });
  onChunk(polished);

  await upsertDocumentProjectFromRun({
    topic: plan.topic,
    docType: plan.docType,
    tone: plan.tone,
    length: plan.length,
    audience: plan.audience,
    standards: request.additionalContext,
    enableResearch: plan.enableResearch,
  });

  return {
    content: polished,
    plan,
    researchBrief,
    wordCount: polished.split(/\s+/).filter(Boolean).length,
  };
}
