/**
 * Research-to-Visualization Batch 3 — conversational refinement ops.
 *
 * Classifies follow-up instructions on an EXISTING visualization
 * ("Make this more detailed.", "Add another branch.", "Turn this into a
 * decision tree.", …) into a small closed set of deterministic ops. The
 * pipeline then either executes the op deterministically (simplify,
 * explain-stages) or asks the model to author the edited spec JSON
 * (expand, add-branch, convert, dependencies, presentation) which is
 * re-validated like any other spec — the model never bypasses the gate.
 *
 * Precision beats recall here as well: ops are only classified when the
 * message clearly references the existing visualization.
 */

import type { VizSpecKind } from "../spec";

/** The closed set of conversational refinement ops. */
export type ConceptRefineOp =
  | "expand"
  | "add-branch"
  | "convert"
  | "dependencies"
  | "explain-stages"
  | "simplify"
  | "presentation";

export interface ConceptRefineOpResult {
  op: ConceptRefineOp;
  /** Target conceptual kind for "convert" ops. */
  targetKind?: VizSpecKind;
  /** What the user asked to add (e.g. "a branch about risks"). */
  subject?: string;
  /** Style qualifier from the request (e.g. "professional business"). */
  style?: string;
}

/** Convert/turn requests naming a conceptual diagram kind. */
const CONVERT_PATTERNS: Array<[VizSpecKind, RegExp]> = [
  ["decision-tree", /\bdecision\s+(?:tree|diagram|map)\b/i],
  ["mindmap", /\bmind\s?map\b/i],
  ["mindmap", /\b(?:hierarchy|org\s?chart|organigram|organizational\s+chart|tree\s+diagram)\b/i],
  ["roadmap", /\broadmap\b/i],
  ["roadmap", /\bproject\s+plan\b/i],
  ["architecture", /\barchitecture\s+(?:diagram|chart|view)\b/i],
  ["architecture", /\bsystem\s+(?:design|architecture)\b/i],
  ["framework", /\b(?:swot|strategic\s+framework|framework\s+diagram|quadrant)\b/i],
];

const DETAIL_HINT =
  /\b(?:it|this|that)\s+more\s+detailed\b|\b(?:elaborate)\b|\bexpand\s+(?:it|this|that|on\s+(?:it|this|that))\b|\bmore\s+detail\s+(?:on|about)\s+(?:it|this|that)\b/i;
const ADD_HINT =
  /\b(?:add|insert|include|append)\s+(?:(?:another|a\s+new|an\s+extra|one\s+more|a\s+few\s+more|a|an)\s+)?\s*(?:branch|node|step|phase|stage|section|item|element|task|pillar|component)s?\b/i;
const DEPENDENCIES_HINT =
  /\b(?:show|add|highlight|display|draw|mark|visuali[sz]e)\b[^.?!]{0,30}?\b(?:dependencies?|connections?|links?|relationships?|arrows?)\b|\b(?:dependencies?|connections?|links?|relationships?)\s+between\b/i;
const EXPLAIN_STAGES_HINT =
  /\b(?:explain|describe|walk\s+me\s+through|clarify)\s+(?:every|each|all|the)\s+(?:stage|step|phase|node|branch|part|section)/i;
const SIMPLIFY_HINT =
  /\bsimplif(?:y|i(?:ed|er))\b|\b(?:it|this|that)\s+(?:simpler|easier)\b|\b(?:simpler|easier)\s+(?:version|form|view)\b|\bbeginner[- ]friendly\b|\btoo\s+complex\b|\btl;?dr\b/i;
const PRESENTATION_HINT =
  /\bpresentation(?:-|\s+)?style\b|\bfor\s+a\s+presentation\b|\b(?:board|exec|executive)\s+(?:ready|style|summary)\b|\bslide\s+(?:ready|style)\b/i;

/** Extract what was asked to be added ("add a branch about regulatory risk"). */
function extractSubject(text: string): string | undefined {
  const m =
    text.match(/\b(?:add|insert|include|append)\b[^.?!]{0,60}?\b(?:about|for|on|covering|regarding|with)\s+([^..?!]{3,80})/i);
  const subject = m?.[1]?.trim().replace(/[.?!]+$/, "");
  return subject && subject.length > 2 ? subject : undefined;
}

/** Style qualifier for convert ops ("professional business roadmap"). */
function extractStyle(text: string): string | undefined {
  const m = text.match(
    /\b((?:professional|business|executive|technical|simple|beginner[- ]friendly|investor|product|marketing)\s+(?:\w+\s+)?)(?:roadmap|mind\s?map|decision\s+(?:tree|diagram)|architecture|framework|diagram)/i,
  );
  return m?.[1]?.trim() || undefined;
}

/**
 * Classify a user message that ALREADY passed intent detection as a
 * refinement. Returns null when the message is not a recognized
 * conceptual op (Batch 2 refine paths then handle it).
 */
export function detectConceptRefineOp(text: string): ConceptRefineOpResult | null {
  const input = text?.trim();
  if (!input || input.length > 500) return null;

  // Convert ops are the most specific — check first.
  for (const [kind, re] of CONVERT_PATTERNS) {
    if (re.test(input)) {
      const convertVerb = /\b(?:turn|convert|transform|make|change|switch|render|present|redraw|show)\b/i.test(input);
      if (convertVerb) {
        return {
          op: "convert",
          targetKind: kind,
          ...(extractStyle(input) ? { style: extractStyle(input) } : {}),
        };
      }
    }
  }

  if (DETAIL_HINT.test(input)) return { op: "expand" };
  if (ADD_HINT.test(input)) {
    return { op: "add-branch", ...(extractSubject(input) ? { subject: extractSubject(input) } : {}) };
  }
  if (DEPENDENCIES_HINT.test(input)) return { op: "dependencies" };
  if (EXPLAIN_STAGES_HINT.test(input)) return { op: "explain-stages" };
  if (SIMPLIFY_HINT.test(input)) return { op: "simplify" };
  if (PRESENTATION_HINT.test(input)) return { op: "presentation" };

  return null;
}

/** Human label for the op (assistant text). */
export function describeOp(op: ConceptRefineOp): string {
  switch (op) {
    case "expand": return "expanding with more detail";
    case "add-branch": return "adding the requested branch";
    case "convert": return "converting the diagram";
    case "dependencies": return "showing dependencies";
    case "explain-stages": return "explaining every stage";
    case "simplify": return "simplifying";
    case "presentation": return "restyling for a presentation";
  }
}
