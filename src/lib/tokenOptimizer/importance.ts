/**
 * Intelligent Workspace Batch 1 — continuity protection + extractive summary.
 *
 * The optimizer must understand that a SHORT message can contain critical
 * information. Before any compaction runs, every message is classified into
 * protected classes (decisions, requirements/constraints, unfinished tasks,
 * unresolved questions, file/research references). Compaction never drops
 * protected messages regardless of budget pressure — it summarizes only the
 * unclassified remainder.
 *
 * Summarization is extractive and fully local: sentences are scored with the
 * same marker analysis and the highest-scoring ones are kept IN ORIGINAL
 * ORDER until a character budget is exhausted. No provider call is made —
 * compaction must never create unexpected API costs or require connectivity.
 */

export type ProtectedClass =
  | "decision"
  | "requirement"
  | "constraint"
  | "task"
  | "question"
  | "reference";

const MARKERS: Array<{ cls: ProtectedClass; re: RegExp; weight: number }> = [
  {
    cls: "decision",
    // Decisions and their reasoning — the project's chosen direction.
    re: /\b(decided|decision|final (?:answer|decision|choice|call)|going with|going to (?:use|go)|we(?:'| wi)ll (?:use|go with)|settled on|agreed|chose|chosen|conclusion|conclude|picked|sticking with)\b/i,
    weight: 3,
  },
  {
    cls: "requirement",
    re: /\b(require(?:ment|ments|s|d)?|must|need(?:s|ed)? to|have to|has to|mandatory|spec(?:ification|s)?|acceptance criteri|should (?:support|include|be)|make sure|ensure)\b/i,
    weight: 3,
  },
  {
    cls: "constraint",
    re: /\b(constraint|limitation|cannot|can't|must not|must never|don't|do not|avoid|restrict(?:ion|ed|s)?|not allowed|forbidden|only (?:use|support|allow)|budget|deadline|due (?:date|by))\b/i,
    weight: 2,
  },
  {
    cls: "task",
    re: /\b(todo|to-do|next step|follow[- ]?up|pending|in progress|will (?:do|implement|add|fix|ship|deploy)|action item|remaining|still needs|not yet|task)\b/i,
    weight: 2,
  },
  {
    cls: "question",
    re: /\?\s*$|\b(question|open issue|unresolved|unclear|clarif(?:y|ication|ies)|which (?:one|option)|what about|how (?:do|should) we)\b/i,
    weight: 1,
  },
  {
    cls: "reference",
    // Backticked identifiers, unix-ish paths, known source/doc extensions, URLs.
    re: /`[^`]+`|(?:^|[\s(])\/?[\w.@-]+(?:\/[\w.@-]+)+|\b[\w.-]+\.(?:tsx?|jsx?|py|md|json|csv|ya?ml|toml|sql|sh|pdf|docx|txt|html|css)\b|https?:\/\//i,
    weight: 2,
  },
];

/** Fenced code blocks are atomic: a truncated snippet is worse than none. */
const FENCED_BLOCK = /```[\s\S]*?```/g;

export interface MessageImportance {
  classes: ProtectedClass[];
  /** Additive marker score — used for extractive ranking. */
  score: number;
}

export function classifyMessage(text: string): MessageImportance {
  const classes = new Set<ProtectedClass>();
  let score = 0;
  for (const { cls, re, weight } of MARKERS) {
    if (re.test(text)) {
      classes.add(cls);
      score += weight;
    }
  }
  // Code blocks carry technical state (schemas, configs, commands) — heavy
  // protection so compaction summarizes prose around them, not the code.
  const fenced = text.match(FENCED_BLOCK);
  if (fenced && fenced.length > 0) {
    classes.add("reference");
    score += 3 * fenced.length;
  }
  return { classes: [...classes], score };
}

/**
 * Split text into summarizable units. Paragraphs break into sentences;
 * fenced code blocks are single atomic units. Deterministic.
 */
function toUnits(text: string): string[] {
  const units: string[] = [];
  const segments = text.split(/\n{2,}/);
  for (const segment of segments) {
    const trimmedSegment = segment.trim();
    if (!trimmedSegment) continue;
    if (trimmedSegment.startsWith("```")) {
      units.push(trimmedSegment);
      continue;
    }
    // Sentence split keeps the terminator; a "sentence" longer than ~600
    // chars is split on clause punctuation so one rambling line can't
    // consume the whole summary budget.
    const sentences = trimmedSegment.split(/(?<=[.!?。！？])\s+/);
    for (const sentence of sentences) {
      const s = sentence.trim();
      if (!s) continue;
      if (s.length <= 600) {
        units.push(s);
        continue;
      }
      const clauses = s.split(/(?<=[,;、，])\s+/);
      for (const clause of clauses) {
        const c = clause.trim();
        if (c) units.push(c);
      }
    }
  }
  return units;
}

/**
 * Extractive summary: pick the highest-scoring units until the character
 * budget is used, then emit them in ORIGINAL order (a summary that
 * re-orders a conversation invents narrative). Falls back to the opening
 * characters when nothing scores (plain chatter still keeps the gist).
 */
export function extractiveSummary(texts: string[], maxChars: number): string {
  const safeBudget = Math.max(120, Math.floor(maxChars));
  const units: Array<{ text: string; score: number; index: number }> = [];
  let unitIndex = 0;
  for (const text of texts) {
    for (const unit of toUnits(text)) {
      const { score: baseScore } = classifyMessage(unit);
      // Early units carry context-setting value — a tie-break bonus for
      // units that ALREADY scored (never promotes pure filler).
      const positionBonus = unitIndex < 4 ? 1 : 0;
      units.push({ text: unit, score: baseScore > 0 ? baseScore + positionBonus : 0, index: unitIndex });
      unitIndex += 1;
    }
  }
  if (units.length === 0) return "";

  const ranked = [...units].sort((a, b) => b.score - a.score || a.index - b.index);
  // Units with zero score are pure filler — they dilute the summary. Prefer
  // scored units; fall back to everything only when NOTHING scored (an
  // all-small-talk conversation still keeps its gist).
  const scored = ranked.filter((u) => u.score > 0);
  const pool = scored.length > 0 ? scored : ranked;
  const chosen: Array<{ text: string; index: number }> = [];
  let used = 0;
  for (const unit of pool) {
    const cost = unit.text.length + 1;
    if (used + cost > safeBudget) continue;
    chosen.push({ text: unit.text, index: unit.index });
    used += cost;
    if (used >= safeBudget) break;
  }
  if (chosen.length === 0) {
    // Nothing fit (giant single unit) — hard-truncate the first unit.
    return units[0].text.slice(0, safeBudget);
  }
  chosen.sort((a, b) => a.index - b.index);
  return chosen.map((c) => c.text).join("\n");
}
