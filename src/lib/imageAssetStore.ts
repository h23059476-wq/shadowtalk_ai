/**
 * Encrypted IndexedDB image asset store.
 *
 * Cloud image providers (Tier 3 ZeroGPU Spaces today, HF Inference Router
 * later) return TEMPORARY URLs — a Space's file link dies with the session.
 * Every generated raster image is therefore immediately converted to a
 * binary Blob, encrypted with AES-256-GCM, and persisted here so nothing
 * depends on temporary Space URLs.
 *
 * Key model (device-local, honest about its threat model):
 *  - A random 256-bit key is generated once per device and stored RAW in the
 *    same IndexedDB database ("keys" store). The key never leaves the
 *    browser origin and is imported per session as a NON-extractable
 *    CryptoKey, so no script can export it back out.
 *  - Every asset gets a fresh 12-byte IV; blobs are stored as { iv, data }
 *    ciphertext bytes — a raw IndexedDB dump shows nothing but noise.
 *  - This is encryption AT REST on a shared device / synced-disk threat
 *    model. It is not E2EE: the same-origin page can always decrypt (it must,
 *    to render). That is exactly the contract chat content uses too.
 *
 * Nothing here touches localStorage — large binary payloads belong in
 * IndexedDB only.
 */
import { openDB, type IDBPDatabase } from "idb";

const ASSET_DB_NAME = "shadowtalk-image-assets";
const ASSET_DB_VERSION = 1;
const ASSET_STORE = "assets";
const KEY_STORE = "keys";
const DEVICE_KEY_NAME = "device-image-key.v1";

export interface ImageAssetMeta {
  mimeType: string;
  byteLength: number;
  createdAt: string;
  /** Provenance: "zerogpu" today; "hf-router" / "byok" possible later. */
  source?: string;
  /** The prompt that produced the image (device-local only). */
  prompt?: string;
  /** Space / model that generated it (e.g. "black-forest-labs/FLUX.1-schnell"). */
  originId?: string;
}

interface StoredAsset {
  id: string;
  iv: ArrayBuffer;
  data: ArrayBuffer;
  meta: ImageAssetMeta;
}

export interface StoredImageAsset {
  id: string;
  meta: ImageAssetMeta;
}

const ASSET_ID_PREFIX = "stimg";
const ASSET_REF_SCHEME = "stimg://";

/** A 32-byte AES-256 key, persisted raw in the keys store. */
let cachedKey: CryptoKey | null = null;
let cachedKeyLoader: Promise<CryptoKey> | null = null;

function assertCryptoAvailable(): void {
  if (typeof crypto === "undefined" || !crypto?.subtle || typeof crypto.getRandomValues !== "function") {
    throw new Error("Web Crypto is unavailable — encrypted image storage cannot run here.");
  }
}

function newAssetId(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(12));
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  return `${ASSET_ID_PREFIX}_${hex}`;
}

function getDb(): Promise<IDBPDatabase> {
  return openDB(ASSET_DB_NAME, ASSET_DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(ASSET_STORE)) db.createObjectStore(ASSET_STORE);
      if (!db.objectStoreNames.contains(KEY_STORE)) db.createObjectStore(KEY_STORE);
    },
  });
}

async function loadOrCreateDeviceKey(): Promise<CryptoKey> {
  assertCryptoAvailable();
  if (cachedKey) return cachedKey;
  if (!cachedKeyLoader) {
    cachedKeyLoader = (async () => {
      const db = await getDb();
      const existing = (await db.get(KEY_STORE, DEVICE_KEY_NAME)) as ArrayBuffer | undefined;
      if (existing instanceof ArrayBuffer && existing.byteLength === 32) {
        const key = await crypto.subtle.importKey(
          "raw",
          existing,
          { name: "AES-GCM", length: 256 },
          false, // non-extractable from here on — the raw copy stays in IndexedDB
          ["encrypt", "decrypt"],
        );
        cachedKey = key;
        return key;
      }
      const raw = crypto.getRandomValues(new Uint8Array(32));
      const key = await crypto.subtle.importKey(
        "raw",
        raw as unknown as BufferSource,
        { name: "AES-GCM", length: 256 },
        false,
        ["encrypt", "decrypt"],
      );
      await db.put(KEY_STORE, raw.slice().buffer as ArrayBuffer, DEVICE_KEY_NAME);
      cachedKey = key;
      return key;
    })();
    cachedKeyLoader = cachedKeyLoader.catch((error) => {
      cachedKeyLoader = null; // allow a clean retry after a transient failure
      throw error;
    });
  }
  return cachedKeyLoader;
}

/**
 * Encrypt a Blob with AES-256-GCM (fresh IV) and persist it.
 * Returns the stable asset id used to load/delete the asset later.
 */
export async function saveImageAsset(
  blob: Blob,
  meta: Partial<ImageAssetMeta> = {},
): Promise<StoredImageAsset> {
  assertCryptoAvailable();
  // Duck-typed instead of `instanceof Blob` — blobs can arrive from another
  // realm (Tauri webview, undici in tests) and would fail a brand check.
  if (
    !blob ||
    typeof (blob as Blob).arrayBuffer !== "function" ||
    typeof blob.size !== "number" ||
    blob.size === 0
  ) {
    throw new Error("Refusing to store an empty image asset.");
  }
  if (blob.size > 25 * 1024 * 1024) {
    throw new Error("That image is too large to store locally (25 MB limit).");
  }
  const key = await loadOrCreateDeviceKey();
  const plaintext = await blob.arrayBuffer();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, plaintext);
  const record: StoredAsset = {
    id: newAssetId(),
    iv: iv.slice().buffer as ArrayBuffer,
    data: ciphertext,
    meta: {
      mimeType: meta.mimeType || blob.type || "image/png",
      byteLength: blob.size,
      createdAt: new Date().toISOString(),
      ...(meta.source ? { source: meta.source } : {}),
      ...(meta.prompt ? { prompt: meta.prompt } : {}),
      ...(meta.originId ? { originId: meta.originId } : {}),
    },
  };
  const db = await getDb();
  await db.put(ASSET_STORE, record, record.id);
  return { id: record.id, meta: record.meta };
}

/** Decrypt and return the stored asset as a Blob (same MIME type as saved). */
export async function loadImageAssetBlob(id: string): Promise<Blob> {
  const key = await loadOrCreateDeviceKey();
  const db = await getDb();
  const record = (await db.get(ASSET_STORE, id)) as StoredAsset | undefined;
  if (!record || !(record.data instanceof ArrayBuffer)) {
    throw new Error(`Image asset ${id} is not on this device.`);
  }
  const plaintext = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: record.iv as unknown as BufferSource },
    key,
    record.data as unknown as BufferSource,
  );
  return new Blob([plaintext], { type: record.meta.mimeType });
}

/** Convenience: decrypt and wrap in a one-session object URL for <img src>. */
export async function loadImageAssetObjectUrl(id: string): Promise<string> {
  const blob = await loadImageAssetBlob(id);
  return URL.createObjectURL(blob);
}

export async function getImageAssetMeta(id: string): Promise<ImageAssetMeta | null> {
  try {
    const db = await getDb();
    const record = (await db.get(ASSET_STORE, id)) as StoredAsset | undefined;
    return record ? { ...record.meta } : null;
  } catch {
    return null;
  }
}

export async function deleteImageAsset(id: string): Promise<void> {
  try {
    const db = await getDb();
    await db.delete(ASSET_STORE, id);
  } catch {
    // ignore — the record is already gone or storage is unavailable
  }
}

export async function clearImageAssets(): Promise<void> {
  try {
    const db = await getDb();
    await db.clear(ASSET_STORE);
  } catch {
    // ignore
  }
}

export async function listImageAssets(): Promise<StoredImageAsset[]> {
  try {
    const db = await getDb();
    const records = (await db.getAll(ASSET_STORE)) as StoredAsset[];
    return records.map((r) => ({ id: r.id, meta: { ...r.meta } }));
  } catch {
    return [];
  }
}

export async function estimateImageAssetUsage(): Promise<{ count: number; bytes: number }> {
  const assets = await listImageAssets();
  return {
    count: assets.length,
    bytes: assets.reduce((sum, a) => sum + (a.meta.byteLength || 0), 0),
  };
}

/** Recognize a ShadowTalk asset reference (`stimg://<id>`) stored on messages. */
export function imageAssetReference(id: string): string {
  return `${ASSET_REF_SCHEME}${id}`;
}

export function parseImageAssetReference(value: string): string | null {
  if (typeof value !== "string" || !value.startsWith(ASSET_REF_SCHEME)) return null;
  const id = value.slice(ASSET_REF_SCHEME.length).trim();
  return id.startsWith(`${ASSET_ID_PREFIX}_`) ? id : null;
}

/** Test hook — wipes the database and the cached in-memory key. */
export async function __resetImageAssetStoreForTests(): Promise<void> {
  cachedKey = null;
  cachedKeyLoader = null;
  try {
    indexedDB.deleteDatabase(ASSET_DB_NAME);
  } catch {
    // ignore
  }
}
