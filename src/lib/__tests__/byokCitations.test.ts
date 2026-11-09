/**
 * Batch 1 (Research-to-Visualization) — citation preservation across the SSE
 * pipeline.
 *
 * Regression: provider web-search citations (OpenRouter `url_citation`
 * annotations, Perplexity top-level `citations`/`search_results`, Anthropic
 * `citations_delta` events) were silently destroyed at the SSE layer — only
 * `delta.content` was read — which made source-preserving visualization
 * impossible. They must now survive into `CloudChatResult.citations`, deduped
 * by URL, without ever breaking a stream on unexpected shapes.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("@/integrations/firebase/app", () => ({
  fbAuth: () => ({ currentUser: { uid: "user-1" } }),
  functionsBaseUrl: "https://functions.test",
}));

import { streamByokChat, type ByokConfig } from "@/lib/byok";

const fetchMock = vi.fn();
vi.stubGlobal("fetch", fetchMock);

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

const OPENROUTER_CFG: ByokConfig = {
  provider: "openrouter",
  apiKey: "sk-or-test",
  model: "test-model",
  mode: "always",
};

const PERPLEXITY_CFG: ByokConfig = {
  provider: "perplexity",
  apiKey: "pplx-test",
  model: "sonar",
  mode: "always",
};

const ANTHROPIC_CFG: ByokConfig = {
  provider: "anthropic",
  apiKey: "sk-ant-test",
  model: "claude-haiku-4-5-20251001",
  mode: "always",
};

describe("byok citation capture — openrouter annotations", () => {
  beforeEach(() => {
    fetchMock.mockReset();
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.stubGlobal("fetch", fetchMock);
  });

  it("collects url_citation annotations and returns them with the result", async () => {
    const sse =
      'data: {"choices":[{"delta":{"content":"USDT trades at $1.00"}}]}\n\n' +
      'data: {"choices":[{"delta":{"annotations":[{"type":"url_citation","url_citation":{"url":"https://www.coingecko.com/en/cards/tether","title":"Tether price"}}]}}]}\n\n' +
      'data: {"choices":[{"delta":{"content":" according to sources."}}]}\n\n' +
      'data: [DONE]\n\n';
    fetchMock.mockResolvedValue(sseResponse(sse));

    const result = await streamByokChat(OPENROUTER_CFG, [{ role: "user", content: "q" }], {
      webSearch: true,
    });
    expect(result.error).toBeUndefined();
    expect(result.content).toBe("USDT trades at $1.00 according to sources.");
    expect(result.citations).toEqual([
      { url: "https://www.coingecko.com/en/cards/tether", title: "Tether price" },
    ]);
  });

  it("dedupes repeated citations across chunks by URL", async () => {
    const ann = (url: string) =>
      `data: {"choices":[{"delta":{"annotations":[{"type":"url_citation","url_citation":{"url":"${url}","title":"t"}}]}}]}\n\n`;
    const sse =
      ann("https://a.example/1") + ann("https://a.example/1") + ann("https://b.example/2") + "data: [DONE]\n\n";
    fetchMock.mockResolvedValue(sseResponse(sse));

    const result = await streamByokChat(OPENROUTER_CFG, [{ role: "user", content: "q" }], {});
    expect(result.citations).toHaveLength(2);
  });

  it("never breaks the stream on malformed annotation shapes", async () => {
    const sse =
      'data: {"choices":[{"delta":{"content":"ok"}}]}\n\n' +
      'data: {"choices":[{"delta":{"annotations":[{"type":"url_citation"},{"weird":true},null]}}]}\n\n' +
      'data: [DONE]\n\n';
    fetchMock.mockResolvedValue(sseResponse(sse));

    const result = await streamByokChat(OPENROUTER_CFG, [{ role: "user", content: "q" }], {});
    expect(result.content).toBe("ok");
    expect(result.citations).toBeUndefined();
  });

  it("returns undefined citations when none are present", async () => {
    fetchMock.mockResolvedValue(
      sseResponse('data: {"choices":[{"delta":{"content":"plain"}}]}\n\ndata: [DONE]\n\n'),
    );
    const result = await streamByokChat(OPENROUTER_CFG, [{ role: "user", content: "q" }], {});
    expect(result.citations).toBeUndefined();
  });
});

describe("byok citation capture — perplexity native search", () => {
  beforeEach(() => {
    fetchMock.mockReset();
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.stubGlobal("fetch", fetchMock);
  });

  it("converts top-level citation strings and search_results objects", async () => {
    const sse =
      'data: {"choices":[{"delta":{"content":"answer"}}],"citations":["https://x.example/1"],"search_results":[{"title":"X Result","url":"https://x.example/2"}]}\n\n' +
      "data: [DONE]\n\n";
    fetchMock.mockResolvedValue(sseResponse(sse));

    const result = await streamByokChat(PERPLEXITY_CFG, [{ role: "user", content: "q" }], {
      webSearch: true,
    });
    expect(result.citations).toEqual([
      { url: "https://x.example/1" },
      { url: "https://x.example/2", title: "X Result" },
    ]);
  });
});

describe("byok citation capture — anthropic citations_delta", () => {
  beforeEach(() => {
    fetchMock.mockReset();
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.stubGlobal("fetch", fetchMock);
  });

  it("collects citations from citation deltas without breaking text streaming", async () => {
    const sse =
      'data: {"type":"content_block_delta","delta":{"type":"text_delta","text":"Hi"}}\n\n' +
      'data: {"type":"content_block_delta","delta":{"type":"citations_delta","citation":{"url":"https://c.example/1","title":"Cite"}}}\n\n' +
      'data: {"type":"content_block_delta","delta":{"type":"text_delta","text":" there"}}\n\n' +
      'data: {"type":"message_stop"}\n\n';
    fetchMock.mockResolvedValue(sseResponse(sse));

    const result = await streamByokChat(ANTHROPIC_CFG, [{ role: "user", content: "q" }], {});
    expect(result.content).toBe("Hi there");
    expect(result.citations).toEqual([{ url: "https://c.example/1", title: "Cite" }]);
  });
});
