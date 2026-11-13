/**
 * Intelligent Workspace Batch 1 — non-destructive conversation compaction.
 *
 * Contract (per the initiative's product principles):
 *  - The ORIGINAL conversation is never mutated, deleted or overwritten.
 *    Compaction only reshapes the OUTGOING request; full history remains in
 *    state + Firestore, and every summary block records the exact source
 *    message ids it replaced (traceability + recovery).
 *  - Project continuity outranks token savings: messages classified into
 *    protected classes (decisions, requirements, constraints, tasks,
 *    questions, references) are always kept verbatim, no matter how old.
 *    A recent tail is also kept verbatim so the model always sees the live
 *    conversation.
 *  - Summaries are extractive and computed locally — zero provider calls,
 *    zero unexpected cost, works offline.
 */

import { classifyMessage, extractiveSummary } from "@/lib/tokenOptimizer/importance";
import { estimateTokens } from "@/lib/tokenOptimizer/tokenEstimation";
import type { ContextBudget } from "@/lib/tokenOptimizer/contextBudget";

export interface HistoryMessage {
  /** Stable message id (state/Firestore id) — traceability anchor. */
  id?: string;
  role: "user" | "assistant" | "system";
  content: string;
}

export interface CompactionBlock {
  id: string;
  kind: "extractive";
  summary: string;
  summaryTokens: number;
  /** Ids (or synthetic indices) of the exact messages this block replaced. */
  sourceMessageIds: string[];
  sourceCount: number;
  createdAt: string;
}

export interface CompactionTelemetry {
  applied: boolean;
  compactedMessageCount: number;
  compactedCharCount: number;
  summaryTokens: number;
  /** Estimated tokens of the assembled request AFTER compaction. */
  estimatedInputTokens: number;
  /** Estimated tokens freed by compaction (estimate-only, labeled as such). */
  estimatedSavingsTokens: number;
}

/**
 * One entry of the assembled outgoing sequence, in original order. Message
 * entries REFERENCE the source array by index — callers keep their original
 * message objects (including rich array content like vision image parts),
 * which compaction never re-shapes or re-orders.
 */
export type OutgoingEntry =
  | { kind: "message"; sourceIndex: number; message: HistoryMessage }
  | { kind: "summary"; block: CompactionBlock };

export interface CompactOptions {
  /** Conversation history in chronological order (system directives excluded). */
  messages: HistoryMessage[];
  budget: ContextBudget;
  /** Estimated tokens of everything fixed above the history (system+memory). */
  fixedPrefixTokens: number;
  /** Estimated tokens reserved for retrieved document context. */
  retrievalTokens?: number;
  /** Newest messages always kept verbatim. */
  recentKeepCount?: number;
  /** Per-summary-block character budget. */
  maxSummaryChars?: number;
}

export interface CompactResult {
  /** Assembled outgoing sequence in original order. */
  outgoing: OutgoingEntry[];
  /** Summary blocks replacing compacted runs, in original order. */
  blocks: CompactionBlock[];
  telemetry: CompactionTelemetry;
}

const DEFAULT_RECENT_KEEP = 6;
const DEFAULT_SUMMARY_CHARS = 1_600;
/** Anthropic prompt-cache minimum is 1024 tokens; below this, caching is pointless. */
const MIN_SUMMARY_BLOCK_TOKENS = 24;

function syntheticId(prefix: string, index: number): string {
  return `${prefix}-${index}`;
}

/**
 * Compact a conversation to fit the budget. When everything already fits,
 * the input is returned untouched (applied: false). Compaction walks from
 * the oldest message, replacing contiguous runs of UNPROTECTED messages
 * with one extractive summary block per run, until the estimated total
 * fits. Protected messages and the recent tail act as run boundaries and
 * are never summarized.
 */
export function compactForBudget(opts: CompactOptions): CompactResult {
  const {
    messages,
    budget,
    fixedPrefixTokens,
    retrievalTokens = 0,
    recentKeepCount = DEFAULT_RECENT_KEEP,
    maxSummaryChars = DEFAULT_SUMMARY_CHARS,
  } = opts;

  const estimateAll = messages.reduce((n, m) => n + estimateTokens(m.content), 0);
  const available = Math.max(0, budget.availableForInput - fixedPrefixTokens - retrievalTokens);
  const telemetryBase = {
    compactedMessageCount: 0,
    compactedCharCount: 0,
    summaryTokens: 0,
  };

  if (estimateAll <= available || messages.length === 0) {
    return {
      outgoing: messages.map((message, sourceIndex) => ({ kind: "message" as const, sourceIndex, message })),
      blocks: [],
      telemetry: {
        applied: false,
        ...telemetryBase,
        estimatedInputTokens: fixedPrefixTokens + retrievalTokens + estimateAll,
        estimatedSavingsTokens: 0,
      },
    };
  }

  // Classify once. The recent tail is protected by POSITION, not content —
  // the newest messages are the live conversation regardless of markers.
  const recentStart = Math.max(0, messages.length - recentKeepCount);
  const isProtected = messages.map((m, i) =>
    i >= recentStart || m.role === "system" || classifyMessage(m.content).classes.length > 0
      ? true
      : false
  );

  // Partition into runs of contiguous compactable messages.
  const runs: Array<{ start: number; end: number; messages: HistoryMessage[] }> = [];
  let current: { start: number; end: number; messages: HistoryMessage[] } | null = null;
  for (let i = 0; i < messages.length; i++) {
    if (isProtected[i]) {
      if (current) {
        runs.push(current);
        current = null;
      }
    } else if (current) {
      current.end = i;
      current.messages.push(messages[i]);
    } else {
      current = { start: i, end: i, messages: [messages[i]] };
    }
  }
  if (current) runs.push(current);

  // Greedily compact oldest runs first until the estimate fits.
  const blocks: CompactionBlock[] = [];
  // Parallel to `runs`: the block that replaced each run (null = run kept).
  const blocksByRun: Array<CompactionBlock | null> = [];
  let freedTokens = 0;
  let compactedCount = 0;
  let compactedChars = 0;
  let summaryTokensTotal = 0;
  let createdBlocks = 0;

  const afterCompactionEstimate = () =>
    estimateAll - freedTokens + summaryTokensTotal;

  for (const run of runs) {
    blocksByRun.push(null);
    const runTokens = run.messages.reduce((n, m) => n + estimateTokens(m.content), 0);
    if (afterCompactionEstimate() <= available) break;

    const runChars = run.messages.reduce((n, m) => n + m.content.length, 0);
    const summaryText = extractiveSummary(
      run.messages.map((m) => m.content),
      Math.min(maxSummaryChars, Math.max(300, Math.floor(runChars * 0.35))),
    );
    if (!summaryText) continue;
    const summaryTokens = Math.max(MIN_SUMMARY_BLOCK_TOKENS, estimateTokens(summaryText));
    // A summary must actually free room — an extractive summary of a tiny
    // run can be nearly as large as the run itself; skip those.
    if (runTokens - summaryTokens < 64) continue;

    const block: CompactionBlock = {
      id: `cmp-${budget.model || budget.provider}-${Date.now()}-${createdBlocks++}`,
      kind: "extractive",
      summary: summaryText,
      summaryTokens,
      sourceMessageIds: run.messages.map((m, i) =>
        m.id ?? syntheticId("msg", run.start + i)
      ),
      sourceCount: run.messages.length,
      createdAt: new Date().toISOString(),
    };

    blocks.push(block);
    blocksByRun[blocksByRun.length - 1] = block;
    freedTokens += runTokens;
    summaryTokensTotal += summaryTokens;
    compactedCount += run.messages.length;
    compactedChars += runChars;
  }

  // Rebuild the outgoing sequence honoring original order: compacted runs
  // are replaced by their block at the run's position; kept messages
  // reference the ORIGINAL objects by index (rich content passes through
  // untouched).
  const outgoing: OutgoingEntry[] = [];
  let runCursor = 0;
  for (let i = 0; i < messages.length; i++) {
    const run = runs[runCursor];
    const runBlock = blocksByRun[runCursor];
    if (run && i === run.start && runBlock) {
      outgoing.push({ kind: "summary", block: runBlock });
      i += run.messages.length - 1;
      runCursor += 1;
      continue;
    }
    if (run && i === run.start) {
      // Run existed but produced no block (too small to be worth it).
      for (let j = run.start; j <= run.end; j++) {
        outgoing.push({ kind: "message", sourceIndex: j, message: messages[j] });
      }
      i = run.end;
      runCursor += 1;
      continue;
    }
    outgoing.push({ kind: "message", sourceIndex: i, message: messages[i] });
  }

  return {
    outgoing,
    blocks,
    telemetry: {
      applied: blocks.length > 0,
      compactedMessageCount: compactedCount,
      compactedCharCount: compactedChars,
      summaryTokens: summaryTokensTotal,
      estimatedInputTokens: fixedPrefixTokens + retrievalTokens + (estimateAll - freedTokens + summaryTokensTotal),
      estimatedSavingsTokens: Math.max(0, freedTokens - summaryTokensTotal),
    },
  };
}

/**
 * Convenience view for string-only callers: the outgoing sequence as plain
 * role/content messages, with summary blocks rendered as system entries.
 */
export function toRequestMessages(
  result: CompactResult,
): Array<{ role: "user" | "assistant" | "system"; content: string }> {
  return result.outgoing.map((entry) =>
    entry.kind === "message"
      ? { role: entry.message.role, content: entry.message.content }
      : {
          role: "system" as const,
          content:
            `[Compacted earlier conversation — ${entry.block.sourceCount} messages summarized; ` +
            `originals remain in history]\n${entry.block.summary}`,
        },
  );
}
