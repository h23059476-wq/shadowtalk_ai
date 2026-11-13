/**
 * Speech rhythm engine for Live Mode.
 *
 * Turns an AI response into natural spoken chunks with punctuation-aware
 * pauses — the single biggest de-robotizer. Speaking one streaming sentence
 * at a time (instead of waiting for the whole response, or reading one flat
 * block) makes the AI feel like it's thinking while it talks, and the pause
 * planner gives sentences human breathing room.
 *
 * NOTE: deliberately written without regex lookbehind — lookbehind is a
 * syntax-level feature that crashes older Safari/iOS at parse time, and
 * ShadowTalk is heavily used on mobile.
 */

export interface SpeechChunk {
  text: string;
  /** Silence to leave after this chunk, in milliseconds. */
  pauseAfterMs: number;
}

const SENTINEL = "\u0001";

/** Common abbreviations that must not trigger a sentence split. */
const ABBREV_GUARDS = [
  /\b(mr|mrs|ms|dr|prof|sr|jr|st|vs|etc|approx|dept|est|min|max|fig|vol|ed|al)\.\s/gi,
  /\b(e\.g|i\.e|a\.m|p\.m|u\.s|u\.k)\./gi,
];

function protectAbbreviations(text: string): string {
  let out = text;
  ABBREV_GUARDS.forEach((re, i) => {
    out = out.replace(re, (m) => m.replace(/\./g, `§${i}§`));
  });
  return out;
}

function restoreAbbreviations(text: string): string {
  return text.replace(/§(\d)§/g, ".");
}

/** Remove emoji, markdown, URLs and other things TTS reads badly. */
export function stripForSpeech(text: string): string {
  return text
    .replace(/```[\s\S]*?```/g, " a code block ")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/https?:\/\/\S+/g, "a link")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/[#*_>|~]+/g, "")
    // Emoji & symbol planes (TTS engines read them aloud or stutter on them).
    .replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}\u{2190}-\u{21FF}\u{2B00}-\u{2BFF}]/gu, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

const PAUSE = {
  strong: 320, // . ! ? …
  medium: 230, // ;
  soft: 150, // , : —
  final: 420, // end of the whole response
} as const;

function pauseFor(trailingPunct: string, isLast: boolean): number {
  if (isLast) return PAUSE.final;
  if (/[.!?…]/.test(trailingPunct)) return PAUSE.strong;
  if (/[;]/.test(trailingPunct)) return PAUSE.medium;
  return PAUSE.soft;
}

/** Split a long sentence on clause boundaries so no chunk exceeds ~200 chars. */
function splitLongSentence(sentence: string): string[] {
  if (sentence.length <= 200) return [sentence];
  const parts = sentence.replace(/([,;:—])\s+/g, `$1${SENTINEL}`).split(SENTINEL);
  const out: string[] = [];
  let current = "";
  for (const part of parts) {
    if ((current + " " + part).trim().length > 200 && current) {
      out.push(current.trim());
      current = part;
    } else {
      current = `${current} ${part}`.trim();
    }
  }
  if (current.trim()) out.push(current.trim());
  return out;
}

/**
 * Split response text into speakable sentence chunks with pause timings.
 * Streaming-friendly: designed to be fed incremental slices of text.
 */
export function splitIntoSpeechChunks(rawText: string, isFinal = true): SpeechChunk[] {
  const cleaned = stripForSpeech(rawText);
  if (!cleaned) return [];

  const guarded = protectAbbreviations(cleaned);
  // Mark sentence enders followed by whitespace, then split on the sentinel.
  const pieces = guarded
    .replace(/([.!?…;]+)\s+/g, `$1${SENTINEL}`)
    .split(SENTINEL)
    .flatMap((s) => splitLongSentence(s))
    .map((s) => s.trim())
    .filter(Boolean);

  return pieces.map((piece, i) => {
    const restored = restoreAbbreviations(piece);
    const trailing = restored.trim().slice(-2);
    const isLast = isFinal && i === pieces.length - 1;
    return {
      text: restored,
      pauseAfterMs: pauseFor(trailing, isLast),
    };
  });
}

/**
 * Extract all new complete sentences from a growing stream of text, past the
 * index already consumed. Incomplete trailing text stays unconsumed until
 * it ends with sentence punctuation.
 */
export function extractStreamingChunks(
  accumulated: string,
  consumedUpTo: number,
): { chunks: SpeechChunk[]; newConsumed: number } {
  let consumed = consumedUpTo;
  const chunks: SpeechChunk[] = [];
  while (true) {
    const slice = accumulated.slice(consumed);
    const m = /[.!?…]\s/.exec(slice);
    if (!m) break;
    const part = slice.slice(0, m.index + m[0].length);
    chunks.push(...splitIntoSpeechChunks(part, false));
    consumed += part.length;
  }
  return { chunks, newConsumed: consumed };
}
