/**
 * Unit tests for the Tier-1 offline model cache manager: URL → repo mapping,
 * inventory grouping, per-model and full-cache deletion. All Cache API access
 * goes through an injectable stub — no real browser storage touched.
 */
import { describe, it, expect } from "vitest";
import {
  HF_CACHE_NAME,
  hfRepoIdFromUrl,
  groupHfCacheRequests,
  getHfCacheInventory,
  deleteHfModelCache,
  deleteAllHfCache,
  formatCacheBytes,
  type MinimalCacheStorage,
  type MinimalCache,
} from "../hfCacheManager";

/** Minimal Cache API stub backed by a Map<url, Response>. */
function makeCacheStorage(entries: Record<string, number>): MinimalCacheStorage {
  const map = new Map<string, Response>();
  for (const [url, bytes] of Object.entries(entries)) {
    map.set(url, new Response("", { headers: { "content-length": String(bytes) } }));
  }
  const cache: MinimalCache = {
    async keys() {
      return [...map.keys()].map((url) => new Request(url));
    },
    async match(request: RequestInfo | URL) {
      const url = typeof request === "string" ? request : request instanceof Request ? request.url : String(request);
      return map.get(url);
    },
    async delete(request: RequestInfo | URL) {
      const url = typeof request === "string" ? request : request instanceof Request ? request.url : String(request);
      return map.delete(url);
    },
  };
  return {
    async open(name: string) {
      if (name !== HF_CACHE_NAME) throw new Error(`no cache named ${name}`);
      return cache;
    },
    async has(name: string) {
      return name === HF_CACHE_NAME;
    },
  };
}

describe("hfRepoIdFromUrl — HF resolve URL parsing", () => {
  it("extracts org/name from resolve URLs", () => {
    expect(hfRepoIdFromUrl("https://huggingface.co/onnx-community/whisper-tiny.en/resolve/main/onnx/encoder.onnx")).toBe(
      "onnx-community/whisper-tiny.en",
    );
    expect(hfRepoIdFromUrl("https://huggingface.co/Xenova/all-MiniLM-L6-v2/resolve/main/tokenizer.json")).toBe(
      "Xenova/all-MiniLM-L6-v2",
    );
    expect(hfRepoIdFromUrl("https://huggingface.co/mixedbread-ai/mxbai-embed-xsmall-v1/resolve/main/onnx/model.onnx?download=true")).toBe(
      "mixedbread-ai/mxbai-embed-xsmall-v1",
    );
  });

  it("rejects foreign URLs and garbage", () => {
    expect(hfRepoIdFromUrl("https://cdn.jsdelivr.net/npm/@huggingface/transformers/dist/ort.wasm")).toBeNull();
    expect(hfRepoIdFromUrl("https://huggingface.co/api/models?search=x")).toBeNull();
    expect(hfRepoIdFromUrl("https://example.com/onnx-community/whisper/resolve/main/x.onnx")).toBeNull();
    expect(hfRepoIdFromUrl("not a url")).toBeNull();
    expect(hfRepoIdFromUrl("/relative/path")).toBeNull();
  });
});

describe("groupHfCacheRequests — pure inventory grouping", () => {
  it("groups files per repo and sums bytes", () => {
    const grouped = groupHfCacheRequests([
      { url: "https://huggingface.co/onnx-community/whisper-tiny.en/resolve/main/onnx/encoder.onnx", bytes: 100 },
      { url: "https://huggingface.co/onnx-community/whisper-tiny.en/resolve/main/onnx/decoder.onnx", bytes: 250 },
      { url: "https://huggingface.co/onnx-community/whisper-tiny.en/resolve/main/tokenizer.json", bytes: 50 },
      { url: "https://huggingface.co/onnx-community/Qwen2.5-0.5B-Instruct/resolve/main/onnx/model.onnx_data", bytes: 520 },
    ]);
    expect(grouped.size).toBe(2);
    const whisper = grouped.get("onnx-community/whisper-tiny.en")!;
    expect(whisper.files).toBe(3);
    expect(whisper.bytes).toBe(400);
    expect(whisper.hasWeights).toBe(true);
    expect(whisper.task).toBe("automatic-speech-recognition");

    const qwen = grouped.get("onnx-community/Qwen2.5-0.5B-Instruct")!;
    expect(qwen.hasWeights).toBe(true);
    expect(qwen.bytes).toBe(520);
  });

  it("marks repos without .onnx files as not having weights", () => {
    const grouped = groupHfCacheRequests([
      { url: "https://huggingface.co/org/some-model/resolve/main/config.json", bytes: 10 },
    ]);
    expect(grouped.get("org/some-model")!.hasWeights).toBe(false);
  });

  it("ignores foreign URLs and counts missing content-length as 0 bytes", () => {
    const grouped = groupHfCacheRequests([
      { url: "https://example.com/not-hf/x", bytes: 10 },
      { url: "https://huggingface.co/org/m/resolve/main/onnx/a.onnx", bytes: -1 },
    ]);
    expect(grouped.size).toBe(1);
    expect(grouped.get("org/m")!.bytes).toBe(0);
  });
});

describe("getHfCacheInventory — Cache API snapshot", () => {
  it("returns per-model entries with sizes and origin estimate", async () => {
    const storage = makeCacheStorage({
      "https://huggingface.co/onnx-community/whisper-tiny.en/resolve/main/onnx/encoder.onnx": 1024 * 1024 * 40,
      "https://huggingface.co/onnx-community/whisper-tiny.en/resolve/main/onnx/decoder.onnx": 1024 * 1024 * 60,
      "https://huggingface.co/onnx-community/Qwen2.5-0.5B-Instruct/resolve/main/onnx/model.onnx": 1024 * 1024 * 500,
    });
    const inventory = await getHfCacheInventory(storage);
    expect(inventory.models).toHaveLength(2);
    expect(inventory.totalBytes).toBe((40 + 60 + 500) * 1024 * 1024);
    const whisper = inventory.models.find((m) => m.repoId === "onnx-community/whisper-tiny.en")!;
    expect(whisper.files).toBe(2);
    expect(whisper.hasWeights).toBe(true);
    expect(whisper.definition?.displayName).toContain("Whisper");
  });

  it("degrades to an empty inventory without a Cache API", async () => {
    const inventory = await getHfCacheInventory(null);
    expect(inventory.models).toHaveLength(0);
    expect(inventory.totalBytes).toBe(0);
  });

  it("ignores entries from foreign caches", async () => {
    const storage = makeCacheStorage({});
    const inventory = await getHfCacheInventory(storage);
    expect(inventory.models).toHaveLength(0);
  });
});

describe("deleteHfModelCache — per-model cache eviction", () => {
  it("deletes only the target repo's files and reports the count", async () => {
    const storage = makeCacheStorage({
      "https://huggingface.co/onnx-community/whisper-tiny.en/resolve/main/onnx/encoder.onnx": 1,
      "https://huggingface.co/onnx-community/whisper-tiny.en/resolve/main/onnx/decoder.onnx": 2,
      "https://huggingface.co/onnx-community/Qwen2.5-0.5B-Instruct/resolve/main/onnx/model.onnx": 3,
    });
    const removed = await deleteHfModelCache("onnx-community/whisper-tiny.en", storage);
    expect(removed).toBe(2);
    const inventory = await getHfCacheInventory(storage);
    expect(inventory.models.map((m) => m.repoId)).toEqual(["onnx-community/Qwen2.5-0.5B-Instruct"]);
  });

  it("is a no-op without a Cache API", async () => {
    expect(await deleteHfModelCache("org/m", null)).toBe(0);
  });
});

describe("deleteAllHfCache — full wipe", () => {
  it("removes every entry and returns the count", async () => {
    const storage = makeCacheStorage({
      "https://huggingface.co/a/b/resolve/main/onnx/a.onnx": 1,
      "https://huggingface.co/c/d/resolve/main/onnx/b.onnx": 2,
      "https://huggingface.co/c/d/resolve/main/tokenizer.json": 3,
    });
    expect(await deleteAllHfCache(storage)).toBe(3);
    const inventory = await getHfCacheInventory(storage);
    expect(inventory.models).toHaveLength(0);
    expect(inventory.totalBytes).toBe(0);
  });
});

describe("formatCacheBytes — honest size display", () => {
  it("formats KB / MB / GB", () => {
    expect(formatCacheBytes(0)).toBe("0 MB");
    expect(formatCacheBytes(512 * 1024)).toBe("512 KB");
    expect(formatCacheBytes(1024 * 1024 * 88)).toBe("88 MB");
    expect(formatCacheBytes(1024 * 1024 * 1024 * 1.2)).toBe("1.2 GB");
  });
});
