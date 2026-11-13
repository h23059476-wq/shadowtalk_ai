/**
 * Intelligent-workspace Batch 1 — token estimation, continuity protection,
 * context budgeting and non-destructive compaction.
 */
import { describe, it, expect } from "vitest";
import { estimateTokens, TOKEN_ESTIMATION_METHOD } from "@/lib/tokenOptimizer/tokenEstimation";
import { classifyMessage, extractiveSummary } from "@/lib/tokenOptimizer/importance";
import { resolveContextBudget } from "@/lib/tokenOptimizer/contextBudget";
import {
  compactForBudget,
  toRequestMessages,
  type HistoryMessage,
} from "@/lib/tokenOptimizer/compaction";

describe("estimateTokens", () => {
  it("uses ~4 chars per token for ASCII text", () => {
    expect(estimateTokens("abcdefgh")).toBe(2);
    expect(estimateTokens("")).toBe(0);
    expect(estimateTokens(null)).toBe(0);
  });

  it("counts CJK characters as ~1 token each (chars/4 would 4x overcount)", () => {
    const chinese = "这是一段中文测试文本"; // 10 CJK chars
    expect(estimateTokens(chinese)).toBeGreaterThanOrEqual(10);
    // "Hello 世界" = 6 other chars + 2 CJK → ceil(2 + 1.5) = 4
    expect(estimateTokens("Hello 世界")).toBe(4);
  });

  it("labels its estimation method", () => {
    expect(TOKEN_ESTIMATION_METHOD).toMatch(/heuristic/);
  });
});

describe("classifyMessage — continuity protection", () => {
  it("marks decisions as protected", () => {
    const { classes } = classifyMessage("We decided to use PostgreSQL for the storage layer.");
    expect(classes).toContain("decision");
  });

  it("marks requirements as protected", () => {
    const { classes } = classifyMessage("The export must support CSV and the API must stay stable.");
    expect(classes).toContain("requirement");
  });

  it("marks constraints as protected", () => {
    const { classes } = classifyMessage("We cannot exceed the free tier budget; deadline is Friday.");
    expect(classes).toContain("constraint");
  });

  it("marks unfinished tasks as protected", () => {
    const { classes } = classifyMessage("TODO: still needs the auth flow and we will deploy after review.");
    expect(classes).toContain("task");
  });

  it("marks questions as protected", () => {
    const { classes } = classifyMessage("Which database should we use for the analytics store?");
    expect(classes).toContain("question");
  });

  it("marks file and URL references as protected", () => {
    const { classes } = classifyMessage("Check src/lib/auth.ts and https://docs.example.test/api");
    expect(classes).toContain("reference");
  });

  it("a short message with critical content is still protected", () => {
    expect(classifyMessage("Decision: ship Friday.").classes.length).toBeGreaterThan(0);
  });

  it("plain chatter is not protected", () => {
    expect(classifyMessage("lol nice").classes).toHaveLength(0);
  });
});

describe("extractiveSummary", () => {
  const texts = [
    "We decided to use PostgreSQL for storage. The team also discussed lunch options at length and considered many restaurants nearby with varying menus and prices for everyone involved in the office.",
    "Requirement: the API must stay backwards compatible. Random filler sentence one about the weather today with no particular significance whatsoever to the project.",
  ];

  it("keeps the highest-scoring content within budget", () => {
    const summary = extractiveSummary(texts, 220);
    expect(summary.length).toBeLessThanOrEqual(220);
    expect(summary).toMatch(/PostgreSQL|backwards compatible/);
    expect(summary).not.toMatch(/lunch options|weather/);
  });

  it("preserves original order of selected sentences", () => {
    const summary = extractiveSummary(texts, 400);
    const postgre = summary.indexOf("PostgreSQL");
    const compat = summary.indexOf("backwards compatible");
    if (postgre >= 0 && compat >= 0) {
      expect(postgre).toBeLessThan(compat);
    }
  });

  it("keeps fenced code blocks intact when they fit", () => {
    const withCode = ["Run this:\n```sql\nSELECT * FROM users WHERE active = true;\n```"];
    const summary = extractiveSummary(withCode, 300);
    expect(summary).toContain("SELECT * FROM users");
  });
});

describe("resolveContextBudget", () => {
  it("reserves output tokens and a safety margin from the window", () => {
    const budget = resolveContextBudget("openai", "gpt-4o-mini", { requestedMaxOutputTokens: 8192 });
    expect(budget.contextWindow).toBe(128_000);
    expect(budget.reservedOutput).toBe(8_192);
    expect(budget.availableForInput).toBe(128_000 - 8_192 - budget.safetyMargin);
  });

  it("clamps requested output to the provider's documented cap", () => {
    const budget = resolveContextBudget("shared", undefined, { requestedMaxOutputTokens: 8192 });
    expect(budget.reservedOutput).toBeLessThanOrEqual(budget.contextWindow);
    expect(budget.availableForInput).toBeGreaterThanOrEqual(0);
  });

  it("never returns a negative available-for-input", () => {
    const budget = resolveContextBudget("shared", undefined, { requestedMaxOutputTokens: 8192 });
    expect(budget.availableForInput).toBeGreaterThan(0);
  });
});

describe("compactForBudget", () => {
  const CHAT_CHUNK = "Just chatting about the weather and other everyday small talk topics with plenty of words to make this message reasonably long for testing purposes here, elaborating further on completely mundane details that carry no project significance at all and never will.";

  function history(count: number, protectedText?: string): HistoryMessage[] {
    const messages: HistoryMessage[] = [];
    for (let i = 0; i < count; i++) {
      messages.push({
        id: `m${i}`,
        role: i % 2 === 0 ? "user" : "assistant",
        content: `${CHAT_CHUNK} (turn ${i})`,
      });
    }
    if (protectedText) {
      // A short, old, critical decision — must survive compaction.
      messages[2] = { id: "m2", role: "user", content: protectedText };
    }
    return messages;
  }

  const tightBudget = () => resolveContextBudget("shared", undefined, { requestedMaxOutputTokens: 8192 });

  it("returns the full conversation untouched when it fits", () => {
    const messages = history(8);
    const result = compactForBudget({ messages, budget: tightBudget(), fixedPrefixTokens: 100 });
    expect(result.telemetry.applied).toBe(false);
    expect(result.outgoing).toHaveLength(8);
    expect(result.outgoing.every((e) => e.kind === "message")).toBe(true);
    // Non-destructive: input array unchanged.
    expect(messages).toHaveLength(8);
  });

  it("compacts the oldest unprotected runs when over budget", () => {
    const messages = history(40);
    const result = compactForBudget({
      messages,
      budget: tightBudget(),
      fixedPrefixTokens: 22_000, // force over-budget
      recentKeepCount: 4,
    });
    expect(result.telemetry.applied).toBe(true);
    expect(result.telemetry.compactedMessageCount).toBeGreaterThan(0);
    const summaries = result.outgoing.filter((e) => e.kind === "summary");
    expect(summaries.length).toBeGreaterThan(0);
    // Recent tail survives verbatim.
    const keptIndices = result.outgoing
      .filter((e): e is Extract<typeof e, { kind: "message" }> => e.kind === "message")
      .map((e) => e.sourceIndex);
    expect(keptIndices).toContain(39);
    expect(keptIndices).toContain(37);
  });

  it("NEVER compacts continuity-protected messages regardless of age", () => {
    const decision = "We decided to use PostgreSQL. Requirement: keep the API stable.";
    const messages = history(40, decision);
    const result = compactForBudget({
      messages,
      budget: tightBudget(),
      fixedPrefixTokens: 22_000,
      recentKeepCount: 4,
    });
    const keptIndices = result.outgoing
      .filter((e): e is Extract<typeof e, { kind: "message" }> => e.kind === "message")
      .map((e) => e.sourceIndex);
    expect(keptIndices).toContain(2); // the protected message survives verbatim
    // Its full text is intact — summaries never overwrite it.
    const keptDecision = result.outgoing.find(
      (e) => e.kind === "message" && e.sourceIndex === 2,
    ) as Extract<typeof result.outgoing[number], { kind: "message" }>;
    expect(keptDecision.message.content).toBe(decision);
  });

  it("records source-message traceability for every summary block", () => {
    const messages = history(40);
    const result = compactForBudget({
      messages,
      budget: tightBudget(),
      fixedPrefixTokens: 22_000,
      recentKeepCount: 4,
    });
    expect(result.blocks.length).toBeGreaterThan(0);
    for (const block of result.blocks) {
      expect(block.sourceMessageIds.length).toBe(block.sourceCount);
      expect(block.sourceMessageIds.every((id) => id.startsWith("m") || id.startsWith("msg") || id.startsWith("hist"))).toBe(true);
      expect(block.summary.length).toBeGreaterThan(0);
    }
  });

  it("produces a request-ordered message sequence via toRequestMessages", () => {
    const messages = history(40);
    const result = compactForBudget({
      messages,
      budget: tightBudget(),
      fixedPrefixTokens: 22_000,
      recentKeepCount: 4,
    });
    const requestMessages = toRequestMessages(result);
    // Every compacted run renders exactly one system summary block.
    const summaryBlocks = requestMessages.filter((m) => m.role === "system");
    expect(summaryBlocks.length).toBe(result.blocks.length);
    for (const block of summaryBlocks) {
      expect(block.content).toContain("[Compacted earlier conversation");
      expect(block.content).toContain("originals remain in history");
    }
  });

  it("preserves chronological ordering of kept messages", () => {
    const messages = history(40);
    const result = compactForBudget({
      messages,
      budget: tightBudget(),
      fixedPrefixTokens: 22_000,
      recentKeepCount: 4,
    });
    const outgoingOrder = result.outgoing
      .filter((e): e is Extract<typeof e, { kind: "message" }> => e.kind === "message")
      .map((e) => e.sourceIndex);
    // Kept messages must appear in ascending original order — a summary that
    // re-orders the conversation invents narrative.
    const ascending = [...outgoingOrder].sort((a, b) => a - b);
    expect(outgoingOrder).toEqual(ascending);
  });
});
