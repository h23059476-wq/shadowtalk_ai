/**
 * Research-to-Visualization Batch 3 — AI-assisted conceptual pipeline.
 *
 * Complete workflow implemented here:
 *   Research → Evidence extraction (contextResolver, Batch 1) →
 *   Gap detection (assessGaps) → Additional research if necessary
 *   (injected research call, provider-backed, cited) → Visualization
 *   planning (deterministic builders first, then model-authored JSON) →
 *   Schema validation (validateConceptCandidate → closed spec gate) →
 *   Rendering (trusted renderers) → Conversational refinement
 *   (detectConceptRefineOp + model-edited specs, re-validated).
 *
 * Honesty rules enforced on every path:
 *  - deterministic structured data wins over model synthesis;
 *  - missing evidence is fetched by research or REPORTED, never invented;
 *  - a conceptual spec with no citable sources is "unverified" (D3);
 *  - every model output passes the full closed validation gate.
 *
 * The module stays free of React/Firebase: the model and research calls
 * are injected by ChatbotPage (BYOK-only, user-selected provider/model).
 */

import type { Citation, ResolverMessage, VizIntent } from "../types";
import { conceptualHintToKind } from "../types";
import { resolveResearchContext } from "../contextResolver";
import {
  isConceptualKind,
  parseVisualizationSpec,
  SPEC_LIMITS,
  validateVisualizationSpec,
  vizSpecId,
  type VizSpecKind,
  type VisualizationSpec,
} from "../spec";
import { escapeDollarsForMarkdown } from "../explain";
import type { PipelineMessage, VisualizationOutcome } from "../chatPipeline";
import {
  assessGaps,
  buildConceptFromDatasets,
  buildContextDigest,
  formatDigestForPrompt,
} from "./gapAnalysis";
import {
  extractJsonCandidate,
  validateConceptCandidate,
  type ConceptModelCall,
  type ConceptResearchCall,
} from "./modelBridge";
import {
  conceptCreateSystemPrompt,
  conceptCreateUserPrompt,
  conceptEditSystemPrompt,
  conceptEditUserPrompt,
} from "./prompts";
import { detectConceptRefineOp, type ConceptRefineOpResult } from "./refineOps";
import { explainConceptual } from "./conceptExplain";

/* ------------------------------------------------------------------ */
/* Session shape                                                       */
/* ------------------------------------------------------------------ */

export interface ConceptualPipelineInput {
  intent: VizIntent;
  request: string;
  messages: PipelineMessage[];
  /** BYOK model completion (absent → honest degradation, see below). */
  model?: ConceptModelCall;
  /** Provider-backed research call (web search with citations). */
  research?: ConceptResearchCall;
  now?: Date;
}

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

function textMessage(content: string): VisualizationOutcome {
  return { kind: "text", content: escapeDollarsForMarkdown(content) };
}

/** Citations of a spec as message-level source chips. */
function specCitations(spec: VisualizationSpec): Citation[] {
  return spec.sources.map((s) => ({ url: s.url, ...(s.name ? { title: s.name } : {}) }));
}

/**
 * Provenance policy for conceptual specs (D3):
 *  - sources attached → "ai-extracted" (the model synthesized structure
 *    from cited material — labelled, never passed off as provider data);
 *  - no sources → "unverified" + explicit gap note.
 * A synthesis note is always added so the card never presents model
 * structure as provider-verified data.
 */
function finalizeConceptProvenance(spec: VisualizationSpec, extraGaps: string[] = []): VisualizationSpec {
  const gaps = [...spec.gaps, ...extraGaps];
  const synthesisNote =
    "Diagram structure synthesized by the model from the research context — verify labels against the attached sources.";
  let next: VisualizationSpec;
  if (spec.sources.length === 0) {
    if (!gaps.some((g) => g.toLowerCase().includes("unverified"))) {
      gaps.push("No citable sources were available for this diagram (unverified).");
    }
    next = { ...spec, provenance: "unverified" };
  } else {
    if (!gaps.includes(synthesisNote)) gaps.push(synthesisNote);
    next = { ...spec, provenance: "ai-extracted" };
  }
  return {
    ...next,
    id: vizSpecId(next.kind.split("-")[0]),
    gaps: gaps.slice(-SPEC_LIMITS.maxGaps),
  };
}

function conceptOutcome(spec: VisualizationSpec, notes: string[], extra?: string): VisualizationOutcome {
  const lines: string[] = [];
  lines.push(`Here is **${spec.title}** — a ${spec.kind.replace("-", " ")} diagram.`);
  const provenancePhrase =
    spec.provenance === "source-verified"
      ? "built from structured research data in this conversation"
      : spec.provenance === "ai-extracted"
        ? "synthesized by the model from the attached sources (labelled ai-extracted)"
        : "unverified — no citable sources were available (treat labels as indicative)";
  lines.push(`Provenance: ${provenancePhrase}.`);
  if (spec.sources.length > 0) {
    lines.push(`${spec.sources.length} source${spec.sources.length === 1 ? "" : "s"} attached — open **Expand → Sources & timestamps** to inspect them.`);
  }
  for (const note of notes.slice(0, 3)) lines.push(`> ${note}`);
  lines.push(`Ask follow-ups like **"make it more detailed"**, **"add another branch"**, **"turn this into a decision tree"** or **"simplify this for beginners"**.`);
  if (extra) lines.push(extra);
  return {
    kind: "spec",
    content: escapeDollarsForMarkdown(lines.join("\n\n")),
    spec,
    citations: specCitations(spec),
  };
}

/** Most recent spec, optionally preferring one whose kind is named in the request. */
export function resolveReferencedSpec(messages: PipelineMessage[], request: string): VisualizationSpec | null {
  const all: VisualizationSpec[] = [];
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    const m = messages[i];
    if (m.type !== "ai" || !m.visualization) continue;
    const spec = parseVisualizationSpec(m.visualization);
    if (spec) all.push(spec);
  }
  if (all.length === 0) return null;
  const kindName = request.match(/\b(mind\s?map|roadmap|decision\s?tree|architecture|framework|swot|org\s?chart|hierarchy)\b/i);
  if (kindName) {
    const named = kindName[1].toLowerCase();
    const matches = all.find((s) => {
      switch (s.kind) {
        case "mindmap": return /mind\s?map|hierarchy|org\s?chart/.test(named);
        case "roadmap": return /roadmap/.test(named);
        case "decision-tree": return /decision\s?tree/.test(named);
        case "architecture": return /architecture/.test(named);
        case "framework": return /framework|swot/.test(named);
        default: return false;
      }
    });
    if (matches) return matches;
  }
  return all[0];
}

/* ------------------------------------------------------------------ */
/* Model-assisted generation                                           */
/* ------------------------------------------------------------------ */

const MODEL_UNAVAILABLE_TEXT =
  "AI-assisted diagram generation needs your own API key (BYOK). Add a key in Settings → Personalization → BYOK — or, if you're offline, reconnect and try again. I won't generate a diagram from guesses to work around this.";

const MAX_CANDIDATE_TOKENS = 2000;

async function generateConceptSpec(
  input: ConceptualPipelineInput,
  targetKind: VizSpecKind | undefined,
  digestText: string,
  sources: Array<{ url: string; name?: string }>,
): Promise<{ status: "ok"; spec: VisualizationSpec; notes: string[] } | { status: "failed"; reason: string }> {
  if (!input.model) return { status: "failed", reason: MODEL_UNAVAILABLE_TEXT };
  const now = input.now ?? new Date();

  const call = async (userPrompt: string): Promise<unknown | null> => {
    const res = await input.model!({
      system: conceptCreateSystemPrompt(),
      user: userPrompt,
      maxTokens: MAX_CANDIDATE_TOKENS,
      structuredOutput: true,
    });
    if (!res.content) return null;
    return extractJsonCandidate(res.content);
  };

  const userPrompt = conceptCreateUserPrompt({
    request: input.request,
    ...(targetKind ? { targetKind } : {}),
    researchDigest: digestText,
    sources,
  });

  let raw: unknown = null;
  try {
    raw = await call(userPrompt);
  } catch (err) {
    return {
      status: "failed",
      reason: `The model call failed: ${err instanceof Error ? err.message : String(err)}. No diagram was generated.`,
    };
  }
  if (raw === null) {
    return { status: "failed", reason: "The model did not return a usable JSON diagram. Nothing was rendered rather than guessing." };
  }

  let validation = validateConceptCandidate(raw, { targetKind, generatedAt: now.toISOString() });
  if (!validation.ok) {
    // One repair round with the exact validation errors.
    const repairPrompt = [
      userPrompt,
      "",
      "Your previous JSON failed validation with these errors:",
      ...validation.errors.slice(0, 8).map((e) => `- ${e}`),
      "",
      "Fix the JSON so it satisfies the schema and return the corrected JSON object only.",
    ].join("\n");
    try {
      raw = await call(repairPrompt);
    } catch {
      raw = null;
    }
    if (raw === null) {
      return { status: "failed", reason: `The model's diagram failed validation (${validation.errors[0]}) and no valid repair followed. Nothing was rendered.` };
    }
    validation = validateConceptCandidate(raw, { targetKind, generatedAt: now.toISOString() });
    if (!validation.ok) {
      return {
        status: "failed",
        reason: `The model's diagram still failed validation after one repair round (${validation.errors[0]}). Nothing was rendered — I don't ship invalid diagrams.`,
      };
    }
  }

  return { status: "ok", spec: validation.spec, notes: [] };
}

/* ------------------------------------------------------------------ */
/* Model-assisted edits (conversational refinement)                    */
/* ------------------------------------------------------------------ */

const EDIT_UNAVAILABLE_TEXT =
  "Editing this diagram with AI assistance needs your own API key (BYOK). Add one in Settings → Personalization → BYOK and try again.";

async function editConceptSpec(
  input: ConceptualPipelineInput,
  current: VisualizationSpec,
  instruction: string,
): Promise<{ status: "ok"; spec: VisualizationSpec; notes: string[] } | { status: "failed"; reason: string }> {
  if (!input.model) return { status: "failed", reason: EDIT_UNAVAILABLE_TEXT };
  const now = input.now ?? new Date();
  const context = resolveResearchContext({
    messages: input.messages as ResolverMessage[],
    request: input.request,
  });
  const digestText = formatDigestForPrompt(buildContextDigest(context));

  const call = async (userPrompt: string): Promise<unknown | null> => {
    const res = await input.model!({
      system: conceptEditSystemPrompt(),
      user: userPrompt,
      maxTokens: MAX_CANDIDATE_TOKENS,
      structuredOutput: true,
    });
    if (!res.content) return null;
    return extractJsonCandidate(res.content);
  };

  const userPrompt = conceptEditUserPrompt({
    currentSpec: JSON.stringify(current),
    instruction,
    contextDigest: digestText,
  });

  let raw: unknown = null;
  try {
    raw = await call(userPrompt);
  } catch (err) {
    return { status: "failed", reason: `The model call failed: ${err instanceof Error ? err.message : String(err)}.` };
  }
  if (raw === null) return { status: "failed", reason: "The model did not return a usable edited diagram." };

  // The edit keeps the current kind unless the instruction converts it.
  const targetKind = isConceptualKind(current.kind) ? current.kind : undefined;
  let validation = validateConceptCandidate(raw, {
    ...(detectConceptRefineOp(instruction)?.targetKind ? { targetKind: detectConceptRefineOp(instruction)!.targetKind! } : { targetKind }),
    generatedAt: now.toISOString(),
  });
  if (!validation.ok) {
    const repairPrompt = [
      userPrompt,
      "",
      "Your previous JSON failed validation with these errors:",
      ...validation.errors.slice(0, 8).map((e) => `- ${e}`),
      "",
      "Fix the JSON and return the corrected object only.",
    ].join("\n");
    try {
      raw = await call(repairPrompt);
    } catch {
      raw = null;
    }
    if (raw === null) return { status: "failed", reason: `The edited diagram failed validation (${validation.errors[0]}). The original diagram is unchanged.` };
    validation = validateConceptCandidate(raw, {
      ...(detectConceptRefineOp(instruction)?.targetKind ? { targetKind: detectConceptRefineOp(instruction)!.targetKind! } : { targetKind }),
      generatedAt: now.toISOString(),
    });
    if (!validation.ok) {
      return { status: "failed", reason: `The edited diagram still failed validation after one repair round (${validation.errors[0]}). The original diagram is unchanged.` };
    }
  }

  const edited = finalizeConceptProvenance(validation.spec, [`Edited: ${instruction.slice(0, 120)}.`]);
  const revalidated = validateVisualizationSpec(edited);
  if (!revalidated.ok) {
    return { status: "failed", reason: `The edited diagram failed final validation (${revalidated.errors[0]}).` };
  }
  return { status: "ok", spec: edited, notes: [] };
}

/* ------------------------------------------------------------------ */
/* Deterministic simplify                                              */
/* ------------------------------------------------------------------ */

/** Collapse a conceptual spec to its top-level structure (no model call). */
export function pruneConceptSpec(spec: VisualizationSpec): VisualizationSpec | null {
  const gaps = [...spec.gaps, "Simplified — collapsed to the top-level structure."];
  if (spec.encoding.kind === "mindmap") {
    const enc = spec.encoding;
    const childrenOf = new Map<string | undefined, string[]>();
    for (const n of enc.nodes) {
      const key = n.parent;
      if (!childrenOf.has(key)) childrenOf.set(key, []);
      childrenOf.get(key)!.push(n.id);
    }
    const root = enc.nodes.find((n) => !n.parent);
    if (!root) return null;
    const keptIds = new Set<string>([root.id]);
    const depth1 = (childrenOf.get(root.id) ?? []).slice(0, 5);
    for (const id of depth1) keptIds.add(id);
    const depth2 = depth1.flatMap((id) => (childrenOf.get(id) ?? []).slice(0, 3));
    for (const id of depth2) keptIds.add(id);
    const nodes = enc.nodes
      .filter((n) => keptIds.has(n.id) && (!n.parent || keptIds.has(n.parent)))
      .map((n) => ({ id: n.id, label: n.label, ...(n.parent ? { parent: n.parent } : {}) }));
    if (nodes.length < 2) return null;
    return {
      ...spec,
      id: vizSpecId("mind"),
      encoding: { kind: "mindmap", layout: enc.layout, nodes },
      gaps: gaps.slice(-SPEC_LIMITS.maxGaps),
    };
  }
  if (spec.encoding.kind === "roadmap") {
    const enc = spec.encoding;
    const phases = enc.phases.slice(0, 4).map((p) => ({
      id: p.id,
      label: p.label,
      ...(p.timeframe ? { timeframe: p.timeframe } : {}),
      items: p.items.slice(0, 4).map((i) => ({
        id: i.id,
        label: i.label,
        ...(i.status ? { status: i.status } : {}),
      })),
    }));
    if (phases.length < 1 || phases.every((p) => p.items.length === 0)) return null;
    return {
      ...spec,
      id: vizSpecId("road"),
      encoding: { kind: "roadmap", phases },
      gaps: gaps.slice(-SPEC_LIMITS.maxGaps),
    };
  }
  if (spec.encoding.kind === "decision-tree") {
    const enc = spec.encoding;
    const byId = new Map(enc.nodes.map((n) => [n.id, n]));
    const firstDecision = enc.nodes.find((n) => n.kind === "decision") ?? enc.nodes[0];
    const adjacency = new Map<string, string[]>();
    for (const e of enc.edges) {
      if (!adjacency.has(e.from)) adjacency.set(e.from, []);
      adjacency.get(e.from)!.push(e.to);
    }
    // BFS from the first decision, keep at most 9 nodes.
    const kept = new Set<string>([firstDecision.id]);
    const queue = [firstDecision.id];
    while (queue.length > 0 && kept.size < 9) {
      const id = queue.shift()!;
      for (const next of adjacency.get(id) ?? []) {
        if (!kept.has(next) && byId.has(next) && kept.size < 9) {
          kept.add(next);
          queue.push(next);
        }
      }
    }
    const nodes = enc.nodes.filter((n) => kept.has(n.id));
    const edges = enc.edges.filter((e) => kept.has(e.from) && kept.has(e.to));
    if (nodes.length < 2 || edges.length < 1) return null;
    return {
      ...spec,
      id: vizSpecId("decision"),
      encoding: { kind: "decision-tree", nodes, edges },
      gaps: gaps.slice(-SPEC_LIMITS.maxGaps),
    };
  }
  if (spec.encoding.kind === "architecture") {
    const enc = spec.encoding;
    const keptComponents = new Set<string>();
    const layers = enc.layers.slice(0, 3).map((l) => ({
      id: l.id,
      label: l.label,
      components: l.components.slice(0, 4).map((c) => {
        keptComponents.add(c.id);
        return { id: c.id, label: c.label };
      }),
    }));
    const connections = (enc.connections ?? []).filter((c) => keptComponents.has(c.from) && keptComponents.has(c.to)).slice(0, 8);
    if (layers.length < 1 || layers.every((l) => l.components.length === 0)) return null;
    return {
      ...spec,
      id: vizSpecId("arch"),
      encoding: { kind: "architecture", layers, ...(connections.length > 0 ? { connections } : {}) },
      gaps: gaps.slice(-SPEC_LIMITS.maxGaps),
    };
  }
  if (spec.encoding.kind === "framework") {
    const enc = spec.encoding;
    const sections = enc.sections.map((s) => ({
      id: s.id,
      label: s.label,
      ...(s.tone ? { tone: s.tone } : {}),
      items: s.items.slice(0, 4),
    }));
    if (sections.length < 2) return null;
    return {
      ...spec,
      id: vizSpecId("frame"),
      encoding: { kind: "framework", ...(enc.layout ? { layout: enc.layout } : {}), sections },
      gaps: gaps.slice(-SPEC_LIMITS.maxGaps),
    };
  }
  return null;
}

/* ------------------------------------------------------------------ */
/* Create flow                                                         */
/* ------------------------------------------------------------------ */

async function conceptualCreateFlow(input: ConceptualPipelineInput): Promise<VisualizationOutcome> {
  const now = input.now ?? new Date();
  const { intent, request } = input;
  const targetKind = intent.requestedType ? conceptualHintToKind(intent.requestedType) ?? undefined : undefined;

  // 1. Resolve the research context (Batch 1) — never re-research blindly.
  const context = resolveResearchContext({ messages: input.messages as ResolverMessage[], request });
  const digest = buildContextDigest(context);
  const researchAvailable = Boolean(input.research);

  // 2. Gap-driven research: classify what the context can ground.
  const assessment = assessGaps(context, request, researchAvailable);

  // 3. Deterministic derivation first — structured research data beats
  //    model synthesis (no fabrication risk at all).
  const derived = buildConceptFromDatasets(context, {
    ...(targetKind ? { targetKind } : {}),
    id: vizSpecId("concept"),
    title: request.replace(/^\/visualize\b/i, "").trim().slice(0, SPEC_LIMITS.maxTitleChars) || "Concept diagram",
    generatedAt: now.toISOString(),
    request,
  });
  if (derived && assessment.verdict !== "cannot-derive") {
    const validation = validateVisualizationSpec(derived.spec);
    if (validation.ok) return conceptOutcome(derived.spec, derived.notes);
  }

  // 4. Needs research → fetch additional evidence (cited) and merge it in.
  let mergedCitations = [...context.citations];
  const flowGaps: string[] = [];
  if (assessment.verdict === "needs-research" && input.research) {
    try {
      const res = await input.research({ query: assessment.researchQuery ?? request });
      if (res.content || res.citations?.length) {
        mergedCitations = [
          ...mergedCitations,
          ...(res.citations ?? []),
        ].slice(0, SPEC_LIMITS.maxSources);
        flowGaps.push(`Additional research was retrieved to ground this diagram (${(res.citations ?? []).length} source(s)).`);
      } else {
        flowGaps.push("Research returned no usable evidence — the diagram relies on the existing conversation only.");
      }
    } catch (err) {
      flowGaps.push(
        `Additional research failed (${err instanceof Error ? err.message : "error"}) — the limitation is explicit rather than filled with invented facts.`,
      );
    }
  }

  // 5. Cannot derive → honest refusal (never fabricated).
  if (assessment.verdict === "cannot-derive" && !derived) {
    return textMessage(
      [
        `I can't build "${request.replace(/^\/visualize\b/i, "").trim() || "that diagram"}" honestly right now:`,
        ...assessment.missing.map((m) => `- ${m}`),
        "",
        "I don't fabricate missing facts. Run a research request on the topic first, or connect research tools, then ask again.",
      ].join("\n"),
    );
  }

  // 6. Model-assisted generation (JSON candidate → validation gate).
  const mergedContext = { ...context, citations: mergedCitations };
  const mergedDigest = { ...digest, citations: mergedCitations };
  const sources = mergedCitations.map((c) => ({ url: c.url, ...(c.title ? { name: c.title } : {}) }));
  const generation = await generateConceptSpec(input, targetKind, formatDigestForPrompt(mergedDigest), sources);
  if (generation.status === "failed") {
    return textMessage(generation.reason);
  }

  const finalized = finalizeConceptProvenance(generation.spec, [...flowGaps, ...mergedContext.gaps]);
  const validation = validateVisualizationSpec(finalized);
  if (!validation.ok) {
    return textMessage(`The generated diagram failed final validation (${validation.errors[0]}) — nothing was rendered rather than shipping an invalid spec.`);
  }
  const notes: string[] = [];
  if (assessment.verdict === "needs-research") {
    notes.push("Grounded with additional research retrieved during this request.");
  }
  return conceptOutcome(finalized, notes);
}

/* ------------------------------------------------------------------ */
/* Refine flow (conversational intelligence)                           */
/* ------------------------------------------------------------------ */

async function conceptualRefineFlow(input: ConceptualPipelineInput): Promise<VisualizationOutcome> {
  const { request } = input;
  const existing = resolveReferencedSpec(input.messages, request);
  const op = detectConceptRefineOp(request);

  if (!existing) {
    return textMessage("There's no visualization in this conversation yet to refine — create one first (e.g. \"visualize this research as a mind map\").");
  }

  // "Explain every stage." — deterministic, grounded in the displayed spec.
  if (op?.op === "explain-stages") {
    return textMessage(explainConceptual(existing));
  }

  // Conceptual ops only apply to conceptual diagrams (data charts keep
  // their Batch 2 deterministic refinements).
  if (!isConceptualKind(existing.kind)) {
    if (op && op.op !== "convert") {
      return textMessage(
        `"${op.op.replace("-", " ")}" applies to conceptual diagrams (mind maps, roadmaps, decision trees…). The current visualization is a ${existing.kind.replace("-", " ")} data chart — say **"turn this into a mind map"** (or roadmap/framework) first, then refine it.`,
      );
    }
    if (!op) {
      return textMessage(
        `I can refine a ${existing.kind.replace("-", " ")} by chart type, time range or comparison — or say **"turn this into a mind map / roadmap / decision tree"** to restructure it.`,
      );
    }
  }

  // Deterministic simplify.
  if (op?.op === "simplify") {
    const pruned = pruneConceptSpec(existing);
    if (!pruned) {
      return textMessage("This diagram is already at its simplest form — there's nothing left to prune without losing the structure.");
    }
    const validation = validateVisualizationSpec(pruned);
    if (!validation.ok) {
      return textMessage(`Simplifying failed validation (${validation.errors[0]}) — the original diagram is unchanged.`);
    }
    return conceptOutcome(pruned, ["Collapsed to the top-level structure — the full detail remains in the conversation."]);
  }

  // Model-assisted edits.
  if (!op) {
    return textMessage(
      `Tell me what to change — for example: **"make this more detailed"**, **"add another branch"**, **"turn this into a decision tree"**, **"show dependencies between these steps"**, **"simplify this for beginners"** or **"convert this into a presentation-style visual"**.`,
    );
  }

  const instructionFor = (op: ConceptRefineOpResult): string => {
    switch (op.op) {
      case "expand": return "Make the diagram more detailed: add well-grounded sub-branches/sub-items to the existing structure. Do not invent new named entities.";
      case "add-branch": return `Add ${op.subject ?? "one more branch"} to the diagram as a new element, grounded in the research context.`;
      case "convert": return `Convert this diagram into a ${op.targetKind?.replace("-", " ")}${op.style ? ` (${op.style} style)` : ""}. Restructure the existing content into the new form without inventing new facts.`;
      case "dependencies": return "Add explicit dependency edges/connections between the existing steps or components. Do not remove existing content.";
      case "presentation": return "Restyle this diagram for a presentation: concise, punchy labels (shorten long ones), keep the structure readable on a slide. Do not change the meaning.";
      default: return request;
    }
  };

  const result = await editConceptSpec(input, existing, instructionFor(op));
  if (result.status === "failed") return textMessage(result.reason);
  const opLabel: Record<string, string> = {
    expand: "Expanded with more grounded detail.",
    "add-branch": `Added ${op.subject ? `“${op.subject}”` : "the requested branch"}.`,
    convert: `Converted to a ${result.spec.kind.replace("-", " ")}.`,
    dependencies: "Dependency connections added.",
    presentation: "Restyled for presentation use — labels shortened, structure unchanged.",
  };
  return conceptOutcome(result.spec, [opLabel[op.op] ?? "Diagram updated."]);
}

/* ------------------------------------------------------------------ */
/* Entry                                                               */
/* ------------------------------------------------------------------ */

/**
 * Handle a conceptual (Batch 3) visualization request. Never throws for
 * data/model failures — every failure becomes an honest text outcome.
 */
export async function handleConceptualRequest(input: ConceptualPipelineInput): Promise<VisualizationOutcome> {
  switch (input.intent.kind) {
    case "refine":
      return conceptualRefineFlow(input);
    case "explain":
      // Conceptual explain is deterministic (conceptExplain).
      return textMessage(explainConceptual(resolveReferencedSpec(input.messages, input.request) ?? { kind: "mindmap" } as VisualizationSpec));
    case "create":
    default:
      return conceptualCreateFlow(input);
  }
}
