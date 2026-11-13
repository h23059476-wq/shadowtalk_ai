/**
 * Research-to-Visualization — ResearchContextResolver (Batch 1).
 *
 * Answers the core Phase-1 question: how can "turn your previous research
 * into a chart" find the relevant research data WITHOUT re-researching?
 *
 * Resolution is layered, cheapest first (PHASE1_AUDIT.md Part B):
 *   1. messages carrying structured ```shadowdata blocks (best: typed data
 *      with sources already captured deterministically),
 *   2. completed research-tool messages (deep_research / web_search),
 *   3. messages with provider-reported citations,
 *   4. plain assistant text whose content matches the request keywords.
 *
 * The resolver reads the FULL session history (the caller passes the client-
 * side messages state), NOT the 14-message window the LLM sees — so a long
 * research report from earlier in the conversation still resolves. It never
 * triggers research itself; an explicit "gaps" list tells the caller what is
 * missing so a SCOPED research request can be made later (Batch 3).
 */

import type {
  Citation,
  ProvenanceClass,
  ResearchContext,
  ResearchEvidence,
  ResearchDataBlock,
  ResolverMessage,
  ShadowDataset,
} from "./types";
import { isReferentialRequest } from "./referential";

/** Tools whose completed output counts as research evidence. */
const RESEARCH_TOOLS = new Set(["deep_research", "web_search"]);

/** Maximum evidence entries and citations returned. */
const DEFAULT_MAX_EVIDENCE = 3;
const DEFAULT_MAX_CITATIONS = 24;
const DEFAULT_MAX_DATASETS = 4;

/**
 * Candidate scoring: priority class dominates, then keyword relevance
 * (×100), then recency. A single keyword hit outweighs any recency
 * difference, and any research-data message outranks every other class.
 */
const PRIORITY_BASE: Record<ResearchEvidence["priority"], number> = {
  "research-data": 4000,
  "research-tool": 3000,
  "citations": 2000,
  "text-match": 1000,
};

const STOPWORDS = new Set([
  "the", "and", "for", "with", "that", "this", "into", "from", "your",
  "show", "make", "turn", "give", "want", "need", "have", "has", "was",
  "were", "are", "can", "could", "would", "should", "chart", "graph",
  "visual", "visually", "visualization", "visualise", "visualize", "plot",
]);

/** Tokenize a request/content into comparable lowercase keywords. */
function tokenize(text: string): string[] {
  return (text.toLowerCase().match(/[a-z0-9][a-z0-9._-]*/g) || []).filter(
    (t) => t.length >= 3 && !STOPWORDS.has(t),
  );
}

/** Count how many request keywords appear in the content. */
function keywordOverlap(requestTokens: string[], content: string): number {
  if (requestTokens.length === 0) return 0;
  const haystack = content.toLowerCase();
  let hits = 0;
  for (const token of requestTokens) {
    if (haystack.includes(token)) hits += 1;
  }
  return hits;
}

function dedupeCitations(citations: Citation[], max: number): Citation[] {
  const byUrl = new Map<string, Citation>();
  for (const c of citations) {
    const url = c.url?.trim();
    if (!url || byUrl.has(url)) continue;
    byUrl.set(url, { url, ...(c.title ? { title: c.title } : {}) });
    if (byUrl.size >= max) break;
  }
  return [...byUrl.values()];
}

function bestProvenance(
  blocks: ResearchDataBlock[],
  citations: Citation[],
): ProvenanceClass {
  if (blocks.some((b) => b.sources.length > 0)) return "source-verified";
  if (blocks.length > 0 || citations.length > 0) return "ai-extracted";
  return "unverified";
}

function hasUsableNumericData(datasets: ShadowDataset[]): boolean {
  return datasets.some((ds) =>
    ds.columns.some(
      (col) =>
        (col.type === "number" || col.type === "currency") &&
        ds.rows.some((row) => typeof row[col.key] === "number"),
    ),
  );
}

export interface ResolveResearchContextInput {
  /** Full session messages, in conversation order (oldest → newest). */
  messages: ResolverMessage[];
  /** The user's visualization request text (used for keyword relevance). */
  request: string;
  maxEvidence?: number;
  maxCitations?: number;
  maxDatasets?: number;
}

/**
 * Resolve the research context for a visualization request from the session.
 * Deterministic and side-effect free — the same messages + request always
 * produce the same context (unit-tested contract).
 */
export function resolveResearchContext(
  input: ResolveResearchContextInput,
): ResearchContext {
  const {
    messages,
    request,
    maxEvidence = DEFAULT_MAX_EVIDENCE,
    maxCitations = DEFAULT_MAX_CITATIONS,
    maxDatasets = DEFAULT_MAX_DATASETS,
  } = input;

  const requestTokens = tokenize(request);

  // Candidates ranked by (priority class, keyword relevance, recency).
  const candidates: Array<{ message: ResolverMessage; priority: ResearchEvidence["priority"]; score: number }> = [];

  for (let i = messages.length - 1; i >= 0; i -= 1) {
    const message = messages[i];
    if (message.type !== "ai") continue;

    const recency = messages.length - i; // 1 = newest
    const overlap = keywordOverlap(requestTokens, message.content);
    const score = PRIORITY_BASE["research-data"];

    if (message.researchData && message.researchData.length > 0) {
      candidates.push({ message, priority: "research-data", score: score + overlap * 100 - recency });
      continue;
    }
    if (
      message.toolExecution &&
      RESEARCH_TOOLS.has(message.toolExecution.tool) &&
      message.toolExecution.status === "completed"
    ) {
      candidates.push({
        message,
        priority: "research-tool",
        score: PRIORITY_BASE["research-tool"] + overlap * 100 - recency,
      });
      continue;
    }
    if (message.citations && message.citations.length > 0) {
      candidates.push({
        message,
        priority: "citations",
        score: PRIORITY_BASE["citations"] + overlap * 100 - recency,
      });
      continue;
    }
    if (overlap > 0 && message.content.trim().length > 0) {
      candidates.push({
        message,
        priority: "text-match",
        score: PRIORITY_BASE["text-match"] + overlap * 100 - recency,
      });
    }
  }

  // Highest score first. P0-3 (confirmed defect CD-4): the zero-candidate
  // fallback used to inject the newest assistant message UNCONDITIONALLY —
  // even plain text with zero keyword overlap (e.g. literature answers
  // injected into a product-launch request). Research-artifact messages
  // (research-data / research-tool / citations) are always candidates in
  // the loop above, so a fallback candidate is plain text by construction;
  // it is injected ONLY when the request is referential ("visualize this
  // research", or no topic tokens at all) or the message carries research
  // artifacts after all.
  candidates.sort((a, b) => b.score - a.score);
  if (candidates.length === 0) {
    const aiMessages = messages.filter((m) => m.type === "ai" && m.content.trim().length > 0);
    const fallback = aiMessages[aiMessages.length - 1];
    if (fallback) {
      const carriesResearch =
        (fallback.researchData?.length ?? 0) > 0 || (fallback.citations?.length ?? 0) > 0;
      if (isReferentialRequest(request) || carriesResearch) {
        candidates.push({ message: fallback, priority: "text-match", score: 0 });
      }
    }
  }

  const datasets: ShadowDataset[] = [];
  const citations: Citation[] = [];
  const gaps: string[] = [];
  const evidence: ResearchEvidence[] = [];
  let primaryMessageId: string | undefined;

  for (const candidate of candidates) {
    if (evidence.length >= maxEvidence) break;
    const { message, priority } = candidate;

    if (priority === "research-data" && message.researchData) {
      for (const block of message.researchData) {
        for (const ds of block.datasets) {
          if (datasets.length >= maxDatasets) break;
          datasets.push(ds);
        }
        for (const gap of block.gaps) {
          if (!gaps.includes(gap)) gaps.push(gap);
        }
        citations.push(...block.sources.map((s) => ({ url: s.url, ...(s.name ? { title: s.name } : {}) })));
      }
    }
    if (message.citations?.length) citations.push(...message.citations);

    evidence.push({
      messageId: message.id,
      excerpt: message.content.slice(0, 1500),
      priority,
    });
    if (!primaryMessageId) primaryMessageId = message.id;
  }

  const dedupedCitations = dedupeCitations(citations, maxCitations);
  if (datasets.length === 0) {
    gaps.unshift("No structured research datasets were captured in this conversation.");
  }
  if (dedupedCitations.length === 0) {
    gaps.push("No source URLs are available to verify the data.");
  }

  return {
    datasets,
    citations: dedupedCitations,
    evidence,
    provenance: bestProvenance(
      candidates.flatMap((c) => (c.message.researchData ?? [])),
      dedupedCitations,
    ),
    gaps,
    hasNumericData: hasUsableNumericData(datasets),
    primaryMessageId,
  };
}
