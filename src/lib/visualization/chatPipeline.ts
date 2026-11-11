/**
 * Research-to-Visualization — chat pipeline (Batch 2).
 *
 * Handles a detected visualization intent END TO END, deterministically:
 *   create  → resolve the session's research context (never re-researches)
 *             and plan a spec; fall back to live public market data when the
 *             request names a known asset and nothing better exists.
 *   refine  → transform the most recent spec (kind switch, time range,
 *             comparison); a time range the snapshot cannot satisfy is
 *             served from real provider history or EXPLICITLY refused.
 *   explain → narrate the actual displayed dataset (no model in the loop).
 *
 * The module is pure (no React, no Firebase): ChatbotPage wires the outcome
 * into message state and the encrypted metadata column. All assistant text
 * is templated from computed values — the model never authors the numbers.
 */

import type { Citation, ResolverMessage, VizIntent } from "./types";
import { conceptualHintToKind } from "./types";
import { resolveResearchContext } from "./contextResolver";
import {
  applyTimeRange,
  planComparison,
  planVisualization,
  transformKind,
  type ComparisonAsset,
} from "./planner";
import { explainVisualization, escapeDollarsForMarkdown } from "./explain";
import { explainConceptual } from "./conceptual/conceptExplain";
import { handleConceptualRequest } from "./conceptual/conceptualPipeline";
import type { ConceptModelCall, ConceptResearchCall } from "./conceptual/modelBridge";
import { detectConceptRefineOp } from "./conceptual/refineOps";
import {
  COMPATIBLE_KINDS,
  isConceptualKind,
  parseVisualizationSpec,
  vizSpecId,
  VIZ_SPEC_KINDS,
  type VizSpecKind,
  type VisualizationSpec,
} from "./spec";
import {
  BUILTIN_ASSETS,
  getMarketHistory,
  getMarketQuote,
  getMarketQuotes,
  historyToShadowDataset,
  MarketDataError,
} from "@/lib/marketData";

/* ------------------------------------------------------------------ */
/* Session shape                                                       */
/* ------------------------------------------------------------------ */

/** What the pipeline needs from a message (structural subset). */
export interface PipelineMessage {
  id: string;
  type: "user" | "ai";
  content: string;
  citations?: Citation[];
  researchData?: import("./types").ResearchDataBlock[];
  toolExecution?: { tool: string; status: string };
  visualization?: unknown;
}

export interface VisualizationOutcome {
  kind: "spec" | "text";
  /** Deterministic assistant text. */
  content: string;
  /** Attached validated spec (kind === "spec"). */
  spec?: VisualizationSpec;
  /** Citations to surface as source chips on the message. */
  citations?: Citation[];
}

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

/** Most recent visualization spec in the session (newest first). */
export function lastVisualizationSpec(messages: PipelineMessage[]): VisualizationSpec | null {
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    const m = messages[i];
    if (m.type !== "ai" || !m.visualization) continue;
    const spec = parseVisualizationSpec(m.visualization);
    if (spec) return spec;
  }
  return null;
}

const KNOWN_ASSET_KEYS = Object.keys(BUILTIN_ASSETS);

/** Find known asset symbols mentioned in a request (e.g. "USDT"). */
export function extractAssetSymbols(text: string): string[] {
  const found: string[] = [];
  for (const key of KNOWN_ASSET_KEYS) {
    if (new RegExp(`\\b${key}\\b`, "i").test(text)) found.push(key);
  }
  return found;
}

function provenancePhrase(provenance: VisualizationSpec["provenance"]): string {
  switch (provenance) {
    case "source-verified":
      return "source-verified research data";
    case "ai-extracted":
      return "model-extracted research data (labelled)";
    case "unverified":
      return "unverified data — treat as indicative only";
  }
}

function specMessage(spec: VisualizationSpec, notes: string[], extra?: string): VisualizationOutcome {
  const lines: string[] = [];
  lines.push(`Here is **${spec.title}** rendered from ${provenancePhrase(spec.provenance)}.`);
  if (spec.asOf) lines.push(`Data as of **${spec.asOf}**${spec.sources.length ? ` · ${spec.sources.length} source${spec.sources.length === 1 ? "" : "s"} attached` : ""}.`);
  for (const note of notes.slice(0, 3)) lines.push(`> ${note}`);
  lines.push(`Ask follow-ups like **"explain this chart"**, **"make it a line chart"** or **"compare USDT with USDC"**.`);
  if (extra) lines.push(extra);
  return {
    kind: "spec",
    content: escapeDollarsForMarkdown(lines.join("\n\n")),
    spec,
    citations: spec.sources.map((s) => ({ url: s.url, ...(s.name ? { title: s.name } : {}) })),
  };
}

function textMessage(content: string): VisualizationOutcome {
  return { kind: "text", content };
}

function marketErrorText(err: unknown, what: string): string {
  if (err instanceof MarketDataError) {
    const provider = err.provider ? ` (${err.provider.name})` : "";
    switch (err.code) {
      case "rate_limited":
        return `${what} failed: the public market-data provider${provider} is rate-limited right now. Try again in a few seconds — I won't serve stale data as a substitute.`;
      case "stealth_blocked":
        return `${what} is unavailable in Stealth Mode: external network access is disabled.`;
      case "key_required":
        return `${what} failed: this provider endpoint now requires an API key${provider}. I won't pretend the endpoint is free — data retrieval stopped instead of guessing.`;
      case "invalid_symbol":
      case "not_found":
        return `${what} failed: ${err.message}`;
      default:
        return `${what} failed: ${err.message}${provider}`;
    }
  }
  return `${what} failed: ${err instanceof Error ? err.message : String(err)}`;
}

/** Providers' attribution as citation-style sources. */
function providerSources(items: Array<{ provider: { attribution: string; attributionUrl: string }; retrievedAt: string; asOf: string }>): Citation[] {
  const seen = new Set<string>();
  const out: Citation[] = [];
  for (const item of items) {
    if (seen.has(item.provider.attributionUrl)) continue;
    seen.add(item.provider.attributionUrl);
    out.push({ url: item.provider.attributionUrl, title: item.provider.attribution });
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* Flows                                                               */
/* ------------------------------------------------------------------ */

interface PipelineInput {
  intent: VizIntent;
  request: string;
  messages: PipelineMessage[];
  now?: Date;
  /** Batch 3 — BYOK model completion for AI-assisted conceptual generation. */
  model?: ConceptModelCall;
  /** Batch 3 — provider-backed research call for gap-driven evidence. */
  research?: ConceptResearchCall;
}

async function compareFlow(baseSymbol: string, targetSymbol: string, input: PipelineInput, requestedType?: VizSpecKind): Promise<VisualizationOutcome> {
  const now = input.now ?? new Date();
  // Prefer research context if it already covers both assets.
  const context = resolveResearchContext({
    messages: input.messages as ResolverMessage[],
    request: input.request,
  });
  const assetDataset = context.datasets.find((ds) => {
    const labelCol = ds.columns.find((c) => c.type === "string");
    if (!labelCol) return false;
    const values = ds.rows.map((r) => String(r[labelCol.key] ?? "").toUpperCase());
    return values.some((v) => v.includes(baseSymbol.toUpperCase())) && values.some((v) => v.includes(targetSymbol.toUpperCase()));
  });
  if (assetDataset) {
    const result = planVisualization({
      context,
      intent: input.intent,
      datasets: [assetDataset],
      now,
    });
    if (result.status === "ok") return specMessage(result.spec, result.notes, "Comparison assembled from the research already in this conversation — no new lookups were needed.");
  }

  // Live public market data (provider-independent adapter, no AI keys).
  try {
    const { quotes, failures } = await getMarketQuotes([baseSymbol, targetSymbol]);
    if (quotes.length < 2) {
      const reasons = failures.map((f) => `- **${f.symbol}**: ${f.error.message}`).join("\n");
      return textMessage(`I could not build the comparison — live data was unavailable:\n\n${reasons}\n\nNo stale or estimated values were substituted.`);
    }
    const assets: ComparisonAsset[] = quotes.map((q) => ({
      symbol: q.symbol,
      name: q.name,
      metrics: {
        price_usd: q.priceUsd,
        change_24h_pct: q.change24hPct ?? null,
        market_cap_usd: q.marketCapUsd ?? null,
        volume_24h_usd: q.volume24hUsd ?? null,
      },
      asOf: q.asOf,
    }));
    const result = planComparison(assets, {
      title: `${baseSymbol.toUpperCase()} vs ${targetSymbol.toUpperCase()} — live market comparison`,
      requestedType: requestedType ? hintForKind(requestedType) : undefined,
      provenance: "source-verified",
      sources: quotes.map((q) => ({
        url: q.provider.attributionUrl,
        name: q.provider.attribution,
        retrievedAt: q.retrievedAt,
        dataTimestamp: q.asOf,
      })),
      gaps: [
        ...quotes.filter((q) => q.marketCapUsd === undefined).map((q) => `${q.symbol}: market cap not provided by ${q.provider.name}.`),
        ...failures.map((f) => `${f.symbol}: quote unavailable — ${f.error.message}.`),
      ],
      now,
    });
    if (result.status !== "ok") return textMessage(`I retrieved the quotes but could not encode a comparison: ${result.reason}`);
    const retrieved = quotes.map((q) => `${q.symbol} $${q.priceUsd.toPrecision(6)} (as of ${q.asOf}, ${q.provider.name})`).join(" · ");
    return specMessage(result.spec, result.notes, escapeDollarsForMarkdown(`Live retrieval: ${retrieved}.`));
  } catch (err) {
    return textMessage(marketErrorText(err, "Market-data retrieval"));
  }
}

/** Map a spec kind back to the planner's type hints for re-planning. */
function hintForKind(kind: VizSpecKind): "line" | "bar" | "bar-grouped" | "area" | "pie" | "donut" | "scatter" | "dashboard" | "table" | "timeline" | "candlestick" | undefined {
  switch (kind) {
    case "line": return "line";
    case "bar": return "bar";
    case "bar-grouped": return "bar-grouped";
    case "area": return "area";
    case "pie": return "pie";
    case "donut": return "donut";
    case "scatter": return "scatter";
    case "radar": return undefined; // no hint equivalent; planner defaults
    case "kpi-dashboard": return "dashboard";
    case "comparison-matrix": return "table";
    case "timeline": return "timeline";
    case "flowchart": return undefined;
    case "candlestick": return "candlestick";
  }
}

function parseRangeDays(timeRange: string): number | null {
  const m = timeRange.match(/(\d+)\s+(minute|hour|day|week|month|year)s?/i);
  if (!m) return null;
  const n = parseInt(m[1], 10);
  const days: Record<string, number> = { minute: 1 / 1440, hour: 1 / 24, day: 1, week: 7, month: 30, year: 365 };
  return Number.isFinite(n) ? Math.max(n * days[m[2].toLowerCase()], 1 / 1440) : null;
}

/**
 * Historical retrieval for a snapshot-only context. Returns a spec built
 * from REAL provider history, or an explicit refusal — never a stretched
 * snapshot.
 */
async function historyFlow(symbol: string, timeRange: string, input: PipelineInput): Promise<VisualizationOutcome> {
  const now = input.now ?? new Date();
  const days = parseRangeDays(timeRange) ?? 30;
  if (days < 1) {
    return textMessage(`Intraday granularity requires a provider key I don't use (keyless public APIs are daily). The most granular history I can retrieve without keys is daily.`);
  }
  try {
    const history = await getMarketHistory(symbol, Math.round(days));
    const dataset = historyToShadowDataset(history);
    const result = planVisualization({
      context: {
        datasets: [dataset],
        citations: [],
        evidence: [],
        provenance: "source-verified",
        gaps: [],
        hasNumericData: true,
      },
      intent: { ...input.intent, requestedType: input.intent.requestedType ?? "line", timeRange: undefined },
      now,
    });
    if (result.status !== "ok") return textMessage(`I retrieved ${history.points.length} days of ${symbol} history but could not encode the chart: ${result.reason}`);
    const withProviderGaps: VisualizationSpec = {
      ...result.spec,
      id: vizSpecId(result.spec.kind.split("-")[0]),
      gaps: [...result.spec.gaps, `History retrieved live from ${history.provider.name} (${history.points.length} daily points); retrieved ${history.retrievedAt}.`].slice(-16),
    };
    const outcome = specMessage(
      withProviderGaps,
      result.notes,
      `Retrieved **${history.points.length} daily data points** for ${symbol} from ${history.provider.name} — real provider history, not an interpolated snapshot.`,
    );
    return outcome;
  } catch (err) {
    return textMessage(
      `${marketErrorText(err, `Retrieving ${Math.round(days)}-day history for ${symbol}`)}\n\nThe current snapshot cannot be presented as a ${Math.round(days)}-day series — I don't fabricate history.`,
    );
  }
}

async function createFlow(input: PipelineInput): Promise<VisualizationOutcome> {
  const now = input.now ?? new Date();
  const { intent, request } = input;
  const existing = lastVisualizationSpec(input.messages);

  // "Make it a dashboard" etc. — a create request with a live spec and no
  // new data ask is a type transformation of that spec.
  if (existing && !intent.compareTarget && !intent.timeRange && intent.requestedType) {
    const target = hintToKind(intent.requestedType);
    if (target) {
      const result = transformKind(existing, target, now);
      if (result.status === "ok") return specMessage(result.spec, [...result.notes, `Switched from ${existing.kind} to ${target.replace("-", " ")}.`]);
      return textMessage(`I couldn't switch the chart: ${result.reason}`);
    }
  }

  // Comparison request.
  if (intent.compareTarget) {
    const symbols = extractAssetSymbols(request);
    const base = symbols[0] ?? "USDT";
    const target = symbols.find((s) => s !== base) ?? intent.compareTarget.toUpperCase();
    return compareFlow(base, target, input, intent.requestedType ? hintToKind(intent.requestedType) ?? undefined : undefined);
  }
  // Time-range request over an existing context or live history.
  if (intent.timeRange) {
    const symbols = extractAssetSymbols(request);
    const existingSymbol = existing ? extractAssetSymbols(existing.title)[0] : undefined;
    const symbol = symbols[0] ?? existingSymbol ?? extractAssetSymbols(input.messages.filter((m) => m.type === "ai").map((m) => m.content).join(" "))[0];
    if (symbol) return historyFlow(symbol, intent.timeRange, input);
    return textMessage(`I can apply "${intent.timeRange}" to a market series, but I couldn't tell which asset you mean. Name one (e.g. "show USDT for the last 30 days").`);
  }

  // Standard path: resolve research context from the FULL session.
  const context = resolveResearchContext({
    messages: input.messages as ResolverMessage[],
    request,
  });
  const result = planVisualization({ context, intent, now });
  if (result.status === "ok") return specMessage(result.spec, result.notes);

  // No structured data — a live quote for a known asset is NOT unrelated
  // research, so serve it (D2 scope); otherwise guide the user.
  const symbols = extractAssetSymbols(request);
  if (symbols.length > 0) {
    try {
      const quote = await getMarketQuote(symbols[0]);
      const dataset = {
        title: `${quote.symbol} live market snapshot`,
        description: `Retrieved ${quote.retrievedAt}. ${quote.provider.attribution}.`,
        columns: [
          { key: "asset", type: "string" as const },
          { key: "price_usd", type: "currency" as const, unit: "USD" },
          { key: "change_24h_pct", type: "number" as const, unit: "%" },
          { key: "market_cap_usd", type: "currency" as const, unit: "USD" },
          { key: "volume_24h_usd", type: "currency" as const, unit: "USD" },
        ],
        rows: [
          {
            asset: quote.symbol,
            price_usd: quote.priceUsd,
            change_24h_pct: quote.change24hPct ?? null,
            market_cap_usd: quote.marketCapUsd ?? null,
            volume_24h_usd: quote.volume24hUsd ?? null,
          },
        ],
        asOf: quote.asOf,
      };
      const quoteResult = planVisualization({
        context: {
          datasets: [dataset],
          citations: [{ url: quote.provider.attributionUrl, title: quote.provider.attribution }],
          evidence: [],
          provenance: "source-verified",
          gaps: quote.marketCapUsd === undefined ? [`Market cap not provided by ${quote.provider.name}.`] : [],
          hasNumericData: true,
        },
        intent: { ...intent, requestedType: intent.requestedType ?? "dashboard" },
        now,
      });
      if (quoteResult.status === "ok") {
        return specMessage(
          quoteResult.spec,
          [...quoteResult.notes, `No research was captured in this conversation yet — showing a live snapshot for ${quote.symbol} instead.`],
          `Retrieved from ${quote.provider.name} at ${quote.retrievedAt} (freshness: ${quote.freshness}).`,
        );
      }
      return textMessage(marketErrorText(new Error(quoteResult.reason), "Building the snapshot view"));
    } catch (err) {
      return textMessage(marketErrorText(err, `Retrieving a live ${symbols[0]} quote`));
    }
  }

  return textMessage(
    `${result.reason}\n\nThere is no research to visualize yet in this conversation — ask me to research a topic first (e.g. "Research the current USDT market"), then say "show me this visually".`,
  );
}

function hintToKind(hint: VizIntent["requestedType"]): VizSpecKind | null {
  if (!hint) return null;
  const allowed: VizSpecKind[] = VIZ_SPEC_KINDS;
  switch (hint) {
    case "line": return "line";
    case "bar": return "bar";
    case "bar-grouped": return "bar-grouped";
    case "bar-stacked": return "bar-grouped";
    case "pie": return "pie";
    case "donut": return "donut";
    case "area": return "area";
    case "scatter": return "scatter";
    case "histogram": return "bar";
    case "candlestick": return "candlestick";
    case "timeline": return "timeline";
    case "flowchart": return "flowchart";
    case "workflow": return "flowchart";
    case "dashboard": return "kpi-dashboard";
    case "table": return "comparison-matrix";
    case "mindmap":
    case "roadmap":
    case "decision-tree":
    case "architecture":
    case "framework":
    case "hierarchy":
    case "project-plan":
      return null; // routed to the Batch 3 conceptual pipeline before this map is consulted
    default: {
      void allowed;
      return null;
    }
  }
}

async function refineFlow(input: PipelineInput): Promise<VisualizationOutcome> {
  const now = input.now ?? new Date();
  const existing = lastVisualizationSpec(input.messages);
  if (!existing) {
    return textMessage("There's no visualization in this conversation yet to refine — create one first (e.g. ask me to visualize the research).");
  }
  const { intent } = input;

  // Comparison refinement — fetch the additional data.
  if (intent.compareTarget) {
    const symbols = extractAssetSymbols(input.request);
    const target = symbols.find((s) => !existing.title.toUpperCase().includes(s)) ?? intent.compareTarget.toUpperCase();
    const base = extractAssetSymbols(existing.title)[0] ?? extractAssetSymbols(input.request).find((s) => s !== target) ?? "USDT";
    return compareFlow(base, target, input);
  }

  // Time-range refinement — real history or an explicit refusal.
  if (intent.timeRange) {
    const rangeResult = applyTimeRange(existing, intent.timeRange, now);
    if (rangeResult.status === "ok") return specMessage(rangeResult.spec, rangeResult.notes);
    const symbols = extractAssetSymbols(input.request) .concat(extractAssetSymbols(existing.title));
    const symbol = symbols[0];
    if (symbol) return historyFlow(symbol, intent.timeRange, input);
    return textMessage(rangeResult.reason);
  }

  // Interactive flag is inherent (tooltips are always on).
  if (intent.interactive && !intent.requestedType) {
    return textMessage("The chart is already interactive — hover for exact values, use **Expand** for the large view and the full dataset table.");
  }

  // Type transformation.
  if (intent.requestedType) {
    const target = hintToKind(intent.requestedType);
    if (!target) {
      return textMessage(`"${intent.requestedType}" diagrams aren't supported yet — I can switch this to: ${COMPATIBLE_LIST(existing.kind)}.`);
    }
    const result = transformKind(existing, target, now);
    if (result.status === "ok") return specMessage(result.spec, [...result.notes, `Switched from ${existing.kind.replace("-", " ")} to ${target.replace("-", " ")}.`]);
    return textMessage(`I couldn't switch the chart: ${result.reason}\n\nSupported switches from here: ${COMPATIBLE_LIST(existing.kind)}.`);
  }

  return textMessage(`Tell me what to change — for example: "make it a line chart", "show only the last 30 days" or "compare USDT with USDC".`);
}

const COMPATIBLE_LIST = (kind: VizSpecKind): string =>
  (COMPATIBLE_KINDS[kind] ?? []).map((k) => k.replace("-", " ")).join(", ");

async function explainFlow(input: PipelineInput): Promise<VisualizationOutcome> {
  const existing = lastVisualizationSpec(input.messages);
  if (!existing) {
    return textMessage("There's no visualization in this conversation yet — ask me to create one first and then I'll explain exactly what it shows.");
  }
  // Batch 3 — conceptual diagrams are narrated from their own structure.
  if (isConceptualKind(existing.kind)) {
    return textMessage(explainConceptual(existing));
  }
  // The explanation is generated from the displayed dataset itself.
  const explanation = explainVisualization(existing);
  return textMessage(explanation);
}

/* ------------------------------------------------------------------ */
/* Entry                                                               */
/* ------------------------------------------------------------------ */

/**
 * Handle a visualization intent. Throws only on programmer error — every
 * data failure is converted into an honest text outcome.
 *
 * Batch 3 routing: conceptual type hints and conceptual refinement ops
 * go to the AI-assisted conceptual pipeline; everything else keeps the
 * deterministic Batch 2 behavior.
 */
export async function handleVisualizationRequest(input: PipelineInput): Promise<VisualizationOutcome> {
  const conceptKind = input.intent.requestedType ? conceptualHintToKind(input.intent.requestedType) : null;

  if (input.intent.kind === "explain") {
    return explainFlow(input);
  }

  // Conceptual conversions and conceptual ops refine via the Batch 3
  // pipeline (it resolves the referenced spec itself — "this", "the
  // mindmap", or the most recent visualization).
  if (input.intent.kind === "refine" && (conceptKind || detectConceptRefineOp(input.request))) {
    return handleConceptualRequest(input);
  }
  if ((input.intent.kind === "create" || input.intent.kind === "refine") && conceptKind) {
    return handleConceptualRequest(input);
  }

  switch (input.intent.kind) {
    case "refine":
      return refineFlow(input);
    case "create":
    default:
      return createFlow(input);
  }
}
