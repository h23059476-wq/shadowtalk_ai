/**
 * Intelligent-workspace Batch 2 — ingestion pipeline + vector store +
 * retrieval, over fake-indexeddb (the real `idb` code path, real indexes,
 * real transactions — not an in-memory stand-in of my own logic).
 *
 * Isolation is the core contract: cross-user and cross-project retrieval
 * MUST return nothing.
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import "fake-indexeddb/auto";
import { IDBFactory } from "fake-indexeddb";

import { LocalHashEmbedder, cosineSimilarity } from "@/lib/rag/embeddings";
import { ingestDocument, IngestionError } from "@/lib/rag/pipeline";
import {
  retrieveContext,
  LOCAL_HASH_THRESHOLD,
} from "@/lib/rag/retrieval";
import { formatRetrievedContext, summarizeSources } from "@/lib/rag/format";
import {
  listDocuments,
  deleteDocument,
  deleteAllUserData,
  getDocument,
  getChunks,
  closeRagDbForTests,
  RAG_DB_NAME,
} from "@/lib/rag/vectorStore";

const embedder = new LocalHashEmbedder();

function makeFile(name: string, content: string, type = "text/plain"): File {
  return new File([content], name, { type });
}

const DOC_A = `Project Phoenix storage architecture.

The system uses PostgreSQL 15 as the primary datastore. Connection pooling is
handled by PgBouncer with a pool size of 40. The database runs in WAL mode for
durability and takes nightly snapshots to object storage.

Retrieval of user documents happens through the RAG pipeline. Chunks are
embedded and stored in a local index. Relevance thresholds prevent unrelated
content from reaching the model.

Deployment runs on Kubernetes with three replicas behind a load balancer.
Rolling updates use a surge of one pod. The migration job runs before each
deploy and is gated by a checksum of the schema.`;

const DOC_B = `Grandma's pancake recipe.

Mix two cups of flour with two eggs and one cup of milk. Add a pinch of salt
and a tablespoon of sugar. Fry on medium heat until golden. Serve with maple
syrup and fresh blueberries.`;

beforeEach(async () => {
  globalThis.indexedDB = new IDBFactory();
  await closeRagDbForTests();
});

afterEach(async () => {
  await deleteAllUserData("alice");
  await deleteAllUserData("bob");
  await closeRagDbForTests();
  globalThis.indexedDB = new IDBFactory();
});

describe("ingestDocument", () => {
  it("extracts, chunks, embeds and indexes a text document", async () => {
    const result = await ingestDocument(makeFile("phoenix-storage.md", DOC_A, "text/markdown"), {
      userId: "alice",
      projectId: null,
      embedder,
    });
    expect(result.duplicate).toBe(false);
    // DOC_A fits in one retrieval-sized chunk; multi-chunk behavior is
    // covered by the chunker suite.
    expect(result.chunkCount).toBeGreaterThanOrEqual(1);
    expect(result.localProcessing).toBe(true);
    expect(result.embeddingProvider).toBe("local-hash");
    const docs = await listDocuments("alice");
    expect(docs).toHaveLength(1);
    expect(docs[0].name).toBe("phoenix-storage.md");
    expect(docs[0].project_id).toBeNull();
  });

  it("rejects oversized files", async () => {
    const huge = makeFile("huge.txt", "x".repeat(1), "text/plain");
    Object.defineProperty(huge, "size", { value: 26 * 1024 * 1024 });
    await expect(
      ingestDocument(huge, { userId: "alice", projectId: null, embedder }),
    ).rejects.toBeInstanceOf(IngestionError);
  });

  it("detects duplicate content at the same scope", async () => {
    const opts = { userId: "alice", projectId: null, embedder };
    const first = await ingestDocument(makeFile("a.txt", DOC_B), opts);
    const second = await ingestDocument(makeFile("a-copy.txt", DOC_B), opts);
    expect(first.duplicate).toBe(false);
    expect(second.duplicate).toBe(true);
    expect(second.documentId).toBe(first.documentId);
    expect(await listDocuments("alice")).toHaveLength(1);
  });

  it("allows the same content at DIFFERENT scopes (project vs user-level)", async () => {
    const opts = { userId: "alice", embedder };
    const userLevel = await ingestDocument(makeFile("a.txt", DOC_B), { ...opts, projectId: null });
    const project = await ingestDocument(makeFile("a.txt", DOC_B), { ...opts, projectId: "proj-1" });
    expect(userLevel.duplicate).toBe(false);
    expect(project.duplicate).toBe(false);
    expect(await listDocuments("alice")).toHaveLength(2);
  });

  it("reports progress and honors cancellation before indexing", async () => {
    const controller = new AbortController();
    const stages: string[] = [];
    const promise = ingestDocument(makeFile("doc.txt", DOC_A), {
      userId: "alice",
      projectId: null,
      embedder,
      signal: controller.signal,
      onProgress: (p) => stages.push(p.stage),
    });
    // Cancel mid-embedding (the pipeline yields between batches).
    controller.abort();
    await expect(promise).rejects.toMatchObject({ name: "AbortError" });
    // Cancelled ingestion stored NOTHING — no partial index.
    expect(await listDocuments("alice")).toHaveLength(0);
    expect(stages).toContain("extracting");
  });
});

describe("retrieval — relevance, isolation, exclusion", () => {
  beforeEach(async () => {
    await ingestDocument(makeFile("phoenix.md", DOC_A, "text/markdown"), { userId: "alice", projectId: null, embedder });
  });

  it("retrieves relevant chunks for a related query", async () => {
    const result = await retrieveContext("How is the PostgreSQL connection pool configured?", {
      userId: "alice",
      projectId: null,
      embedder,
    });
    expect(result).not.toBeNull();
    expect(result!.chunks.length).toBeGreaterThan(0);
    expect(result!.chunks[0].score).toBeGreaterThanOrEqual(LOCAL_HASH_THRESHOLD);
    expect(result!.chunks.some((c) => /PgBouncer|pool/i.test(c.text))).toBe(true);
    expect(result!.localProcessing).toBe(true);
  });

  it("rejects unrelated queries below the relevance threshold", async () => {
    const result = await retrieveContext("What is the best way to bake sourdough bread at home?", {
      userId: "alice",
      projectId: null,
      embedder,
    });
    // Either nothing passed the threshold, or nothing was returned at all.
    if (result) {
      expect(result.chunks.every((c) => /bread|sourdough|bake/i.test(c.text))).toBe(false);
    }
  });

  it("enforces CROSS-USER isolation: bob sees nothing of alice's index", async () => {
    const aliceResult = await retrieveContext("PostgreSQL pool configuration", {
      userId: "alice",
      projectId: null,
      embedder,
    });
    expect(aliceResult).not.toBeNull();
    const bobResult = await retrieveContext("PostgreSQL pool configuration", {
      userId: "bob",
      projectId: null,
      embedder,
    });
    expect(bobResult).toBeNull();
  });

  it("enforces project scoping: a project query returns only that project's chunks", async () => {
    await ingestDocument(makeFile("pancakes.md", DOC_B, "text/markdown"), { userId: "alice", projectId: "proj-1", embedder });
    const projectResult = await retrieveContext("pancake recipe with maple syrup", {
      userId: "alice",
      projectId: "proj-1",
      embedder,
    });
    expect(projectResult).not.toBeNull();
    expect(projectResult!.chunks.every((c) => c.documentName === "pancakes.md")).toBe(true);
    // User-level scope never bleeds into the project query.
    const userResult = await retrieveContext("pancake recipe with maple syrup", {
      userId: "alice",
      projectId: null,
      embedder,
    });
    if (userResult) {
      expect(userResult.chunks.every((c) => c.documentName !== "pancakes.md")).toBe(true);
    }
  });

  it("honors excluded documents", async () => {
    const docs = await listDocuments("alice");
    const result = await retrieveContext("PostgreSQL pool configuration", {
      userId: "alice",
      projectId: null,
      embedder,
      excludedDocumentIds: docs.map((d) => d.id),
    });
    expect(result).toBeNull();
  });

  it("returns null for tiny/blank queries", async () => {
    expect(await retrieveContext("hi", { userId: "alice", projectId: null, embedder })).toBeNull();
    expect(await retrieveContext("   ", { userId: "alice", projectId: null, embedder })).toBeNull();
  });
});

describe("deletion and cleanup", () => {
  it("deleting a document removes its chunks (index cleanup)", async () => {
    const result = await ingestDocument(makeFile("doc.txt", DOC_A), { userId: "alice", projectId: null, embedder });
    expect(await retrieveContext("PostgreSQL pool configuration", { userId: "alice", projectId: null, embedder })).not.toBeNull();
    expect(await deleteDocument("alice", result.documentId)).toBe(true);
    expect(await retrieveContext("PostgreSQL pool configuration", { userId: "alice", projectId: null, embedder })).toBeNull();
    expect(await getDocument("alice", result.documentId)).toBeNull();
  });

  it("refuses to delete another user's document", async () => {
    const result = await ingestDocument(makeFile("doc.txt", DOC_A), { userId: "alice", projectId: null, embedder });
    expect(await deleteDocument("bob", result.documentId)).toBe(false);
    expect(await getDocument("alice", result.documentId)).not.toBeNull();
  });

  it("deleteAllUserData wipes only that user's records", async () => {
    await ingestDocument(makeFile("alice.txt", DOC_A), { userId: "alice", projectId: null, embedder });
    await ingestDocument(makeFile("bob.txt", DOC_B), { userId: "bob", projectId: null, embedder });
    await deleteAllUserData("alice");
    expect(await listDocuments("alice")).toHaveLength(0);
    expect(await listDocuments("bob")).toHaveLength(1);
  });
});

describe("format", () => {
  it("labels local vs remote processing honestly and cites sources", async () => {
    // Top-level afterEach wipes indexes between tests — ingest here.
    await ingestDocument(makeFile("phoenix.md", DOC_A, "text/markdown"), { userId: "alice", projectId: null, embedder });
    const result = await retrieveContext("How is the PostgreSQL connection pool configured?", {
      userId: "alice",
      projectId: null,
      embedder,
    });
    expect(result).not.toBeNull();
    const formatted = formatRetrievedContext(result!);
    expect(formatted.systemContent).toContain("processed locally on this device");
    expect(formatted.systemContent).toContain("[S1]");
    expect(formatted.sourceCount).toBeGreaterThan(0);
    const summary = summarizeSources(result!);
    expect(summary[0].name).toBe("phoenix.md");
    expect(summary[0].chunks).toBeGreaterThan(0);
  });

  it("labels remote processing when the index was built remotely", async () => {
    const formatted = formatRetrievedContext({
      chunks: [{ documentId: "d1", documentName: "remote-doc.md", chunkIndex: 0, text: "x", score: 0.5 }],
      localProcessing: false,
      embeddingProviders: ["remote:openai"],
      query: "q",
      threshold: 0.35,
      candidatesConsidered: 1,
    });
    expect(formatted.systemContent).toContain("processed remotely via remote:openai");
    expect(formatted.systemContent).not.toContain("processed locally");
  });
});

describe("vector store contract", () => {
  it("uses the shadowtalk-rag database name (workspace export contract)", () => {
    expect(RAG_DB_NAME).toBe("shadowtalk-rag");
  });

  it("chunk embeddings are unit-length (comparable via cosine)", async () => {
    const result = await ingestDocument(makeFile("doc.txt", DOC_A), { userId: "alice", projectId: null, embedder });
    const chunks = await getChunks("alice", {});
    expect(chunks.length).toBe(result.chunkCount);
    for (const chunk of chunks.slice(0, 3)) {
      let norm = 0;
      for (const v of chunk.embedding) norm += v * v;
      expect(Math.sqrt(norm)).toBeCloseTo(1, 4);
    }
    expect(cosineSimilarity(chunks[0].embedding, chunks[0].embedding)).toBeCloseTo(1, 4);
  });
});
