/**
 * Research-to-Visualization Batch 3 — model bridge for AI-assisted
 * conceptual generation.
 *
 * The model is allowed to author ONE thing: a JSON spec candidate for the
 * closed conceptual schema. It is NEVER allowed to produce executable
 * code, HTML or SVG — the candidate goes through the SAME
 * validateVisualizationSpec gate as every deterministic spec, after a
 * normalization pass that caps sizes, coerces kind names and fills the
 * required metadata. If the candidate cannot be validated after one
 * repair round, the flow refuses honestly (no silent dropping).
 *
 * The model call itself is injected (no React, no Firebase): ChatbotPage
 * wires it to the user's own BYOK provider via streamCloudChat — BYOK-only
 * behavior is preserved, no shared keys are introduced.
 */

import {
  SPEC_LIMITS,
  VIZ_SPEC_VERSION,
  vizSpecId,
  validateVisualizationSpec,
  type VisualizationSpec,
  type VizSpecKind,
} from "../spec";
import type { Citation } from "../types";

/* ------------------------------------------------------------------ */
/* Injected call contracts                                             */
/* ------------------------------------------------------------------ */

export interface ConceptModelRequest {
  system: string;
  user: string;
  maxTokens?: number;
  structuredOutput?: boolean;
}

export interface ConceptModelResponse {
  content: string;
  citations?: Citation[];
}

/** One-shot model completion (BYOK, user-selected provider/model). */
export type ConceptModelCall = (req: ConceptModelRequest) => Promise<ConceptModelResponse>;

/** Gap-driven research call (provider-backed web search with citations). */
export type ConceptResearchCall = (req: { query: string }) => Promise<ConceptModelResponse>;

/* ------------------------------------------------------------------ */
/* JSON candidate extraction                                           */
/* ------------------------------------------------------------------ */

/**
 * Extract a JSON object from model output. Tolerates ```json fences and
 * prose around the object; returns null when no object can be parsed.
 */
export function extractJsonCandidate(text: string): unknown | null {
  if (!text) return null;
  let candidate = text.trim();
  const fence = candidate.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) candidate = fence[1].trim();
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return null;
  candidate = candidate.slice(start, end + 1);
  try {
    return JSON.parse(candidate);
  } catch {
    return null;
  }
}

/* ------------------------------------------------------------------ */
/* Kind synonyms (the model may name a kind slightly differently)      */
/* ------------------------------------------------------------------ */

const KIND_SYNONYMS: Array<[VizSpecKind, RegExp]> = [
  ["mindmap", /^(mind\s?map|hierarchy|org(anization)?\s?chart|tree)$/i],
  ["roadmap", /^(roadmap|project\s?plan|plan)$/i],
  ["decision-tree", /^(decision[-\s]?(tree|diagram|map))$/i],
  ["architecture", /^(architecture|system\s?design|layered\s?diagram)$/i],
  ["framework", /^(framework|swot|strategic\s?framework|quadrant)$/i],
];

function coerceKind(raw: unknown): VizSpecKind | null {
  if (typeof raw !== "string") return null;
  const value = raw.trim();
  const direct = value as VizSpecKind;
  if (["mindmap", "roadmap", "decision-tree", "architecture", "framework"].includes(direct)) return direct;
  for (const [kind, re] of KIND_SYNONYMS) if (re.test(value)) return kind;
  return null;
}

const cap = (s: unknown, max: number): string => (typeof s === "string" ? s.slice(0, max).trim() : "");

/**
 * Normalize a model-authored candidate into the closed spec shape:
 * coerce the kind, cap every string, cap every array, drop unknown keys
 * (no smuggling surface) and fill required metadata. Returns null when
 * the candidate is not structurally salvageable for the target kind.
 */
export function normalizeConceptCandidate(
  raw: unknown,
  opts: { targetKind?: VizSpecKind; id?: string; generatedAt?: string; allowedUrls?: string[] } = {},
): VisualizationSpec | null {
  if (typeof raw !== "object" || raw === null) return null;
  const obj = raw as Record<string, unknown>;
  const kind = coerceKind(obj.kind) ?? opts.targetKind;
  if (!kind) return null;

  const generatedAt = (cap(opts.generatedAt, 64) || new Date().toISOString().slice(0, 64));
  const base = {
    version: VIZ_SPEC_VERSION as 1,
    id: cap(opts.id, 64) || vizSpecId(kind.split("-")[0]),
    kind,
    title: cap(obj.title, SPEC_LIMITS.maxTitleChars) || cap(opts.targetKind ?? "", 40) || "Concept diagram",
    ...(cap(obj.description, SPEC_LIMITS.maxDescriptionChars) ? { description: cap(obj.description, SPEC_LIMITS.maxDescriptionChars) } : {}),
    datasets: [] as VisualizationSpec["datasets"],
    provenance: "ai-extracted" as const,
    sources: [] as VisualizationSpec["sources"],
    generatedAt,
    gaps: Array.isArray(obj.gaps)
      ? obj.gaps.filter((g): g is string => typeof g === "string").map((g) => cap(g, SPEC_LIMITS.maxGapChars)).filter(Boolean).slice(0, SPEC_LIMITS.maxGaps)
      : [],
  };

  let encoding: VisualizationSpec["encoding"];
  switch (kind) {
    case "mindmap": {
      const nodes = Array.isArray(obj.nodes) ? obj.nodes : (obj.encoding as { nodes?: unknown[] } | undefined)?.nodes;
      if (!Array.isArray(nodes)) return null;
      const normNodes = nodes
        .filter((n): n is Record<string, unknown> => typeof n === "object" && n !== null)
        .map((n) => ({
          id: cap(n.id, 64),
          label: cap(n.label, SPEC_LIMITS.maxLabelChars),
          ...(cap(n.parent, 64) ? { parent: cap(n.parent, 64) } : {}),
          ...(cap(n.note, SPEC_LIMITS.maxGapChars) ? { note: cap(n.note, SPEC_LIMITS.maxGapChars) } : {}),
        }))
        .filter((n) => n.id && n.label)
        .slice(0, SPEC_LIMITS.maxMindNodes);
      if (normNodes.length < 2) return null;
      encoding = {
        kind: "mindmap",
        ...(obj.layout === "tree" || obj.layout === "radial" ? { layout: obj.layout } : {}),
        nodes: normNodes,
      };
      break;
    }
    case "roadmap": {
      const phases = Array.isArray(obj.phases) ? obj.phases : (obj.encoding as { phases?: unknown[] } | undefined)?.phases;
      if (!Array.isArray(phases)) return null;
      const normPhases = phases
        .filter((p): p is Record<string, unknown> => typeof p === "object" && p !== null)
        .map((p, pi) => ({
          id: cap(p.id, 64) || `phase-${pi + 1}`,
          label: cap(p.label ?? p.name, SPEC_LIMITS.maxLabelChars),
          ...(cap(p.timeframe, 64) ? { timeframe: cap(p.timeframe, 64) } : {}),
          items: (Array.isArray(p.items) ? p.items : [])
            .filter((i): i is Record<string, unknown> => typeof i === "object" && i !== null)
            .map((i, ii) => ({
              id: cap(i.id, 64) || `item-${pi + 1}-${ii + 1}`,
              label: cap(i.label ?? i.name, SPEC_LIMITS.maxLabelChars),
              ...(typeof i.status === "string" && ["planned", "in-progress", "done", "at-risk"].includes(i.status)
                ? { status: i.status as "planned" | "in-progress" | "done" | "at-risk" }
                : {}),
              ...(cap(i.note, SPEC_LIMITS.maxGapChars) ? { note: cap(i.note, SPEC_LIMITS.maxGapChars) } : {}),
            }))
            .filter((i) => i.label)
            .slice(0, SPEC_LIMITS.maxRoadmapItemsPerPhase),
        }))
        .filter((p) => p.label && p.items.length > 0)
        .slice(0, SPEC_LIMITS.maxRoadmapPhases);
      if (normPhases.length < 1) return null;
      encoding = { kind: "roadmap", phases: normPhases };
      break;
    }
    case "decision-tree": {
      const nodes = Array.isArray(obj.nodes) ? obj.nodes : (obj.encoding as { nodes?: unknown[] } | undefined)?.nodes;
      const edges = Array.isArray(obj.edges) ? obj.edges : (obj.encoding as { edges?: unknown[] } | undefined)?.edges;
      if (!Array.isArray(nodes) || !Array.isArray(edges)) return null;
      const nodeIds = new Set<string>();
      const normNodes = nodes
        .filter((n): n is Record<string, unknown> => typeof n === "object" && n !== null)
        .map((n) => ({
          id: cap(n.id, 64),
          label: cap(n.label, SPEC_LIMITS.maxLabelChars),
          ...(typeof n.kind === "string" && ["decision", "option", "outcome"].includes(n.kind)
            ? { kind: n.kind as "decision" | "option" | "outcome" }
            : {}),
        }))
        .filter((n) => {
          if (!n.id || !n.label || nodeIds.has(n.id)) return false;
          nodeIds.add(n.id);
          return true;
        })
        .slice(0, SPEC_LIMITS.maxFlowNodes);
      const normEdges = edges
        .filter((e): e is Record<string, unknown> => typeof e === "object" && e !== null)
        .map((e) => ({
          from: cap(e.from, 64),
          to: cap(e.to, 64),
          ...(cap(e.label, SPEC_LIMITS.maxLabelChars) ? { label: cap(e.label, SPEC_LIMITS.maxLabelChars) } : {}),
        }))
        .filter((e) => nodeIds.has(e.from) && nodeIds.has(e.to))
        .slice(0, SPEC_LIMITS.maxFlowEdges);
      // P1-1 (confirmed defect CD-7): node kinds must be EXPLICIT. Untyped
      // nodes used to mean "decision" to the validator and "option" to the
      // renderer; they are now inferred from the graph shape (recorded as a
      // gap note), so validator, renderer and branch checks agree.
      const outCount = new Map<string, number>();
      for (const e of normEdges) outCount.set(e.from, (outCount.get(e.from) ?? 0) + 1);
      let kindsInferred = false;
      for (const n of normNodes) {
        if (n.kind) continue;
        kindsInferred = true;
        const outs = outCount.get(n.id) ?? 0;
        n.kind = outs >= 2 ? "decision" : outs === 0 ? "outcome" : "option";
      }
      if (!normNodes.some((n) => n.kind === "decision")) {
        // Fall back to the first node when the shape implies no decision.
        if (normNodes.length > 0) {
          normNodes[0].kind = "decision";
          kindsInferred = true;
        }
      }
      if (kindsInferred) {
        base.gaps.push("Node kinds were inferred from the graph shape (the model did not declare them explicitly).");
        base.gaps.splice(SPEC_LIMITS.maxGaps);
      }
      if (normNodes.length < 2 || normEdges.length < 1) return null;
      encoding = { kind: "decision-tree", nodes: normNodes, edges: normEdges };
      break;
    }
    case "architecture": {
      const layers = Array.isArray(obj.layers) ? obj.layers : (obj.encoding as { layers?: unknown[] } | undefined)?.layers;
      if (!Array.isArray(layers)) return null;
      const componentIds = new Set<string>();
      const normLayers = layers
        .filter((l): l is Record<string, unknown> => typeof l === "object" && l !== null)
        .map((l, li) => ({
          id: cap(l.id, 64) || `layer-${li + 1}`,
          label: cap(l.label ?? l.name, SPEC_LIMITS.maxLabelChars),
          components: (Array.isArray(l.components) ? l.components : [])
            .filter((c): c is Record<string, unknown> => typeof c === "object" && c !== null)
            .map((c) => ({
              id: cap(c.id, 64),
              label: cap(c.label ?? c.name, SPEC_LIMITS.maxLabelChars),
              ...(cap(c.note, SPEC_LIMITS.maxGapChars) ? { note: cap(c.note, SPEC_LIMITS.maxGapChars) } : {}),
            }))
            .filter((c) => {
              if (!c.id || !c.label || componentIds.has(c.id)) return false;
              componentIds.add(c.id);
              return true;
            })
            .slice(0, SPEC_LIMITS.maxArchitectureComponentsPerLayer),
        }))
        .filter((l) => l.label && l.components.length > 0)
        .slice(0, SPEC_LIMITS.maxArchitectureLayers);
      const normConnections = (Array.isArray(obj.connections) ? obj.connections : [])
        .filter((c): c is Record<string, unknown> => typeof c === "object" && c !== null)
        .map((c) => ({
          from: cap(c.from, 64),
          to: cap(c.to, 64),
          ...(cap(c.label, SPEC_LIMITS.maxLabelChars) ? { label: cap(c.label, SPEC_LIMITS.maxLabelChars) } : {}),
        }))
        .filter((c) => componentIds.has(c.from) && componentIds.has(c.to))
        .slice(0, SPEC_LIMITS.maxArchitectureConnections);
      if (normLayers.length < 1) return null;
      encoding = {
        kind: "architecture",
        layers: normLayers,
        ...(normConnections.length > 0 ? { connections: normConnections } : {}),
      };
      break;
    }
    case "framework": {
      const sections = Array.isArray(obj.sections) ? obj.sections : (obj.encoding as { sections?: unknown[] } | undefined)?.sections;
      if (!Array.isArray(sections)) return null;
      const normSections = sections
        .filter((s): s is Record<string, unknown> => typeof s === "object" && s !== null)
        .map((s, si) => ({
          id: cap(s.id, 64) || `section-${si + 1}`,
          label: cap(s.label ?? s.name ?? s.title, SPEC_LIMITS.maxLabelChars),
          ...(typeof s.tone === "string" && ["positive", "negative", "neutral"].includes(s.tone)
            ? { tone: s.tone as "positive" | "negative" | "neutral" }
            : {}),
          items: (Array.isArray(s.items) ? s.items : [])
            .filter((i): i is string => typeof i === "string")
            .map((i) => cap(i, SPEC_LIMITS.maxLabelChars))
            .filter(Boolean)
            .slice(0, SPEC_LIMITS.maxFrameworkItemsPerSection),
        }))
        .filter((s) => s.label && s.items.length > 0)
        .slice(0, SPEC_LIMITS.maxFrameworkSections);
      if (normSections.length < 2) return null;
      encoding = {
        kind: "framework",
        ...(obj.layout === "pillars" || obj.layout === "quadrant" ? { layout: obj.layout } : {}),
        sections: normSections,
      };
      break;
    }
    default:
      return null;
  }

  // Sources from the candidate: http(s) only, and — P0-4 (confirmed defect
  // CD-6) — restricted to the ALLOWLIST of urls that were actually supplied
  // in the prompt. A fabricated or carried-over url is dropped with a gap
  // note instead of dressing the card in a plausible-looking citation.
  const allowedSet = opts.allowedUrls
    ? new Set(opts.allowedUrls.map((u) => u.trim().toLowerCase()).filter(Boolean))
    : null;
  const httpSources = (Array.isArray(obj.sources) ? obj.sources : [])
    .filter((s): s is Record<string, unknown> => typeof s === "object" && s !== null)
    .map((s) => ({
      url: cap(s.url, 2048),
      ...(cap(s.name, SPEC_LIMITS.maxLabelChars) ? { name: cap(s.name, SPEC_LIMITS.maxLabelChars) } : {}),
      ...(cap(s.retrievedAt, 64) ? { retrievedAt: cap(s.retrievedAt, 64) } : {}),
      ...(cap(s.dataTimestamp, 64) ? { dataTimestamp: cap(s.dataTimestamp, 64) } : {}),
    }))
    .filter((s) => /^https?:\/\//i.test(s.url));
  const rejectedSources = allowedSet
    ? httpSources.filter((s) => !allowedSet.has(s.url.trim().toLowerCase())).length
    : 0;
  const sources = (allowedSet ? httpSources.filter((s) => allowedSet.has(s.url.trim().toLowerCase())) : httpSources)
    .slice(0, SPEC_LIMITS.maxSources);
  if (rejectedSources > 0) {
    base.gaps.push(
      `The model attached ${rejectedSources} source url(s) that were not supplied in the prompt — dropped (source allowlist enforced).`,
    );
    base.gaps.splice(SPEC_LIMITS.maxGaps);
  }

  const candidate: VisualizationSpec = {
    ...base,
    ...(sources.length > 0 ? { sources } : {}),
    encoding: encoding as VisualizationSpec["encoding"],
  };
  return candidate;
}

export type CandidateValidation = {
  ok: boolean;
  errors: string[];
  /** Present only when ok — matches the flat result style of
   *  SpecValidationResult (this repo compiles with strict:false, where
   *  boolean-literal discriminant narrowing via `!x.ok` is unavailable). */
  spec?: VisualizationSpec;
};

/**
 * Normalize + validate a model candidate. The spec passes ONLY when it
 * satisfies the full closed contract — identical to deterministic specs.
 */
export function validateConceptCandidate(
  raw: unknown,
  opts: { targetKind?: VizSpecKind; generatedAt?: string; allowedUrls?: string[] } = {},
): CandidateValidation {
  const candidate = normalizeConceptCandidate(raw, {
    targetKind: opts.targetKind,
    generatedAt: opts.generatedAt,
    ...(opts.allowedUrls ? { allowedUrls: opts.allowedUrls } : {}),
  });
  if (!candidate) {
    return { ok: false, errors: ["candidate could not be normalized into a supported conceptual kind"] };
  }
  const result = validateVisualizationSpec(candidate);
  if (!result.ok) return { ok: false, errors: result.errors };
  return { ok: true, errors: [], spec: candidate };
}
