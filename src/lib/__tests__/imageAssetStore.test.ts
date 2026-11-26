/**
 * Encrypted IndexedDB image asset store tests — over fake-indexeddb with
 * real Web Crypto (the shared setup stub strips crypto.subtle), exercising
 * the real `idb` code path, real AES-256-GCM rounds, and the raw ciphertext
 * layout that hits disk.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import "fake-indexeddb/auto";
import { IDBFactory } from "fake-indexeddb";
import { webcrypto } from "node:crypto";

vi.stubGlobal("crypto", webcrypto);

import {
  clearImageAssets,
  deleteImageAsset,
  estimateImageAssetUsage,
  getImageAssetMeta,
  imageAssetReference,
  listImageAssets,
  loadImageAssetBlob,
  parseImageAssetReference,
  saveImageAsset,
  __resetImageAssetStoreForTests,
} from "@/lib/imageAssetStore";
import { openDB } from "idb";

const PNG_BYTES = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10, 0, 1, 2, 3, 250, 251, 252, 253]);

function pngBlob(): Blob {
  return new Blob([PNG_BYTES], { type: "image/png" });
}

beforeEach(async () => {
  // Fresh database per test — no cross-test key reuse.
  globalThis.indexedDB = new IDBFactory();
  await __resetImageAssetStoreForTests();
});

afterEach(async () => {
  await __resetImageAssetStoreForTests();
});

describe("saveImageAsset / loadImageAssetBlob roundtrip", () => {
  it("stores and restores identical bytes with the original MIME type", async () => {
    const { id } = await saveImageAsset(pngBlob(), { source: "zerogpu", prompt: "snowy owl", originId: "black-forest-labs/FLUX.1-schnell" });
    expect(id).toMatch(/^stimg_[0-9a-f]{24}$/);

    const restored = await loadImageAssetBlob(id);
    expect(restored.type).toBe("image/png");
    const bytes = new Uint8Array(await restored.arrayBuffer());
    expect(Array.from(bytes)).toEqual(Array.from(PNG_BYTES));
  });

  it("records provenance metadata", async () => {
    const { id } = await saveImageAsset(pngBlob(), { source: "zerogpu", prompt: "snowy owl" });
    const meta = await getImageAssetMeta(id);
    expect(meta?.source).toBe("zerogpu");
    expect(meta?.prompt).toBe("snowy owl");
    expect(meta?.mimeType).toBe("image/png");
    expect(meta?.byteLength).toBe(PNG_BYTES.byteLength);
    expect(new Date(meta!.createdAt).toString()).not.toBe("Invalid Date");
  });

  it("defaults the MIME type from the blob", async () => {
    const { id } = await saveImageAsset(new Blob([PNG_BYTES]));
    expect((await getImageAssetMeta(id))?.mimeType).toBe("image/png");
  });
});

describe("encryption at rest", () => {
  it("persists ciphertext (never plaintext bytes) with a fresh IV per asset", async () => {
    const a = await saveImageAsset(pngBlob());
    const b = await saveImageAsset(pngBlob());

    const db = await openDB("shadowtalk-image-assets", 1);
    const recordA = (await db.get("assets", a.id)) as { iv: ArrayBuffer; data: ArrayBuffer };
    const recordB = (await db.get("assets", b.id)) as { iv: ArrayBuffer; data: ArrayBuffer };

    const stored = new Uint8Array(recordA.data);
    expect(Array.from(stored.slice(0, 16))).not.toEqual(Array.from(PNG_BYTES)); // encrypted
    expect(stored.byteLength).toBeGreaterThanOrEqual(PNG_BYTES.byteLength); // GCM tag overhead
    expect(Array.from(new Uint8Array(recordA.iv))).not.toEqual(Array.from(new Uint8Array(recordB.iv))); // unique IVs

    // Both records decrypt to the same plaintext — the roundtrip is stable.
    const blobA = await loadImageAssetBlob(a.id);
    const blobB = await loadImageAssetBlob(b.id);
    expect(Array.from(new Uint8Array(await blobA.arrayBuffer()))).toEqual(Array.from(PNG_BYTES));
    expect(Array.from(new Uint8Array(await blobB.arrayBuffer()))).toEqual(Array.from(PNG_BYTES));
  });
});

describe("lifecycle helpers", () => {
  it("deletes, lists, estimates usage, and clears", async () => {
    const a = await saveImageAsset(pngBlob());
    const b = await saveImageAsset(pngBlob(), { mimeType: "image/jpeg" });

    expect((await listImageAssets()).map((x) => x.id).sort()).toEqual([a.id, b.id].sort());
    const usage = await estimateImageAssetUsage();
    expect(usage.count).toBe(2);
    expect(usage.bytes).toBe(PNG_BYTES.byteLength * 2);

    await deleteImageAsset(a.id);
    await expect(loadImageAssetBlob(a.id)).rejects.toThrow(/not on this device/);
    expect((await estimateImageAssetUsage()).count).toBe(1);

    await clearImageAssets();
    expect((await estimateImageAssetUsage()).count).toBe(0);
  });

  it("refuses empty and oversized payloads", async () => {
    await expect(saveImageAsset(new Blob([]))).rejects.toThrow(/empty image asset/);
    const big = new Blob([new Uint8Array(25 * 1024 * 1024 + 1)]);
    await expect(saveImageAsset(big)).rejects.toThrow(/25 MB limit/);
  });
});

describe("asset references", () => {
  it("roundtrips stimg:// references and rejects foreign schemes", () => {
    const id = "stimg_0123456789abcdef01234567";
    const ref = imageAssetReference(id);
    expect(ref).toBe(`stimg://${id}`);
    expect(parseImageAssetReference(ref)).toBe(id);
    expect(parseImageAssetReference("https://example.com/x.png")).toBeNull();
    expect(parseImageAssetReference("stimg://junk")).toBeNull();
    expect(parseImageAssetReference("")).toBeNull();
  });
});
