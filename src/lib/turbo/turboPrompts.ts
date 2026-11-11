/**
 * ShadowTalk-Turbo Prompts — Minimal system prompts for forge/execute.
 *
 * These replace the ~2500-token edge function system prompts with
 * focused ~150-300 token prompts. Every token saved = faster TTFB.
 */

import type { KimiDocumentType, KimiToneType, KimiLengthType } from '@/lib/kimiDocumentGeneration';
import type { DeliverableType } from '@/lib/execution/types';

// ---- Execute Prompts ----

/**
 * System prompt for execution plan generation.
 * ~150 tokens — just enough for the planner to output valid JSON.
 */
export function turboPlannerPrompt(goal: string, type: DeliverableType): string {
  const typeRules =
    type === 'strategy_report'
      ? `Deliverable: STRATEGY REPORT. Use web_search for competitors/pricing, deep_research for market/TAM, end with synthesis. 4-6 steps.`
      : type === 'research_brief'
        ? `Deliverable: RESEARCH BRIEF with citations. Prefer deep_research and web_search. End with synthesis.`
        : `Deliverable: ${type}. Use real tools. End with synthesis.`;

  return `You are the S.E.E. planner. Break this goal into 4-8 concrete steps.

Goal: ${goal}

${typeRules}

Tools: web_search, deep_research, web_scrape, synthesis, general, security_audit.

Return ONLY a JSON array. Each object:
- "action": specific imperative step
- "tool_name": one of the tools above
- "tool_params": optional { "query": "..." } or { "url": "..." }
- "requires_approval": false unless sending email

No vague steps. Include 2026 in queries when relevant.`;
}

/**
 * System prompt for deliverable synthesis (non-strategy types).
 * ~120 tokens — focused on compiling step outputs into a polished deliverable.
 */
export function turboSynthesisPrompt(goal: string, briefType: string): string {
  return `You are ShadowTalk's synthesis engine. Compile the research below into a polished ${briefType}.

Goal: ${goal}

Rules:
- Use citations (URLs) from the research when available
- No placeholders or [TBD] markers
- Structured markdown with headers, bullets, and tables where appropriate
- Be comprehensive but concise — every sentence must add value
- Current year: 2026`;
}

// ---- Forge Prompts ----

/**
 * System prompt for document drafting via Turbo.
 * ~200 tokens — replaces the full Kimi system prompt for the drafting phase.
 */
export function turboDocumentPrompt(
  docType: KimiDocumentType,
  tone: KimiToneType,
  length: KimiLengthType,
  audience: string,
): string {
  const lengthGuide: Record<KimiLengthType, string> = {
    brief: '150 words.',
    short: '500 words.',
    medium: '1,500 words with 4-6 sections and a table of contents.',
    long: '3,500 words with tables, data, and references.',
    comprehensive: '6,000 words — board-ready, fully structured.',
    epic: 'Up to 10,000 words — exhaustive but tight prose.',
  };

  const toneGuide: Record<KimiToneType, string> = {
    professional: 'formal business English. Neutral, authoritative, client-ready.',
    casual: 'clear and approachable but polished.',
    academic: 'scholarly register with formal structure and references.',
    persuasive: 'evidence-led argumentation with explicit recommendations.',
    creative: 'literary quality permitted; still clean formatting.',
  };

  return `You are ShadowTalk's document forge. Write a ${docType} in ${toneGuide[tone]}

Audience: ${audience}
Target length: ${lengthGuide[length]}
Type: ${docType}

Formatting rules:
- Start with the title as a top-level heading (# Title)
- For medium+, include a ## Table of Contents
- Use ## for main sections, ### for subsections
- Use bold for key terms, bullet points for lists
- Include at least one table where data supports it
- For reports/whitepapers: cite sources as [1], [2] and add ## References section
- No preamble like "Here is your document" — start directly with the title
- Use markdown formatting throughout (headers, bold, italic, code blocks, tables)
- No filler paragraphs. Every sentence must deliver value.
- Current year: 2026`;
}

/**
 * Build the user content for document drafting.
 * Combines topic, sections, research evidence, and additional context.
 */
export function turboDocumentUserContent(
  topic: string,
  sections: string[],
  additionalContext?: string,
  researchBrief?: string,
): string {
  const parts = [`Topic: ${topic}`];

  if (sections.length > 0) {
    parts.push(`Sections to cover: ${sections.join(' → ')}`);
  }

  if (researchBrief?.trim()) {
    parts.push(
      `## Research evidence (cite with [n] where used; include ## References when citing)\n${researchBrief.trim()}`,
    );
  }

  if (additionalContext?.trim()) {
    parts.push(`Additional requirements:\n${additionalContext.trim()}`);
  }

  parts.push('Write the complete document now. Start with the title heading.');

  return parts.join('\n\n');
}
