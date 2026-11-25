import { MLCEngine, WebWorkerMLCEngineHandler } from "@mlc-ai/web-llm";

// Canonical WebLLM worker for ShadowTalk. ONE handler per worker instance —
// the app spawns this file twice:
//   1. chat engine      (LocalInferenceEngine → private chat completions)
//   2. embedding engine (modelManager → local vector RAG via embeddings.create)
// All model initialization, weight caching (per-shard), chat completions and
// embeddings therefore run off the main thread; the UI never blocks.
//
// The cache backend is NOT switched to IndexedDB here: web-llm's default
// (Cache API) is what every shipped build already caches shards into, and
// appConfig is supplied from the main thread (mirror fallback rewrites the
// weight URLs). Keep this worker config-free on purpose.

// ── Adapter-request ladder ─────────────────────────────────────────────────
// web-llm's detectGPUDevice() asks ONCE with powerPreference "high-
// performance" and throws "Unable to find a compatible GPU…" when that single
// request returns null. Whole classes of real machines have no high-perform-
// ance adapter but DO have a usable one: hardware acceleration disabled (the
// browser may still expose a low-power/software adapter), VMs and remote
// desktops (SwiftShader), iGPU-only laptops that reject the dGPU request.
// On those devices the old code hard-failed a fully downloaded model — 880MB
// cached, "Failed to initialize local AI engine", no way forward.
//
// The shim wraps requestAdapter ONCE per worker: if the caller's request
// (however it was phrased) comes back null, walk the ladder — low-power,
// default, then an explicit software adapter — and remember the winner so
// later calls short-circuit. The page-side probe in deviceCapabilities.ts
// uses the same ladder so the settings card tells the same story.
type AdapterRequest = (options?: Record<string, unknown>) => Promise<unknown>;
const gpu = (navigator as unknown as { gpu?: { requestAdapter?: AdapterRequest } } | undefined)?.gpu;
if (gpu?.requestAdapter) {
  const raw = gpu.requestAdapter.bind(gpu);
  let winner: Record<string, unknown> | null = null;
  (gpu as { requestAdapter: AdapterRequest }).requestAdapter = async (options?: Record<string, unknown>) => {
    if (winner) {
      try { return await raw(winner); } catch { winner = null; }
    }
    const first = await raw(options).catch(() => null);
    if (first) {
      winner = options ?? {};
      return first;
    }
    // The caller's phrasing found nothing — walk the ladder before giving up.
    for (const candidate of [
      { powerPreference: "low-power" },
      {},
      { forceSoftware: true }, // SwiftShader / CPU-backed WebGPU (slow but real)
    ]) {
      try {
        const adapter = await raw(candidate);
        if (adapter) {
          winner = candidate;
          console.info("[webllm.worker] falling back to a software/low-power adapter:", JSON.stringify(candidate));
          return adapter;
        }
      } catch {
        /* try the next rung */
      }
    }
    return null;
  };
}

const engine = new MLCEngine();

const handler = new (WebWorkerMLCEngineHandler as any)(engine);

self.onmessage = (msg: MessageEvent) => {
  handler.onmessage(msg);
};
