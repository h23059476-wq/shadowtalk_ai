/**
 * Intelligent-workspace Batch 1 — provider usage telemetry.
 *
 * 1. Unit: parse documented OpenAI-compatible and Anthropic usage shapes.
 * 2. Integration (SSE level): streamByokChat surfaces `usage` from a real
 *    SSE byte stream — the payloads that were previously dropped at the
 *    stream layer. These are full stream simulations over the actual client
 *    code path (fetch mocked at the network boundary only).
 * 3. Anthropic explicit caching: cache_control breakpoints on the stable
 *    prefix when the estimated prefix can exceed the 1024-token minimum.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("@/integrations/firebase/app", () => ({
  fbAuth: () => ({ currentUser: { uid: "user-1" } }),
  functionsBaseUrl: "https://functions.test",
}));

import { streamByokChat, type ByokConfig } from "@/lib/byok";
import {
  parseOpenAiUsageChunk,
  parseAnthropicUsageEvent,
  mergeUsage,
} from "@/lib/tokenOptimizer/usage";

const fetchMock = vi.fn();
vi.stubGlobal("fetch", fetchMock);

const OPENAI_CFG: ByokConfig = {
  provider: "openai",
  apiKey: "sk-test",
  model: "gpt-4o-mini",
  mode: "always",
};

const ANTHROPIC_CFG: ByokConfig = {
  provider: "anthropic",
  apiKey: "sk-ant-test",
  model: "claude-haiku-4-5-20251001",
  mode: "always",
};

function sseResponse(chunks: string, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    body: new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new TextEncoder().encode(chunks));
        controller.close();
      },
    }),
    json: async () => ({}),
  } as unknown as Response;
}

function requestBody(): Record<string, unknown> {
  const init = fetchMock.mock.calls[0][1] as { body: string };
  return JSON.parse(init.body);
}

describe("parseOpenAiUsageChunk", () => {
  it("parses the documented OpenAI final-chunk shape", () => {
    const usage = parseOpenAiUsageChunk({
      usage: { prompt_tokens: 1200, completion_tokens: 340 },
    });
    expect(usage?.inputTokens).toBe(1200);
    expect(usage?.outputTokens).toBe(340);
    expect(usage?.measured).toBe(true);
  });

  it("parses OpenAI cached-token details", () => {
    const usage = parseOpenAiUsageChunk({
      usage: {
        prompt_tokens: 1200,
        completion_tokens: 340,
        prompt_tokens_details: { cached_tokens: 800 },
      },
    });
    expect(usage?.cachedInputTokens).toBe(800);
  });

  it("parses DeepSeek's prompt_cache_hit_tokens field", () => {
    const usage = parseOpenAiUsageChunk({
      usage: { prompt_tokens: 900, completion_tokens: 100, prompt_cache_hit_tokens: 640 },
    });
    expect(usage?.cachedInputTokens).toBe(640);
  });

  it("returns null when no usage is present (estimation fallback)", () => {
    expect(parseOpenAiUsageChunk({ choices: [{ delta: { content: "hi" } }] })).toBeNull();
    expect(parseOpenAiUsageChunk({})).toBeNull();
    expect(parseOpenAiUsageChunk(null)).toBeNull();
  });
});

describe("parseAnthropicUsageEvent", () => {
  it("parses message_start input usage including cache reads", () => {
    const usage = parseAnthropicUsageEvent({
      type: "message_start",
      message: { usage: { input_tokens: 900, cache_read_input_tokens: 600, cache_creation_input_tokens: 50 } },
    });
    expect(usage?.inputTokens).toBe(1550); // 900 base + 600 cache-read + 50 cache-write
    expect(usage?.cachedInputTokens).toBe(600);
  });

  it("parses message_delta cumulative output", () => {
    const usage = parseAnthropicUsageEvent({ type: "message_delta", usage: { output_tokens: 412 } });
    expect(usage?.outputTokens).toBe(412);
  });

  it("ignores other event types", () => {
    expect(parseAnthropicUsageEvent({ type: "content_block_delta", delta: { text: "x" } })).toBeNull();
  });
});

describe("mergeUsage", () => {
  it("combines message_start and message_delta reports", () => {
    const merged = mergeUsage(
      { inputTokens: 900, measured: true },
      { outputTokens: 412, measured: true },
    );
    expect(merged?.inputTokens).toBe(900);
    expect(merged?.outputTokens).toBe(412);
    expect(merged?.measured).toBe(true);
  });
});

describe("streamByokChat — usage capture over a real SSE stream", () => {
  beforeEach(() => {
    fetchMock.mockReset();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.stubGlobal("fetch", fetchMock);
  });

  it("surfaces measured usage from the final chunk (include_usage providers)", async () => {
    fetchMock.mockResolvedValue(
      sseResponse(
        'data: {"choices":[{"delta":{"content":"Hello"}}]}\n\n' +
          'data: {"choices":[{"delta":{}}],"usage":{"prompt_tokens":812,"completion_tokens":97,"prompt_tokens_details":{"cached_tokens":512}}}\n\n' +
          "data: [DONE]\n\n",
      ),
    );
    const result = await streamByokChat(OPENAI_CFG, [{ role: "user", content: "hi" }], {});
    expect(result.content).toBe("Hello");
    expect(result.usage?.measured).toBe(true);
    expect(result.usage?.inputTokens).toBe(812);
    expect(result.usage?.outputTokens).toBe(97);
    expect(result.usage?.cachedInputTokens).toBe(512);
  });

  it("requests stream_options.include_usage only for documented providers", async () => {
    fetchMock.mockResolvedValue(sseResponse("data: [DONE]\n\n"));
    await streamByokChat(OPENAI_CFG, [{ role: "user", content: "hi" }], {});
    expect(requestBody().stream_options).toEqual({ include_usage: true });

    fetchMock.mockReset();
    fetchMock.mockResolvedValue(sseResponse("data: [DONE]\n\n"));
    const geminiCfg: ByokConfig = { provider: "gemini", apiKey: "k", model: "gemini-2.0-flash", mode: "always" };
    await streamByokChat(geminiCfg, [{ role: "user", content: "hi" }], {});
    expect(requestBody().stream_options).toBeUndefined();
  });

  it("falls back to undefined usage (estimation) when the provider sends none", async () => {
    fetchMock.mockResolvedValue(sseResponse('data: {"choices":[{"delta":{"content":"ok"}}]}\n\ndata: [DONE]\n\n'));
    const result = await streamByokChat(OPENAI_CFG, [{ role: "user", content: "hi" }], {});
    expect(result.usage).toBeUndefined();
  });

  it("surfaces Anthropic usage from message_start + message_delta events", async () => {
    fetchMock.mockResolvedValue(
      sseResponse(
        'data: {"type":"message_start","message":{"usage":{"input_tokens":640,"cache_read_input_tokens":128}}}\n\n' +
          'data: {"type":"content_block_delta","delta":{"text":"Hi"}}\n\n' +
          'data: {"type":"message_delta","usage":{"output_tokens":53}}\n\n',
      ),
    );
    const result = await streamByokChat(ANTHROPIC_CFG, [{ role: "user", content: "hello" }], {});
    expect(result.content).toBe("Hi");
    expect(result.usage?.inputTokens).toBe(768);
    expect(result.usage?.outputTokens).toBe(53);
    expect(result.usage?.cachedInputTokens).toBe(128);
  });

  it("adds Anthropic cache_control breakpoints when the prefix is large enough", async () => {
    // >1024 estimated tokens of system + history → caching applies.
    const longSystem = "You are a helpful assistant. ".repeat(120);
    const longHistory = "Earlier discussion with plenty of detailed content. ".repeat(40);
    fetchMock.mockResolvedValue(
      sseResponse('data: {"type":"message_stop"}\n\n'),
    );
    await streamByokChat(
      ANTHROPIC_CFG,
      [
        { role: "system", content: longSystem },
        { role: "user", content: longHistory },
        { role: "user", content: "continue" },
      ],
      {},
    );
    const body = requestBody();
    const systemPayload = body.system as Array<{ type: string; cache_control?: { type: string } }>;
    expect(Array.isArray(systemPayload)).toBe(true);
    expect(systemPayload[0].cache_control?.type).toBe("ephemeral");
    const lastMessage = (body.messages as Array<{ content: Array<{ cache_control?: { type: string } }> }>).at(-1);
    expect(lastMessage?.content.at(-1)?.cache_control?.type).toBe("ephemeral");
  });

  it("skips cache_control on short prefixes (below Anthropic's 1024-token minimum)", async () => {
    fetchMock.mockResolvedValue(sseResponse('data: {"type":"message_stop"}\n\n'));
    await streamByokChat(ANTHROPIC_CFG, [{ role: "user", content: "tiny" }], {});
    const body = requestBody();
    expect(body.system).toBeUndefined();
    const messages = body.messages as Array<{ content: Array<{ cache_control?: unknown }> }>;
    expect(messages[0].content.at(-1)?.cache_control).toBeUndefined();
  });
});
