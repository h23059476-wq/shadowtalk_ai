/**
 * Intelligent-workspace Batch 2 — chunker + embeddings.
 */
import { describe, it, expect } from "vitest";
import { chunkText } from "@/lib/rag/chunker";
import {
  LocalHashEmbedder,
  RemoteEmbedder,
  cosineSimilarity,
  EMBEDDING_CAPABLE_PROVIDERS,
  getEmbeddingPreference,
  setEmbeddingPreference,
} from "@/lib/rag/embeddings";

describe("chunkText", () => {
  it("splits long text into ~1600-char chunks", () => {
    const paragraph = "This is a reasonably long paragraph about the storage architecture of the system. ";
    const text = Array.from({ length: 60 }, (_, i) => `Paragraph ${i}. ${paragraph.repeat(2)}`).join("\n\n");
    const chunks = chunkText(text);
    expect(chunks.length).toBeGreaterThan(3);
    for (const chunk of chunks) {
      expect(chunk.text.length).toBeLessThanOrEqual(1_600 + 400); // sentence-fit tolerance
    }
  });

  it("keeps short text as a single chunk", () => {
    const chunks = chunkText("Short document. Nothing more.");
    expect(chunks).toHaveLength(1);
    expect(chunks[0].index).toBe(0);
  });

  it("adds overlap between consecutive chunks so boundary facts stay retrievable", () => {
    const sentence = "The launch code for the project is ALPHABET-7 stored in the vault. ";
    const text = sentence.repeat(40);
    const chunks = chunkText(text, { targetChars: 800, overlapChars: 200 });
    if (chunks.length > 1) {
      // The overlap property: the head of chunk N+1 re-uses content that
      // appears in chunk N (so a fact at the boundary is indexed twice).
      const headOfSecond = chunks[1].text.slice(0, 100);
      expect(chunks[0].text).toContain(headOfSecond.slice(0, 60));
    }
  });

  it("splits a single giant paragraph by sentences", () => {
    const text = "A".repeat(50) + ". " + "B".repeat(50) + ". " + "C".repeat(1900) + ".";
    const chunks = chunkText(text, { targetChars: 800, overlapChars: 0 });
    expect(chunks.length).toBeGreaterThan(1);
  });

  it("is deterministic", () => {
    const text = "Deterministic content. ".repeat(200);
    expect(chunkText(text).map((c) => c.text)).toEqual(chunkText(text).map((c) => c.text));
  });

  it("returns empty for blank input", () => {
    expect(chunkText("   \n\n  ")).toEqual([]);
  });
});

describe("LocalHashEmbedder", () => {
  const embedder = new LocalHashEmbedder();

  it("produces deterministic L2-normalized vectors of fixed dimension", async () => {
    const [a] = await embedder.embed(["The database uses WAL mode for durability."]);
    const [b] = await embedder.embed(["The database uses WAL mode for durability."]);
    expect(a).toHaveLength(embedder.dim);
    let norm = 0;
    for (const v of a) norm += v * v;
    expect(Math.sqrt(norm)).toBeCloseTo(1, 5);
    expect(a).toEqual(b);
  });

  it("ranks lexically related text above unrelated text", async () => {
    const query = (await embedder.embed(["how do I configure the postgres connection pool?"]))[0];
    const related = (await embedder.embed(["configure the postgres connection pool size in the database config"]))[0];
    const unrelated = (await embedder.embed(["delicious pancake recipe with blueberries and maple syrup"]))[0];
    const relatedScore = cosineSimilarity(query, related);
    const unrelatedScore = cosineSimilarity(query, unrelated);
    expect(relatedScore).toBeGreaterThan(unrelatedScore);
    expect(relatedScore).toBeGreaterThan(0.4);
  });

  it("handles CJK text without crashing and keeps determinism", async () => {
    const [a] = await embedder.embed(["数据库配置文件在项目根目录"]);
    const [b] = await embedder.embed(["数据库配置文件在项目根目录"]);
    expect(a).toEqual(b);
    expect(a.every((v) => Number.isFinite(v))).toBe(true);
  });
});

describe("RemoteEmbedder", () => {
  it("refuses providers without a documented embeddings API", () => {
    expect(() => new RemoteEmbedder("openrouter", "key")).toThrow(/embeddings API/);
    expect(() => new RemoteEmbedder("deepseek", "key")).toThrow(/embeddings API/);
    expect(() => new RemoteEmbedder("anthropic", "key")).toThrow(/embeddings API/);
  });

  it("accepts only documented providers", () => {
    expect(EMBEDDING_CAPABLE_PROVIDERS.has("openai")).toBe(true);
    expect(EMBEDDING_CAPABLE_PROVIDERS.has("gemini")).toBe(true);
    expect(EMBEDDING_CAPABLE_PROVIDERS.has("perplexity")).toBe(false);
    expect(EMBEDDING_CAPABLE_PROVIDERS.has("groq")).toBe(false);
  });

  it("sends the documented OpenAI embeddings shape and restores input order", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        data: [
          { index: 1, embedding: [0.4, 0.5, 0.6] },
          { index: 0, embedding: [0.1, 0.2, 0.3] },
        ],
      }),
    });
    vi.stubGlobal("fetch", fetchMock);
    try {
      const embedder = new RemoteEmbedder("openai", "sk-test");
      const result = await embedder.embed(["first", "second"]);
      const [url, init] = fetchMock.mock.calls[0];
      expect(url).toBe("https://api.openai.com/v1/embeddings");
      const body = JSON.parse(init.body);
      expect(body.model).toBe("text-embedding-3-small");
      expect(body.input).toEqual(["first", "second"]);
      // Order restored by the documented index field.
      expect(result[0]).toEqual([0.1, 0.2, 0.3]);
      expect(result[1]).toEqual([0.4, 0.5, 0.6]);
      expect(embedder.local).toBe(false);
    } finally {
      vi.unstubAllGlobals();
    }
  });
});

describe("embedding preference (consent gating)", () => {
  it("defaults to local", () => {
    expect(getEmbeddingPreference("user-x").kind).toBe("local");
  });

  it("persists explicit remote consent and rejects unknown providers", () => {
    setEmbeddingPreference("user-x", { kind: "remote", provider: "openai", consentedAt: new Date().toISOString() });
    expect(getEmbeddingPreference("user-x")).toMatchObject({ kind: "remote", provider: "openai" });
    // Forged preference naming a provider without embeddings support → local.
    localStorage.setItem("shadowtalk.rag.embedding.v1.user-y", JSON.stringify({ kind: "remote", provider: "openrouter", consentedAt: "now" }));
    expect(getEmbeddingPreference("user-y").kind).toBe("local");
  });
});
