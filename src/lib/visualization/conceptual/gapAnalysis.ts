/**
 * Research-to-Visualization Batch 3 — gap-driven research support.
 *
 * Before a conceptual diagram is generated the pipeline asks three
 * questions:
 *   1. What does the request need? (topic, requested structure)
 *   2. What can be DERIVED from the resolved research context?
 *   3. What requires ADDITIONAL research — and is research available?
 *
 * Classification is deterministic (token overlap + context presence).
 * When extra evidence is needed and a research call is wired, the caller
 * fetches it and the result is merged back — citations, timestamps and
 * provenance always flow through. The pipeline NEVER fabricates missing
 * facts; unresolvable gaps are reported, not filled.
 */

import { SPEC_LIMITS } from "../spec";
import { isReferentialRequest } from "../referential";
import type { Citation, ProvenanceClass, ResearchContext } from "../types";
import type { ShadowDataset } from "../types";

/* ------------------------------------------------------------------ */
/* Context digest                                                      */
/* ------------------------------------------------------------------ */

export interface ContextDigest {
  /** Dataset summaries (titles + column names + sample count). */
  datasets: string[];
  /** Capped evidence excerpts (research text the structure can build on). */
  evidence: string[];
  citations: Citation[];
  provenance: ProvenanceClass;
  declaredGaps: string[];
  /** P1-3 traceability: message ids of the evidence chosen for this digest. */
  evidenceMessageIds: string[];
  /** P0-2 traceability: how the request's topic relates to the context. */
  topicOverlap?: boolean;
  overlapRatio?: number;
  /** True when the request explicitly points at the existing conversation. */
  referentialRequest?: boolean;
}

const DIGEST_EVIDENCE_LIMIT = 6;
const DIGEST_EVIDENCE_CHARS = 400;

export function buildContextDigest(
  context: ResearchContext,
  assessment?: GapAssessment,
  maxEvidence = DIGEST_EVIDENCE_LIMIT,
): ContextDigest {
  return {
    datasets: context.datasets.slice(0, SPEC_LIMITS.maxDatasets).map((ds) => {
      const cols = ds.columns.map((c) => c.key).slice(0, 12).join(", ");
      return `- dataset "${ds.title}" (${ds.rows.length} rows; columns: ${cols})`;
    }),
    evidence: context.evidence
      .slice(0, maxEvidence)
      .map((e) => `- ${e.excerpt.slice(0, DIGEST_EVIDENCE_CHARS).replace(/\s+/g, " ").trim()}`),
    citations: context.citations.slice(0, SPEC_LIMITS.maxSources),
    provenance: context.provenance,
    declaredGaps: context.gaps.slice(0, SPEC_LIMITS.maxGaps),
    evidenceMessageIds: context.evidence.slice(0, maxEvidence).map((e) => e.messageId),
    ...(assessment
      ? {
          topicOverlap: assessment.topicOverlap,
          ...(assessment.overlapTokens > 0 ? { overlapRatio: assessment.overlapHits / assessment.overlapTokens } : {}),
          referentialRequest: assessment.referential,
        }
      : {}),
  };
}

export function formatDigestForPrompt(digest: ContextDigest): string {
  const parts: string[] = [];
  if (digest.datasets.length > 0) parts.push(...digest.datasets);
  if (digest.evidence.length > 0) parts.push(...digest.evidence);
  if (digest.declaredGaps.length > 0) parts.push(...digest.declaredGaps.map((g) => `- declared gap: ${g}`));
  return parts.join("\n");
}

/* ------------------------------------------------------------------ */
/* Sufficiency classification                                          */
/* ------------------------------------------------------------------ */

export type GapVerdict = "sufficient" | "needs-research" | "cannot-derive";

export interface GapAssessment {
  verdict: GapVerdict;
  /** What is missing (reported honestly when the verdict is negative). */
  missing: string[];
  /** Deterministic research query when verdict === "needs-research". */
  researchQuery?: string;
  /** True when the request's topic overlaps the resolved context. */
  topicOverlap: boolean;
  /** P0-2 traceability: request tokens and how many hit the context. */
  overlapHits: number;
  overlapTokens: number;
  /** True when the request explicitly points at the existing conversation. */
  referential: boolean;
}

function tokenize(text: string): string[] {
  return (text.toLowerCase().match(/[a-z0-9][a-z0-9._-]{2,}/g) ?? []).filter(
    (t) => !["the", "and", "for", "with", "this", "that", "into", "show", "make", "diagram", "chart", "visualize"].includes(t),
  );
}

/**
 * Classify whether the resolved context can ground the requested diagram.
 *  - sufficient:    context has datasets/evidence AND genuine topic overlap
 *                   (or the request is explicitly referential — P0-2: a
 *                   dataset captured anywhere in the session no longer
 *                   marks every later request as sufficient, CD-3);
 *  - needs-research: no usable overlap — research tools may fix it;
 *  - cannot-derive:  no context AND research unavailable/blocked.
 */
export function assessGaps(context: ResearchContext, request: string, researchAvailable: boolean): GapAssessment {
  const requestTokens = tokenize(request);
  const contextTokens = tokenize(
    [
      context.datasets.map((d) => `${d.title} ${d.columns.map((c) => c.key).join(" ")}`).join(" "),
      context.evidence.map((e) => e.excerpt).join(" "),
    ].join(" "),
  );
  const contextSet = new Set(contextTokens);
  const overlapHits = requestTokens.filter((t) => contextSet.has(t));
  const topicOverlap = requestTokens.length > 0 && overlapHits.length / requestTokens.length >= 0.34;
  const referential = isReferentialRequest(request);
  const overlapTrace = { overlapHits: overlapHits.length, overlapTokens: requestTokens.length, referential };

  const hasContext = context.datasets.length > 0 || context.evidence.length > 0;

  if (hasContext && (topicOverlap || referential)) {
    return { verdict: "sufficient", missing: [], topicOverlap, ...overlapTrace };
  }
  if (!hasContext) {
    if (!researchAvailable) {
      return {
        verdict: "cannot-derive",
        missing: [
          "No research was captured in this conversation and research tools are not available right now (offline or no key).",
        ],
        topicOverlap: false,
        ...overlapTrace,
      };
    }
    return {
      verdict: "needs-research",
      missing: [`No research about "${requestTokens.slice(0, 6).join(" ") || "the requested topic"}" exists in this conversation yet.`],
      researchQuery: buildResearchQuery(request),
      topicOverlap: false,
      ...overlapTrace,
    };
  }
  // Context exists but does not match the request — additional research
  // can fill the difference.
  if (researchAvailable) {
    return {
      verdict: "needs-research",
      missing: [`The captured research does not cover: ${requestTokens.slice(0, 6).join(" ")}.`],
      researchQuery: buildResearchQuery(request),
      topicOverlap: false,
      ...overlapTrace,
    };
  }
  return {
    verdict: "cannot-derive",
    missing: ["The captured research does not cover the requested topic and research tools are unavailable right now."],
    topicOverlap: false,
    ...overlapTrace,
  };
}

/** Deterministic research query derived from the request text. */
export function buildResearchQuery(request: string): string {
  const cleaned = request
    .replace(/^\/visualize\b/i, "")
    .replace(/\b(?:as|into)\s+(?:a|an)?\s*(?:mind\s?map|roadmap|decision\s+(?:tree|diagram)|architecture(?:\s+diagram)?|workflow(?:\s+diagram)?|process\s+flow|framework|swot|org\s?chart|hierarchy|project\s+plan|timeline)\b/gi, "")
    .replace(/\b(?:create|make|build|generate|draw|show|give\s+me|turn|convert|transform)\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();
  return cleaned.length >= 8 ? cleaned.slice(0, 240) : request.slice(0, 240);
}

/* ------------------------------------------------------------------ */
/* Deterministic conceptual builders (derive-from-existing-data path)  */
/* ------------------------------------------------------------------ */

/**
 * Detect structured conceptual datasets in the resolved context and build
 * a spec WITHOUT any model call. Supported shapes:
 *   - roadmap:      rows with (phase-like column, item column [, status, timeframe])
 *   - mindmap:      rows with (label, parent) columns
 *   - architecture: rows with (layer, component) columns
 * Returns null when no structured shape matches — the caller then falls
 * back to AI-assisted generation. Provenance follows the CONTEXT (this is
 * derived data, not model synthesis).
 */
export function buildConceptFromDatasets(
  context: ResearchContext,
  opts: { targetKind?: string; id: string; title: string; generatedAt: string; request?: string },
): { spec: import("../spec").VisualizationSpec; notes: string[] } | null {
  const requestTokens = tokenize(opts.request ?? "");
  const candidates = context.datasets.filter((ds) => {
    const strings = ds.columns.filter((c) => c.type === "string");
    return strings.length >= 2;
  });
  if (candidates.length === 0) return null;

  const scoreDataset = (ds: ShadowDataset): number => {
    const hay = `${ds.title} ${ds.columns.map((c) => c.key).join(" ")}`.toLowerCase();
    return requestTokens.filter((t) => hay.includes(t)).length;
  };
  const ordered = [...candidates].sort((a, b) => scoreDataset(b) - scoreDataset(a));

  const sources = context.citations
    .slice(0, SPEC_LIMITS.maxSources)
    .map((c) => ({ url: c.url, ...(c.title ? { name: c.title } : {}) }));
  const provenance: ProvenanceClass = context.provenance === "unverified" && sources.length === 0 ? "unverified" : context.provenance;
  const gaps = [...context.gaps];
  if (provenance === "unverified" && !gaps.some((g) => g.includes("unverified"))) {
    gaps.push("Source data is unverified (unverified) — labels are indicative only.");
  }

  for (const ds of ordered) {
    const cols = ds.columns;
    const phaseCol = cols.find((c) => c.type === "string" && /phase|stage|milestone|quarter|month|sprint|wave/i.test(c.key));
    const itemCol = cols.find((c) => c.type === "string" && c !== phaseCol && /item|task|work|deliverable|action|step|objective|goal|initiative/i.test(c.key));
    const parentCol = cols.find((c) => c.type === "string" && /parent|child\s?of|belongs\s?to|part\s?of/i.test(c.key));
    const layerCol = cols.find((c) => c.type === "string" && /layer|tier|level/i.test(c.key));
    const componentCol = cols.find((c) => c.type === "string" && c !== layerCol && /component|service|module|system|part/i.test(c.key));

    // Roadmap: phase + item columns.
    if (phaseCol && itemCol && (!opts.targetKind || opts.targetKind === "roadmap" || opts.targetKind === "project-plan")) {
      const statusCol = cols.find((c) => /status|state|progress/i.test(c.key));
      const timeframeCol = cols.find((c) => /timeframe|when|period|date/i.test(c.key) && c.type === "string");
      const phaseOrder: Array<{ id: string; label: string; timeframe?: string; items: Array<{ id: string; label: string; status?: "planned" | "in-progress" | "done" | "at-risk" }> }> = [];
      const phaseIndex = new Map<string, number>();
      for (const row of ds.rows) {
        const phaseLabel = typeof row[phaseCol.key] === "string" ? (row[phaseCol.key] as string).trim() : "";
        const itemLabel = typeof row[itemCol.key] === "string" ? (row[itemCol.key] as string).trim() : "";
        if (!phaseLabel || !itemLabel) continue;
        if (!phaseIndex.has(phaseLabel)) {
          phaseIndex.set(phaseLabel, phaseOrder.length);
          const tf = timeframeCol && typeof row[timeframeCol.key] === "string" ? (row[timeframeCol.key] as string).trim() : undefined;
          phaseOrder.push({
            id: `phase-${phaseOrder.length + 1}`,
            label: phaseLabel.slice(0, SPEC_LIMITS.maxLabelChars),
            ...(tf ? { timeframe: tf.slice(0, 64) } : {}),
            items: [],
          });
        }
        const phase = phaseOrder[phaseIndex.get(phaseLabel)!];
        if (phase.items.length >= SPEC_LIMITS.maxRoadmapItemsPerPhase) continue;
        const rawStatus = statusCol && typeof row[statusCol.key] === "string" ? (row[statusCol.key] as string).toLowerCase() : "";
        const status = ["planned", "in-progress", "done", "at-risk"].includes(rawStatus)
          ? (rawStatus as "planned" | "in-progress" | "done" | "at-risk")
          : undefined;
        phase.items.push({ id: `item-${phase.id}-${phase.items.length + 1}`, label: itemLabel.slice(0, SPEC_LIMITS.maxLabelChars), ...(status ? { status } : {}) });
      }
      if (phaseOrder.length >= 1 && phaseOrder.every((p) => p.items.length > 0) && phaseOrder.length <= SPEC_LIMITS.maxRoadmapPhases) {
        const spec: import("../spec").VisualizationSpec = {
          version: 1,
          id: opts.id,
          kind: "roadmap",
          title: opts.title,
          datasets: [],
          encoding: { kind: "roadmap", phases: phaseOrder },
          provenance,
          sources,
          generatedAt: opts.generatedAt,
          gaps,
        };
        return { spec, notes: ["Built deterministically from structured research data — no model synthesis needed."] };
      }
    }

    // Mindmap: parent + label columns.
    if (parentCol && (!opts.targetKind || opts.targetKind === "mindmap" || opts.targetKind === "hierarchy")) {
      const labelCol = cols.find((c) => c.type === "string" && c !== parentCol) ?? itemCol;
      if (labelCol) {
        const labelOf = new Map<string, string>();
        for (const row of ds.rows) {
          const id = typeof row[labelCol.key] === "string" ? (row[labelCol.key] as string).trim() : "";
          if (id && !labelOf.has(id)) labelOf.set(id, id.slice(0, SPEC_LIMITS.maxLabelChars));
        }
        if (labelOf.size >= 2) {
          const rootId = [...labelOf.keys()][0];
          const nodes: Array<{ id: string; label: string; parent?: string }> = [
            { id: "root", label: labelOf.get(rootId)! },
          ];
          let i = 1;
          for (const [id] of labelOf) {
            if (id === rootId) continue;
            nodes.push({ id: `n${i}`, label: labelOf.get(id)!, parent: "root" });
            i += 1;
          }
          // Attach declared parents where they reference known labels.
          for (const row of ds.rows) {
            const childLabel = typeof row[labelCol.key] === "string" ? (row[labelCol.key] as string).trim() : "";
            const parentLabel = typeof row[parentCol.key] === "string" ? (row[parentCol.key] as string).trim() : "";
            if (!childLabel || !parentLabel || childLabel === rootId) continue;
            const node = nodes.find((n) => n.label === childLabel.slice(0, SPEC_LIMITS.maxLabelChars));
            const parentNode = nodes.find((n) => n.label === parentLabel.slice(0, SPEC_LIMITS.maxLabelChars));
            if (node && parentNode) node.parent = parentNode.id;
          }
          const spec: import("../spec").VisualizationSpec = {
            version: 1,
            id: opts.id,
            kind: "mindmap",
            title: opts.title,
            datasets: [],
            encoding: { kind: "mindmap", layout: "tree", nodes },
            provenance,
            sources,
            generatedAt: opts.generatedAt,
            gaps,
          };
          return { spec, notes: ["Built deterministically from structured research data — no model synthesis needed."] };
        }
      }
    }

    // Architecture: layer + component columns.
    if (layerCol && componentCol && (!opts.targetKind || opts.targetKind === "architecture")) {
      const layers: Array<{ id: string; label: string; components: Array<{ id: string; label: string }> }> = [];
      const layerIndex = new Map<string, number>();
      const componentIds = new Set<string>();
      for (const row of ds.rows) {
        const layerLabel = typeof row[layerCol.key] === "string" ? (row[layerCol.key] as string).trim() : "";
        const compLabel = typeof row[componentCol.key] === "string" ? (row[componentCol.key] as string).trim() : "";
        if (!layerLabel || !compLabel) continue;
        if (!layerIndex.has(layerLabel)) {
          layerIndex.set(layerLabel, layers.length);
          layers.push({ id: `layer-${layers.length + 1}`, label: layerLabel.slice(0, SPEC_LIMITS.maxLabelChars), components: [] });
        }
        const layer = layers[layerIndex.get(layerLabel)!];
        if (layer.components.length >= SPEC_LIMITS.maxArchitectureComponentsPerLayer || componentIds.has(compLabel)) continue;
        componentIds.add(compLabel);
        layer.components.push({ id: `comp-${componentIds.size}`, label: compLabel.slice(0, SPEC_LIMITS.maxLabelChars) });
      }
      if (layers.length >= 1) {
        const spec: import("../spec").VisualizationSpec = {
          version: 1,
          id: opts.id,
          kind: "architecture",
          title: opts.title,
          datasets: [],
          encoding: { kind: "architecture", layers },
          provenance,
          sources,
          generatedAt: opts.generatedAt,
          gaps,
        };
        return { spec, notes: ["Built deterministically from structured research data — no model synthesis needed."] };
      }
    }
  }

  return null;
}
