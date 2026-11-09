/**
 * Research-to-Visualization — deterministic visualization intent detection
 * (Batch 1).
 *
 * Users do not know chart terminology (spec Phase 4). This detector
 * classifies natural-language requests into:
 *   - "create"  → visualize something (possibly with a requested type)
 *   - "refine"  → change an existing visualization (type, time range,
 *                 interactivity, comparison)
 *   - "explain" → narrate an existing visualization from its dataset
 *   - null      → not a visualization request (NEVER hijack normal chat)
 *
 * Precision beats recall: a false "visualize" hijacks a normal question,
 * while a missed one only costs the user an extra word. Patterns therefore
 * require an explicit visualization noun or an explicit "visualize" verb.
 * The Batch 3 wiring may add AI-assisted classification as a fallback when
 * this returns null and a visualization session is active.
 */

import type { VizIntent, VizTypeHint } from "./types";

/**
 * Type hints — ordered so specific multi-word types match before generic
 * ones (e.g. "stacked bar chart" must not resolve to "bar").
 */
const TYPE_PATTERNS: Array<[VizTypeHint, RegExp]> = [
  ["bar-grouped", /\b(?:grouped|clustered|side-by-side)\s+bar\s+(?:chart|graph|plot)\b/i],
  ["bar-stacked", /\bstacked\s+(?:bar|chart|graph)\b/i],
  ["line", /\bline\s+(?:chart|graph|plot)\b/i],
  ["bar", /\bbar\s+(?:chart|graph|plot)\b/i],
  ["pie", /\bpie\s+(?:chart|graph)\b/i],
  ["donut", /\bdonut\s+(?:chart|graph)\b/i],
  ["area", /\barea\s+(?:chart|graph|plot)\b/i],
  ["scatter", /\bscatter\s+(?:plot|chart|graph)\b/i],
  ["histogram", /\bhistogram\b/i],
  ["candlestick", /\bcandlestick(?:\s+(?:chart|plot))?\b/i],
  ["timeline", /\btimeline\b/i],
  ["flowchart", /\bflow\s?chart\b/i],
  ["mindmap", /\bmind\s?map\b/i],
  ["roadmap", /\broadmap\b/i],
  ["decision-tree", /\bdecision\s+(?:tree|diagram)\b/i],
  ["dashboard", /\b(?:market\s+dashboard|comparison\s+dashboard|dashboard|kpi\s+cards?)\b/i],
];

const CHART_NOUN =
  /\b(?:chart|graph|plot|diagram|visualization|visualisation|dashboard|timeline|flowchart|mind\s?map|roadmap|histogram|scatter\s?plot|candlestick)\b/i;

const TIME_RANGE =
  /\b(last|past|previous|trailing)\s+(\d+|a\s+few|several|one|two|three|six|twelve)\s+(minutes?|hours?|days?|weeks?|months?|quarters?|years?)\b/i;

const COMPARE =
  /\bcompare\s+(?:[\w.-]+\s+)?(?:with|vs\.?|versus|against|and)\s+([\w .-]{2,40}?)(?=\s+(?:in|on|as|using|over|under|during|for|per|to|against|with|and)\b|[.?!]|$)/i;

const EXPLAIN =
  /\b(?:explain|describe|walk\s+me\s+through|break\s+down|what\s+does)\s+(?:this|that|the)\s+(?:chart|graph|visualization|visualisation|dashboard|diagram|plot|timeline)\b/i;

/** Explicit visualization verbs/nouns → create. */
const CREATE_PATTERNS: Array<{ re: RegExp; confidence: number }> = [
  { re: /^\/visualize\b/i, confidence: 0.9 },
  { re: /\b(?:visuali[sz]e|visuali[sz]ation)\b/i, confidence: 0.9 },
  {
    re: /\b(?:turn|convert|transform|represent|present|render|show|display)\b[^.?!]{0,60}?\b(?:this|that|it|them|the|those|your)\b[^.?!]{0,60}?\b(?:as|into|on)\b[^.?!]{0,40}?(?:chart|graph|plot|diagram|visual|dashboard|timeline|flowchart|mind\s?map|roadmap|histogram|scatter|candlestick|table)\b/i,
    confidence: 0.9,
  },
  {
    re: /\b(?:show|present|display|give)\s+(?:me\s+)?(?:this|that|it|the\s+data|the\s+research|the\s+findings|the\s+results|the\s+numbers|the\s+metrics)\s+(?:as|in|on|visually|graphically)/i,
    confidence: 0.9,
  },
  {
    re: /\b(?:as|in|on)\s+(?:a|an)\s+(?:line|bar|pie|donut|area|scatter|stacked|grouped|clustered)\b/i,
    confidence: 0.9,
  },
  {
    re: /\b(?:make|create|build|generate|draw|plot|give\s+me)\b[^.?!]{0,40}?\b(?:a|an)\b[^.?!]{0,40}?(?:chart|graph|diagram|dashboard|visualization|visualisation|timeline|flowchart|mind\s?map|histogram|scatter\s?plot|candlestick)\b/i,
    confidence: 0.7,
  },
];

/**
 * Refinement patterns — change an existing visualization. All require a
 * pronoun/reference to the existing viz ("it", "this", "the chart", …).
 */
const REFINE_TYPE =
  /\b(?:make|change|switch|convert|turn|use)\s+(?:it|this|that|to|into|a|an)\b[^.?!]{0,40}?\b(?:line|bar|pie|donut|area|scatter|stacked|grouped|clustered)\b/i;
const REFINE_INTERACTIVE =
  /\b(?:make|enable|add)\s+(?:it\s+)?(?:interactive|hoverable|zoomable|filterable)\b/i;
const REFINE_RANGE =
  /\b(?:show|limit|restrict|filter|display|only)\b[^.?!]{0,30}?\b(?:last|past|previous|trailing)\s+(?:\d+|a\s+few|several|one|two|three|six|twelve)\s+(?:minutes?|hours?|days?|weeks?|months?|quarters?|years?)\b/i;

function detectType(text: string): VizTypeHint | undefined {
  for (const [hint, re] of TYPE_PATTERNS) {
    if (re.test(text)) return hint;
  }
  return undefined;
}

function detectTimeRange(text: string): string | undefined {
  const match = text.match(TIME_RANGE);
  return match ? match[0].toLowerCase() : undefined;
}

function detectCompareTarget(text: string): string | undefined {
  const match = text.match(COMPARE);
  if (!match) return undefined;
  const target = match[1].trim().replace(/[.?!]+$/, "");
  return target.length > 0 ? target : undefined;
}

/**
 * Classify a user message as a visualization request.
 * Returns null for anything that is not clearly a visualization ask.
 */
export function detectVisualizationIntent(text: string): VizIntent | null {
  const input = text?.trim();
  if (!input || input.length > 500) return null;

  // 1. Explain — most specific intent, wins over everything else.
  if (EXPLAIN.test(input)) {
    return {
      kind: "explain",
      confidence: 0.9,
      ...(detectType(input) ? { requestedType: detectType(input) } : {}),
    };
  }

  // 2. Refinement — references an existing viz ("it/this/that").
  const timeRange = detectTimeRange(input);
  const interactive = REFINE_INTERACTIVE.test(input);
  const refineType = REFINE_TYPE.test(input);
  if (refineType || interactive || REFINE_RANGE.test(input)) {
    const type = detectType(input);
    return {
      kind: "refine",
      confidence: 0.9,
      ...(type ? { requestedType: type } : {}),
      ...(timeRange ? { timeRange } : {}),
      ...(interactive ? { interactive: true } : {}),
      ...(detectCompareTarget(input) ? { compareTarget: detectCompareTarget(input)! } : {}),
    };
  }

  // 3. Create — explicit visualization ask.
  for (const { re, confidence } of CREATE_PATTERNS) {
    if (re.test(input)) {
      const type = detectType(input);
      return {
        kind: "create",
        confidence,
        ...(type ? { requestedType: type } : {}),
        ...(timeRange ? { timeRange } : {}),
        ...(detectCompareTarget(input) ? { compareTarget: detectCompareTarget(input)! } : {}),
      };
    }
  }

  // 4. Time-range request with a chart noun but no create/refine verb —
  //    e.g. "the chart, last 30 days". Treat as a range refinement only
  //    when the message also mentions the chart.
  if (timeRange && CHART_NOUN.test(input)) {
    return { kind: "refine", confidence: 0.7, timeRange };
  }

  // 5. Comparison with an explicit chart context only — a bare "compare X
  //    with Y" is a normal research question and must NOT be hijacked.
  const compareTarget = detectCompareTarget(input);
  if (compareTarget && CHART_NOUN.test(input)) {
    const type = detectType(input);
    return {
      kind: "create",
      confidence: 0.7,
      compareTarget,
      ...(type ? { requestedType: type } : {}),
    };
  }

  return null;
}
