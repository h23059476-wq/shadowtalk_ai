/**
 * Intelligent Workspace Batch 1 — provider-aware context budget.
 *
 * The budget a conversation can occupy is NOT the model's window: output
 * tokens are reserved up-front (the current hard-coded `maxTokens: 8192` was
 * larger than several providers' entire windows), and a safety margin absorbs
 * the documented drift between our char-based estimation and real tokenizers.
 *
 *   availableForInput = contextWindow − reservedOutput − safetyMargin
 */

import { resolveModelWindow, type ProviderId } from "@/lib/tokenOptimizer/modelRegistry";

export interface ContextBudget {
  provider: ProviderId;
  model: string;
  contextWindow: number;
  reservedOutput: number;
  safetyMargin: number;
  /** Tokens available for system + memory + history + retrieved context. */
  availableForInput: number;
  source: "documented-model" | "provider-default";
  caching: "explicit" | "automatic" | "none";
}

const SAFETY_MARGIN_CAP = 1_024;
const SAFETY_MARGIN_RATIO = 0.05;

export interface ResolveBudgetOptions {
  /** Requested completion cap — clamped to the provider's own limit. */
  requestedMaxOutputTokens?: number;
}

export function resolveContextBudget(
  provider: ProviderId,
  model: string | undefined,
  opts: ResolveBudgetOptions = {},
): ContextBudget {
  const resolved = resolveModelWindow(provider, model);
  const reservedOutput = Math.min(
    resolved.maxOutputTokens,
    Math.max(256, opts.requestedMaxOutputTokens ?? resolved.maxOutputTokens),
  );
  const safetyMargin = Math.min(
    SAFETY_MARGIN_CAP,
    Math.max(64, Math.floor(resolved.contextWindow * SAFETY_MARGIN_RATIO)),
  );
  return {
    provider,
    model: model || "",
    contextWindow: resolved.contextWindow,
    reservedOutput,
    safetyMargin,
    availableForInput: Math.max(0, resolved.contextWindow - reservedOutput - safetyMargin),
    source: resolved.source,
    caching: resolved.caching,
  };
}
