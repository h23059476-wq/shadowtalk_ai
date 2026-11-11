/**
 * Research-to-Visualization Batch 3 — prompts for AI-assisted conceptual
 * generation and refinement.
 *
 * Prompting rules (mirroring the security contract):
 *  - the model may ONLY return a JSON object matching the closed schema
 *    for the requested kind — never code, never HTML/SVG, never prose;
 *  - honesty rules are explicit: labels must come from the supplied
 *    research context or the conversation; missing information goes into
 *    `gaps`, never into invented labels; no numeric data values;
 *  - every prompt embeds the caps so the model cannot overflow them.
 */

import { SPEC_LIMITS } from "../spec";

const COMMON_RULES = `You design diagrams for a chat application. You return ONLY a JSON object — no prose, no markdown fences, no code, no HTML, no SVG, no script. The JSON must match the schema given below exactly.

HARD RULES:
1. Every label MUST come from the supplied research context or conversation. Do NOT invent named entities, products, organizations, dates or facts.
2. Information you cannot ground goes into the "gaps" string array, NEVER into labels.
3. Labels are PLAIN TEXT (max ${SPEC_LIMITS.maxLabelChars} chars). No markdown, no HTML, no URLs inside labels.
4. NO numeric data values. Conceptual diagrams describe structure, not measurements.
5. Keep the structure within the size caps given in the schema.
6. Use stable short ids (lowercase, letters/digits/hyphens, max 64 chars). Ids must be unique.
7. Set "title" (max ${SPEC_LIMITS.maxTitleChars} chars) and, when useful, "description" (max ${SPEC_LIMITS.maxDescriptionChars} chars).`;

export function conceptCreateSystemPrompt(): string {
  return `${COMMON_RULES}

OUTPUT SHAPE (all kinds share this envelope):
{
  "kind": "mindmap" | "roadmap" | "decision-tree" | "architecture" | "framework",
  "title": string,
  "description": string (optional),
  "gaps": string[] (what could not be grounded — required to be honest),
  "sources": [{ "url": string, "name": string (optional) }] (ONLY urls that were supplied to you),
  ... <one encoding below, keyed by kind>
}

KIND SCHEMAS:
- mindmap: { "kind":"mindmap", "layout":"radial"|"tree", "nodes":[{"id", "label", "parent" (omitted for the single root), "note" (optional, max ${SPEC_LIMITS.maxGapChars} chars)}] } — min 2 nodes, max ${SPEC_LIMITS.maxMindNodes}, branch depth max ${SPEC_LIMITS.maxMindDepth}, exactly one root.
- roadmap: { "kind":"roadmap", "phases":[{"id","label","timeframe" (optional, only when the context declares one), "items":[{"id","label","status":"planned"|"in-progress"|"done"|"at-risk" (optional), "note" (optional)}]}] } — max ${SPEC_LIMITS.maxRoadmapPhases} phases, max ${SPEC_LIMITS.maxRoadmapItemsPerPhase} items per phase.
- decision-tree: { "kind":"decision-tree", "nodes":[{"id","label","kind":"decision"|"option"|"outcome"}], "edges":[{"from","to","label" (the condition, e.g. "yes")} ] } — max ${SPEC_LIMITS.maxFlowNodes} nodes / ${SPEC_LIMITS.maxFlowEdges} edges; every node kind decision must have ≥2 outgoing edges with condition labels.
- architecture: { "kind":"architecture", "layers":[{"id","label","components":[{"id","label","note" (optional)}]}], "connections":[{"from" (component id),"to" (component id),"label" (optional)}] } — max ${SPEC_LIMITS.maxArchitectureLayers} layers, max ${SPEC_LIMITS.maxArchitectureComponentsPerLayer} components per layer, component ids unique across ALL layers.
- framework: { "kind":"framework", "layout":"quadrant"|"pillars", "sections":[{"id","label","tone":"positive"|"negative"|"neutral" (optional),"items":[string]}] } — 2..${SPEC_LIMITS.maxFrameworkSections} sections, max ${SPEC_LIMITS.maxFrameworkItemsPerSection} items per section.

Pick the kind that fits the request best unless one was specified. Return the JSON object only.`;
}

export function conceptCreateUserPrompt(input: {
  request: string;
  targetKind?: string;
  researchDigest: string;
  sources: Array<{ url: string; name?: string }>;
}): string {
  const lines: string[] = [];
  lines.push(`Request: ${input.request}`);
  if (input.targetKind) lines.push(`Required kind: "${input.targetKind}" (do not use another kind).`);
  lines.push("");
  lines.push("RESEARCH CONTEXT available to ground labels:");
  lines.push(input.researchDigest || "(no research captured in this conversation yet — only the request text itself is available; put anything you cannot ground into \"gaps\")");
  if (input.sources.length > 0) {
    lines.push("");
    lines.push("CITABLE SOURCES you may attach (do not add any other urls):");
    for (const s of input.sources.slice(0, SPEC_LIMITS.maxSources)) {
      lines.push(`- ${s.url}${s.name ? ` (${s.name})` : ""}`);
    }
  }
  lines.push("");
  lines.push("Return the JSON object only.");
  return lines.join("\n");
}

export function conceptEditSystemPrompt(): string {
  return `${COMMON_RULES}

You will receive the CURRENT diagram JSON plus a change instruction. Apply exactly the requested change, keep everything else as-is, and return the FULL edited JSON object in the same schema (same kind unless the instruction asks to convert to another supported kind). Preserve grounded labels; if the instruction would require information you do not have, put what is missing into "gaps" instead of inventing labels. Do not invent new named entities beyond what the instruction and context supply. Return the JSON object only.`;
}

export function conceptEditUserPrompt(input: {
  currentSpec: string;
  instruction: string;
  contextDigest: string;
}): string {
  return [
    "CURRENT DIAGRAM JSON:",
    input.currentSpec,
    "",
    "RESEARCH CONTEXT (for grounding any new labels):",
    input.contextDigest || "(none)",
    "",
    `CHANGE INSTRUCTION: ${input.instruction}`,
    "",
    "Return the full edited JSON object only.",
  ].join("\n");
}
