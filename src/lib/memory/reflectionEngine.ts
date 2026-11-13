/**
 * Memory reflection engine.
 *
 * STATUS: REAL (Intelligent Workspace production-readiness pass).
 * Produces MemoryReflections LOCALLY — deterministic marker analysis over the
 * conversation, no provider calls, no cost, works offline. `persistMemories`
 * (agentMemories.ts) upserts results into `user_memories` for signed-in users
 * or the guest IndexedDB store for guests — the same storage the memory
 * system already reads via `getActiveMemories` → `buildMemoryContextForUser`.
 *
 * Previously both functions were stubs (always false / []) which made the
 * memory-reflection flow silently do nothing — see the audit trail. The
 * implementation is intentionally conservative: only clearly marked
 * statements become memories, and every reflection carries a confidence so
 * downstream rendering can filter.
 */

export type MemoryReflection = {
  category: "preference" | "skill" | "context";
  key: string;
  value: unknown;
  confidence?: number;
};

/** Reflect every N messages of accumulated conversation. */
const REFLECT_INTERVAL = 12;

export function shouldReflect(messageCount: number): boolean {
  return messageCount > 0 && messageCount % REFLECT_INTERVAL === 0;
}

const PREFERENCE_RE = /\b(?:i\s+(?:prefer|like|love|always|usually|tend to|hate|dislike|don'?t like|want)|my\s+(?:preference|style|tone)|please\s+always)\b[^.!?\n]{5,180}/i;
const DECISION_RE = /\b(?:decided|decision|going with|settled on|we(?:'| wi)ll (?:use|go with)|chose|chosen)\b[^.!?\n]{5,180}/i;
const REQUIREMENT_RE = /\b(?:must|require(?:ment|s)?|have to|needs? to|mandatory)\b[^.!?\n]{5,180}/i;
const CONSTRAINT_RE = /\b(?:cannot|can'?t|must not|never use|avoid|deadline|due (?:by|date)|budget of)\b[^.!?\n]{5,180}/i;

const STOPWORDS = new Set([
  "the", "and", "for", "with", "that", "this", "from", "have", "will", "your",
  "what", "when", "where", "which", "would", "could", "should", "about",
  "there", "their", "them", "then", "than", "they", "been", "being", "into",
  "just", "like", "make", "made", "need", "want", "some", "more", "also",
]);

function sentencesOf(text: string): string[] {
  return text
    .split(/(?<=[.!?。！？])\s+|\n+/)
    .map((s) => s.trim())
    .filter((s) => s.length >= 12 && s.length <= 300);
}

function topTopics(texts: string[], min: number, max: number): string[] {
  const freq = new Map<string, number>();
  for (const text of texts) {
    const seen = new Set<string>();
    for (const token of text.toLowerCase().match(/[a-z][a-z0-9_.-]{3,}/g) ?? []) {
      if (STOPWORDS.has(token) || seen.has(token)) continue;
      seen.add(token);
      freq.set(token, (freq.get(token) ?? 0) + 1);
    }
  }
  return [...freq.entries()]
    .filter(([, n]) => n >= min)
    .sort((a, b) => b[1] - a[1])
    .slice(0, max)
    .map(([token]) => token);
}

/**
 * Analyze a conversation and extract durable memories. Returns null when
 * nothing worth remembering was found (callers skip persistence), or a
 * capped, deduplicated list.
 */
export async function reflectOnConversation(
  conversation: Array<{ role: "user" | "assistant"; content: string }>,
): Promise<MemoryReflection[] | null> {
  const userMessages = conversation.filter((m) => m.role === "user").map((m) => m.content);
  if (userMessages.length === 0) return null;

  const reflections: MemoryReflection[] = [];
  const seen = new Set<string>();

  const push = (category: MemoryReflection["category"], key: string, value: string, confidence: number) => {
    const dedupe = `${category}|${key}|${value.slice(0, 60).toLowerCase()}`;
    if (seen.has(dedupe)) return;
    seen.add(dedupe);
    reflections.push({ category, key, value, confidence });
  };

  // Preferences — what the user explicitly asked to be done differently.
  for (const message of userMessages) {
    for (const sentence of sentencesOf(message)) {
      const match = PREFERENCE_RE.exec(sentence);
      if (match) push("preference", "style", sentence.slice(0, 240), 0.7);
    }
  }

  // Context — decisions, requirements and constraints (project continuity).
  for (const message of userMessages) {
    for (const sentence of sentencesOf(message)) {
      if (DECISION_RE.test(sentence)) push("context", "decisions", sentence.slice(0, 240), 0.8);
      if (REQUIREMENT_RE.test(sentence)) push("context", "requirements", sentence.slice(0, 240), 0.75);
      if (CONSTRAINT_RE.test(sentence)) push("context", "constraints", sentence.slice(0, 240), 0.75);
    }
  }

  // Skills/topics — recurring themes in what the user works on.
  const topics = topTopics(userMessages, 3, 5);
  if (topics.length >= 1) {
    push("skill", "topics", topics.join(", "), 0.6);
  }

  if (reflections.length === 0) return null;
  return reflections.slice(0, 8);
}
