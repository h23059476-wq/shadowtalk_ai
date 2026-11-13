/**
 * Intelligent Workspace Batch 2 (Stealth RAG) — local vector store.
 *
 * IndexedDB database `shadowtalk-rag` — the name fulfills the dormant
 * workspace export contract in useWorkspaceExport.ts, which already reads
 * every store of this database when exporting/importing a workspace.
 *
 * ISOLATION MODEL (critical):
 *  - IndexedDB is origin-scoped, NOT user-scoped. Two accounts can share a
 *    browser profile, so EVERY record carries `user_id` (+ `project_id`,
 *    null = user-level chat-attached scope) and EVERY read/write path
 *    filters by the authenticated user id at the data layer. Cross-user
 *    isolation is enforced here and proven by dedicated tests — it does not
 *    rely on DB naming or UI gating.
 *  - Document text and embeddings live on-device only. Nothing is uploaded
 *    to Firestore or Storage. Remote embeddings (if the user opted in) send
 *    chunk text to the user's own provider at ingestion time — that is the
 *    only network touch, and it is disclosed in the UI.
 *
 * IMPLEMENTATION NOTE: uses the RAW IndexedDB API through a micro-promise
 * helper instead of the `idb` package — pulling idb's type declarations into
 * the app-side TypeScript program poisoned global type resolution in
 * unrelated modules (generic DB types clashed with lib.dom narrowing).
 * Operations are the exact ones the idb helpers wrap: transactions, stores,
 * indexes, cursors.
 */

export const RAG_DB_NAME = "shadowtalk-rag";
const DB_VERSION = 1;

export interface RagDocumentRecord {
  id: string;
  user_id: string;
  /** null = user-level (chat-attached), otherwise the workspace project id. */
  project_id: string | null;
  name: string;
  mimeType: string;
  sizeBytes: number;
  charCount: number;
  chunkCount: number;
  /** content hash (hex) — duplicate detection. */
  contentHash: string;
  /** "local-hash" or "remote:<provider>" — disclosure + re-index decisions. */
  embeddingProvider: string;
  /** true = every embedding for this document was computed on-device. */
  localProcessing: boolean;
  createdAt: string;
}

export interface RagChunkRecord {
  id: string;
  document_id: string;
  user_id: string;
  project_id: string | null;
  chunk_index: number;
  text: string;
  embedding: number[];
  createdAt: string;
}

function req<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("IndexedDB request failed"));
  });
}

function done(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onabort = () => reject(tx.error ?? new Error("IndexedDB transaction aborted"));
    tx.onerror = () => reject(tx.error ?? new Error("IndexedDB transaction failed"));
  });
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(RAG_DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains("documents")) {
        const documents = db.createObjectStore("documents", { keyPath: "id" });
        documents.createIndex("user_id", "user_id");
        documents.createIndex("user_project", ["user_id", "project_id"]);
      }
      if (!db.objectStoreNames.contains("chunks")) {
        const chunks = db.createObjectStore("chunks", { keyPath: "id" });
        chunks.createIndex("user_id", "user_id");
        chunks.createIndex("document_id", "document_id");
        chunks.createIndex("user_project", ["user_id", "project_id"]);
      }
      if (!db.objectStoreNames.contains("meta")) {
        db.createObjectStore("meta", { keyPath: "key" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Could not open the RAG database"));
  });
}

let dbPromise: Promise<IDBDatabase> | null = null;

function getDb(): Promise<IDBDatabase> {
  if (!dbPromise) dbPromise = openDb();
  return dbPromise;
}

/** FNV-1a (two rounds) hex content hash — duplicate detection. */
export function contentHash(text: string): string {
  const h1 = fnv(text, 0x811c9dc5);
  const h2 = fnv(text, 0x01000193 ^ text.length);
  return `${h1.toString(16).padStart(8, "0")}${h2.toString(16).padStart(8, "0")}`;
}

function fnv(text: string, seed: number): number {
  let hash = seed;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

export interface PutDocumentInput {
  document: RagDocumentRecord;
  chunks: Array<Omit<RagChunkRecord, "createdAt">>;
}

/** Insert a document and its chunks in ONE transaction — no partial indexes. */
export async function putDocument(input: PutDocumentInput): Promise<void> {
  const db = await getDb();
  const now = new Date().toISOString();
  const tx = db.transaction(["documents", "chunks"], "readwrite");
  tx.objectStore("documents").put(input.document);
  const chunkStore = tx.objectStore("chunks");
  for (const chunk of input.chunks) {
    chunkStore.put({ ...chunk, createdAt: now });
  }
  await done(tx);
}

/** Iterate an index cursor inside an open readwrite transaction, deleting entries. */
async function drainCursorForDelete(index: IDBIndex, keyValue: IDBValidKey): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const request = index.openCursor(keyValue);
    request.onsuccess = () => {
      const cursor = request.result;
      if (cursor) {
        cursor.delete();
        cursor.continue();
      } else {
        resolve();
      }
    };
    request.onerror = () => reject(request.error ?? new Error("Cursor failed"));
  });
}

/** Delete a document AND all of its chunks/embeddings in one transaction. */
export async function deleteDocument(userId: string, documentId: string): Promise<boolean> {
  const db = await getDb();
  const doc = (await req(db.transaction("documents").objectStore("documents").get(documentId))) as RagDocumentRecord | undefined;
  if (!doc || doc.user_id !== userId) return false;
  const tx = db.transaction(["documents", "chunks"], "readwrite");
  tx.objectStore("documents").delete(documentId);
  await drainCursorForDelete(tx.objectStore("chunks").index("document_id"), documentId);
  await done(tx);
  return true;
}

export interface ListDocumentsOptions {
  projectId?: string | null;
}

/** List a user's documents, optionally scoped to one project. */
export async function listDocuments(userId: string, opts: ListDocumentsOptions = {}): Promise<RagDocumentRecord[]> {
  const db = await getDb();
  const all = (await req(db.transaction("documents").index("user_id").getAll(userId))) as RagDocumentRecord[];
  if (opts.projectId === undefined) return all;
  return all.filter((d) => d.project_id === opts.projectId);
}

export interface GetChunksOptions {
  projectId?: string | null;
  documentIds?: string[];
}

/**
 * Fetch a user's chunks for retrieval, strictly user-scoped, optionally
 * narrowed to one project. Project queries return ONLY that project's
 * chunks; user-level queries return ONLY user-level chunks — cross-scope
 * bleed is a privacy bug, not a feature.
 */
export async function getChunks(userId: string, opts: GetChunksOptions = {}): Promise<RagChunkRecord[]> {
  const db = await getDb();
  const all = (await req(db.transaction("chunks").index("user_id").getAll(userId))) as RagChunkRecord[];
  let scoped = all;
  if (opts.projectId !== undefined) {
    scoped = scoped.filter((c) => c.project_id === opts.projectId);
  }
  if (opts.documentIds) {
    const allowed = new Set(opts.documentIds);
    scoped = scoped.filter((c) => allowed.has(c.document_id));
  }
  return scoped;
}

/** Every indexed document+chunk for a user — used by data-cleanup paths. */
export async function deleteAllUserData(userId: string): Promise<void> {
  const db = await getDb();
  const tx = db.transaction(["documents", "chunks"], "readwrite");
  for (const storeName of ["documents", "chunks"] as const) {
    await drainCursorForDelete(tx.objectStore(storeName).index("user_id"), userId);
  }
  await done(tx);
}

export async function getDocument(userId: string, documentId: string): Promise<RagDocumentRecord | null> {
  const db = await getDb();
  const doc = (await req(db.transaction("documents").objectStore("documents").get(documentId))) as RagDocumentRecord | undefined;
  return doc && doc.user_id === userId ? doc : null;
}

/** Test hook: close and forget the shared connection. */
export async function closeRagDbForTests(): Promise<void> {
  if (dbPromise) {
    const db = await dbPromise;
    db.close();
    dbPromise = null;
  }
}
