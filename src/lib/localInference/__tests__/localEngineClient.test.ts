/**
 * Unit tests for the Tier-1 local inference worker MESSAGE PROTOCOL and the
 * client's recovery ladder — the worker itself is replaced by a scripted
 * MockWorker so no WebGPU/transformers stack is needed.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { HfLocalEngineClient, __resetLocalInferenceClientForTests } from "../localEngineClient";
import { HF_EMBED_MODEL, HF_ASR_MODEL } from "../hfModels";
import type { HfWorkerRequest, HfWorkerResponse } from "../protocol";

/** Scripted worker: records postMessage, replays canned responses. */
class MockWorker {
  static instances: MockWorker[] = [];
  static onInstancesChanged: ((worker: MockWorker) => void) | null = null;

  postMessages: HfWorkerRequest[] = [];
  onmessage: ((event: { data: unknown }) => void) | null = null;
  onerror: ((event: { message: string }) => void) | null = null;
  onmessageerror: (() => void) | null = null;
  terminated = false;

  constructor() {
    MockWorker.instances.push(this);
    MockWorker.onInstancesChanged?.(this);
  }

  postMessage(message: HfWorkerRequest): void {
    this.postMessages.push(message);
  }

  terminate(): void {
    this.terminated = true;
  }

  /** Simulate the worker posting a response back to the client. */
  emit(response: HfWorkerResponse): void {
    this.onmessage?.({ data: response });
  }

  /** Simulate an uncaught worker crash. */
  crash(message: string): void {
    this.onerror?.({ message });
  }

  /** All init requests this worker received (with latched forceWasm). */
  initRequests(): Array<{ forceWasm: boolean; model: string; task: string }> {
    return this.postMessages
      .filter((m): m is Extract<HfWorkerRequest, { type: "init" }> => m.type === "init")
      .map((m) => ({
        forceWasm: !!(m.payload as { forceWasm?: boolean }).forceWasm,
        model: (m.payload as { model: string }).model,
        task: (m.payload as { task: string }).task,
      }));
  }
}

function latestWorker(): MockWorker {
  return MockWorker.instances[MockWorker.instances.length - 1];
}

async function flushMicrotasks(times = 4): Promise<void> {
  for (let i = 0; i < times; i++) await Promise.resolve();
  await new Promise((resolve) => setTimeout(resolve, 0));
  await Promise.resolve();
}

function withWebGPU(): void {
  Object.defineProperty(globalThis, "navigator", {
    value: { ...navigator, gpu: {} },
    configurable: true,
    writable: true,
  });
}

describe("HfLocalEngineClient — request/response routing", () => {
  beforeEach(() => {
    MockWorker.instances = [];
    MockWorker.onInstancesChanged = null;
    withWebGPU();
    __resetLocalInferenceClientForTests();
  });

  afterEach(() => {
    __resetLocalInferenceClientForTests();
    vi.restoreAllMocks();
  });

  it("embed resolves with the worker result (request id echoes back)", async () => {
    const client = new HfLocalEngineClient({ spawnWorker: () => new MockWorker() as unknown as Worker });
    const promise = client.embedTexts(["hello", "world"], { model: HF_EMBED_MODEL });
    await flushMicrotasks();
    const worker = latestWorker();
    const sent = worker.postMessages.find((m) => m.type === "embed")!;
    expect(sent.id).toBeTruthy();

    worker.emit({
      type: "result",
      id: sent.id,
      payload: { embeddings: [[1, 0], [0, 1]], model: HF_EMBED_MODEL.repoId, device: "webgpu" },
    });
    const result = await promise;
    expect(result.embeddings).toEqual([[1, 0], [0, 1]]);
    expect(result.device).toBe("webgpu");
  });

  it("chat streams deltas before the final result", async () => {
    const client = new HfLocalEngineClient({ spawnWorker: () => new MockWorker() as unknown as Worker });
    const deltas: string[] = [];
    const promise = client.chat([{ role: "user", content: "hi" }], { onDelta: (t) => deltas.push(t) });
    await flushMicrotasks();
    const worker = latestWorker();
    const sent = worker.postMessages.find((m) => m.type === "chat")!;

    worker.emit({ type: "delta", id: sent.id, payload: { text: "Hel" } });
    worker.emit({ type: "delta", id: sent.id, payload: { text: "lo" } });
    worker.emit({ type: "result", id: sent.id, payload: { text: "Hello", model: "m", device: "wasm" } });
    const result = await promise;
    expect(deltas).toEqual(["Hel", "lo"]);
    expect(result.text).toBe("Hello");
  });

  it("downloadModel reports progress and the device that won", async () => {
    const client = new HfLocalEngineClient({ spawnWorker: () => new MockWorker() as unknown as Worker });
    const progress: number[] = [];
    const promise = client.downloadModel(HF_EMBED_MODEL, (p) => progress.push(p));
    await flushMicrotasks();
    const worker = latestWorker();
    const init = worker.postMessages.find((m) => m.type === "init")!;
    worker.emit({ type: "progress", id: init.id, payload: { status: "download", progress: 0.42 } });
    worker.emit({
      type: "ready",
      id: init.id,
      payload: { task: HF_EMBED_MODEL.task, model: HF_EMBED_MODEL.repoId, device: "wasm", downgraded: true },
    });
    worker.emit({ type: "result", id: init.id, payload: { text: "ok", model: "", device: "wasm" } });
    const result = await promise;
    expect(progress).toContain(0.42);
    expect(result.device).toBe("wasm");
    expect(result.downgraded).toBe(true);
  });

  it("signals an AbortSignal by sending chat-abort for the exact request id", async () => {
    const client = new HfLocalEngineClient({ spawnWorker: () => new MockWorker() as unknown as Worker });
    const controller = new AbortController();
    const promise = client.chat([{ role: "user", content: "long story" }], { signal: controller.signal });
    await flushMicrotasks();
    controller.abort();
    await flushMicrotasks();
    const worker = latestWorker();
    const aborts = worker.postMessages.filter((m) => m.type === "chat-abort");
    expect(aborts).toHaveLength(1);
    const chat = worker.postMessages.find((m) => m.type === "chat")!;
    expect(aborts[0].id).toBe(chat.id);
    worker.emit({ type: "result", id: chat.id, payload: { text: "partial", model: "m", device: "wasm" } });
    const result = await promise;
    expect(result.text).toBe("partial");
  });
});

describe("HfLocalEngineClient — crash & device-lost recovery ladder", () => {
  beforeEach(() => {
    MockWorker.instances = [];
    MockWorker.onInstancesChanged = null;
    withWebGPU();
    __resetLocalInferenceClientForTests();
  });

  afterEach(() => {
    __resetLocalInferenceClientForTests();
    vi.restoreAllMocks();
  });

  it("gpu-lost → terminate, respawn a clean worker, retry ONCE on WASM", async () => {
    const client = new HfLocalEngineClient({ spawnWorker: () => new MockWorker() as unknown as Worker });
    const promise = client.embedTexts(["hello"], { model: HF_EMBED_MODEL });
    await flushMicrotasks();

    const firstWorker = MockWorker.instances[0];
    const sent = firstWorker.postMessages.find((m) => m.type === "embed")!;
    // The worker reports a fatal typed error (WebGPU context lost mid-op).
    firstWorker.emit({
      type: "error",
      id: sent.id,
      payload: { kind: "gpu-lost", message: "WebGPU device was lost" },
    });
    await flushMicrotasks();

    // First worker was terminated and a CLEAN worker respawned.
    expect(firstWorker.terminated).toBe(true);
    expect(MockWorker.instances.length).toBe(2);
    const secondWorker = latestWorker();

    // The retried request arrives on the fresh worker (embed re-sent).
    const retry = secondWorker.postMessages.find((m) => m.type === "embed")!;
    expect(retry.id).toBe(sent.id);

    // Status badge surfaced the recovery.
    const status = client.getStatus();
    expect(["recovering", "loading", "ready"]).toContain(status.state);
    expect(status.respawns).toBe(1);
    expect(status.downgradedTasks).toContain("feature-extraction");

    secondWorker.emit({
      type: "result",
      id: retry.id,
      payload: { embeddings: [[0.5]], model: HF_EMBED_MODEL.repoId, device: "wasm" },
    });
    const result = await promise;
    expect(result.device).toBe("wasm");
  });

  it("an uncaught worker crash (onerror) also respawns and retries on WASM", async () => {
    const client = new HfLocalEngineClient({ spawnWorker: () => new MockWorker() as unknown as Worker });
    const promise = client.embedTexts(["x"], { model: HF_EMBED_MODEL });
    await flushMicrotasks();
    const firstWorker = MockWorker.instances[0];
    firstWorker.crash("WebGPU device was lost");
    await flushMicrotasks();
    expect(firstWorker.terminated).toBe(true);
    expect(MockWorker.instances.length).toBe(2);
    const secondWorker = latestWorker();
    const retry = secondWorker.postMessages.find((m) => m.type === "embed")!;
    secondWorker.emit({
      type: "result",
      id: retry.id,
      payload: { embeddings: [[1]], model: HF_EMBED_MODEL.repoId, device: "wasm" },
    });
    await expect(promise).resolves.toBeTruthy();
  });

  it("a second fatal failure on the retried attempt rejects with a clear message", async () => {
    const client = new HfLocalEngineClient({ spawnWorker: () => new MockWorker() as unknown as Worker });
    const promise = client.embedTexts(["x"], { model: HF_EMBED_MODEL });
    await flushMicrotasks();
    MockWorker.instances[0].emit({
      type: "error",
      id: MockWorker.instances[0].postMessages.find((m) => m.type === "embed")!.id,
      payload: { kind: "gpu-lost", message: "device lost" },
    });
    await flushMicrotasks();
    const secondWorker = latestWorker();
    secondWorker.emit({
      type: "error",
      id: secondWorker.postMessages.find((m) => m.type === "embed")!.id,
      payload: { kind: "gpu-lost", message: "device lost again" },
    });
    await expect(promise).rejects.toThrow(/GPU session was lost/i);
  });

  it("non-fatal download errors reject immediately (no pointless respawn)", async () => {
    const client = new HfLocalEngineClient({ spawnWorker: () => new MockWorker() as unknown as Worker });
    const promise = client.embedTexts(["x"], { model: HF_EMBED_MODEL });
    await flushMicrotasks();
    const instancesBefore = MockWorker.instances.length;
    const worker = latestWorker();
    worker.emit({
      type: "error",
      id: worker.postMessages.find((m) => m.type === "embed")!.id,
      payload: { kind: "download", message: "Failed to fetch model file" },
    });
    await expect(promise).rejects.toThrow(/fetch/i);
    expect(MockWorker.instances.length).toBe(instancesBefore);
  });

  it("init requests carry forceWasm when the browser has no WebGPU", async () => {
    // 'gpu' must be ABSENT from navigator — hasWebGPU checks key existence.
    Object.defineProperty(globalThis, "navigator", {
      value: {},
      configurable: true,
      writable: true,
    });
    const client = new HfLocalEngineClient({ spawnWorker: () => new MockWorker() as unknown as Worker });
    const promise = client.downloadModel(HF_ASR_STANDIN());
    await flushMicrotasks();
    const worker = latestWorker();
    const init = worker.initRequests()[0];
    expect(init.forceWasm).toBe(true);
    worker.emit({
      type: "ready",
      id: worker.postMessages.find((m) => m.type === "init")!.id,
      payload: { task: "automatic-speech-recognition", model: init.model, device: "wasm", downgraded: false },
    });
    worker.emit({ type: "result", id: worker.postMessages.find((m) => m.type === "init")!.id, payload: { text: "ok", model: "", device: "wasm" } });
    const result = await promise;
    expect(result.device).toBe("wasm");
  });

  it("remembered downgrades force WASM for the rest of the session", async () => {
    const client = new HfLocalEngineClient({ spawnWorker: () => new MockWorker() as unknown as Worker });
    // First call crashes once (gpu-lost → retry on WASM) and settles.
    const first = client.embedTexts(["x"], { model: HF_EMBED_MODEL });
    await flushMicrotasks();
    const w1 = MockWorker.instances[0];
    w1.emit({
      type: "error",
      id: w1.postMessages.find((m) => m.type === "embed")!.id,
      payload: { kind: "gpu-lost", message: "device lost" },
    });
    await flushMicrotasks();
    const w2 = latestWorker();
    w2.emit({
      type: "result",
      id: w2.postMessages.find((m) => m.type === "embed")!.id,
      payload: { embeddings: [[1]], model: HF_EMBED_MODEL.repoId, device: "wasm" },
    });
    await first;

    // A NEW call must NOT spawn a fresh worker (WASM is remembered, no new
    // crash-and-respawn cycle), and must settle on the same worker.
    const workersBefore = MockWorker.instances.length;
    const second = client.embedTexts(["y"], { model: HF_EMBED_MODEL });
    await flushMicrotasks();
    expect(MockWorker.instances.length).toBe(workersBefore);
    const lastEmbed = w2.postMessages.filter((m) => m.type === "embed").pop()!;
    w2.emit({
      type: "result",
      id: lastEmbed.id,
      payload: { embeddings: [[2]], model: HF_EMBED_MODEL.repoId, device: "wasm" },
    });
    await expect(second).resolves.toBeTruthy();
    expect(client.getStatus().downgradedTasks).toContain("feature-extraction");
  });
});

describe("HfLocalEngineClient — watchdogs", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    MockWorker.instances = [];
    MockWorker.onInstancesChanged = null;
    withWebGPU();
    __resetLocalInferenceClientForTests();
  });

  afterEach(() => {
    vi.useRealTimers();
    __resetLocalInferenceClientForTests();
    vi.restoreAllMocks();
  });

  /** flushMicrotasks for fake timers — setTimeout is virtualized here. */
  async function flushFake(): Promise<void> {
    await Promise.resolve();
    await vi.advanceTimersByTimeAsync(0);
    await Promise.resolve();
  }

  /** Warm the client so one-shot ops use their fast-path timers. */
  async function warm(client: HfLocalEngineClient): Promise<void> {
    const promise = client.downloadModel(HF_EMBED_MODEL);
    await flushFake();
    const worker = latestWorker();
    worker.emit({
      type: "ready",
      id: worker.postMessages.find((m) => m.type === "init")!.id,
      payload: { task: HF_EMBED_MODEL.task, model: HF_EMBED_MODEL.repoId, device: "webgpu", downgraded: false },
    });
    worker.emit({ type: "result", id: worker.postMessages.find((m) => m.type === "init")!.id, payload: { text: "ready", model: "", device: "webgpu" } });
    await promise;
  }

  it("a stalled embed request times out and rejects", async () => {
    const client = new HfLocalEngineClient({ spawnWorker: () => new MockWorker() as unknown as Worker });
    await warm(client);
    const promise = client.embedTexts(["x"], { model: HF_EMBED_MODEL, timeoutMs: 1000 });
    // Attach the rejection handler BEFORE firing the timer so the rejection
    // is never momentarily unhandled.
    const assertion = expect(promise).rejects.toThrow(/timed out/i);
    await flushFake();
    await vi.advanceTimersByTimeAsync(1100);
    await assertion;
  });

  it("a stalled chat request gets an abort sent before rejection", async () => {
    const client = new HfLocalEngineClient({ spawnWorker: () => new MockWorker() as unknown as Worker });
    await warm(client);
    const promise = client.chat([{ role: "user", content: "hi" }], {
      hardTimeoutMs: 2000,
    });
    const assertion = expect(promise).rejects.toThrow(/took too long/i);
    await flushFake();
    await vi.advanceTimersByTimeAsync(2200);
    await assertion;
    const worker = latestWorker();
    expect(worker.postMessages.some((m) => m.type === "chat-abort")).toBe(true);
  });
});

// Local helper for the no-WebGPU init test.
function HF_ASR_STANDIN() {
  return HF_ASR_MODEL;
}
