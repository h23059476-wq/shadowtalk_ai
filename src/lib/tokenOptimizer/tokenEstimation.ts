/**
 * Intelligent Workspace Batch 1 — token estimation.
 *
 * No tokenizer dependency ships with the app, and provider-specific counting
 * is adopted only where a provider returns real usage (see usage.ts).
 * Everything else uses this documented heuristic. Plain char/4 estimation
 * massively OVER-counts CJK text (Chinese/Japanese/Korean characters run
 * roughly 1 token per character, not 1 per 4), which would compact CJK
 * conversations far too aggressively — ShadowTalk ships 11 UI languages
 * including zh/ja, so the heuristic is CJK-aware:
 *
 *   tokens ≈ cjkChars × 1 + otherChars / 4
 *
 * Every number produced here is labeled ESTIMATED end-to-end; measured
 * provider usage always wins when present.
 */

const CJK_CHAR = /[\u3040-\u30FF\u3400-\u4DBF\u4E00-\u9FFF\uF900-\uFAFF\uAC00-\uD7AF]/;

/** Documented estimation method label — surfaced in telemetry. */
export const TOKEN_ESTIMATION_METHOD = "heuristic-cjk-aware-v1";

export function estimateTokens(text: string | null | undefined): number {
  if (!text) return 0;
  let cjk = 0;
  let other = 0;
  for (const ch of text) {
    if (CJK_CHAR.test(ch)) cjk += 1;
    else other += 1;
  }
  return Math.ceil(cjk + other / 4);
}

export function estimateMessageTokens(message: { content: string }): number {
  return estimateTokens(message.content);
}
