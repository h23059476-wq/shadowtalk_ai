/**
 * Research-to-Visualization — referential-request detection (P0-2 / P0-3).
 *
 * Shared by the context resolver (conditional zero-candidate fallback) and
 * the gap assessor (sufficiency classification). A request is REFERENTIAL
 * when it points at existing conversation content instead of naming a topic
 * of its own — "visualize this research", "a decision tree from the
 * previous study". Only a referential request may be grounded in content
 * that shows zero keyword overlap (confirmed defects CD-3 / CD-4: any
 * structured dataset or plain prior text used to mark every later request
 * as "sufficient").
 */

/** Words that carry no topic of their own (commands, chart nouns, fillers). */
const COMMAND_STOPWORDS = new Set([
  "the", "a", "an", "and", "for", "with", "that", "this", "these", "those",
  "into", "from", "show", "make", "draw", "create", "build", "generate",
  "turn", "convert", "transform", "give", "want", "need", "please",
  "chart", "graph", "diagram", "visualize", "visualise", "visualization",
  "visual", "visually", "plot", "picture", "image", "mindmap", "roadmap",
  "framework", "swot", "overview", "summary",
]);

/**
 * Explicit references to prior conversation content: "this/that/the/my/our
 * (previous|earlier|captured|...) research|data|study|...", "from the
 * previous research", "the conversation so far".
 */
const REFERENTIAL_PHRASE =
  /\b(?:this|that|the|my|our)\s+(?:previous|earlier|prior|above|captured|existing|collected|gathered|resolved|attached)?\s*(?:research|data|datasets?|study|findings|report|analysis|notes|results|conversation|session|material|evidence)\b|\bfrom\s+the\s+(?:previous|earlier|prior|above|research|conversation|session|study)\b|\bthe\s+above\b|\baforementioned\b/;

/**
 * True when the request asks to visualize EXISTING conversation content
 * (explicit referential phrase, or no topic tokens at all — "show me this
 * visually" tokenizes to nothing). Deterministic and side-effect free.
 */
export function isReferentialRequest(request: string): boolean {
  // Strip trailing punctuation so "visually." matches the stopword list.
  const text = (request ?? "").toLowerCase().replace(/[.,;:!?]+/g, " ");
  if (REFERENTIAL_PHRASE.test(text)) return true;
  const tokens = text.match(/[a-z0-9][a-z0-9._-]*/g) ?? [];
  const contentTokens = tokens.filter((t) => t.length >= 3 && !COMMAND_STOPWORDS.has(t));
  return contentTokens.length === 0;
}
