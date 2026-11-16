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
const engine = new MLCEngine();

const handler = new (WebWorkerMLCEngineHandler as any)(engine);

self.onmessage = (msg: MessageEvent) => {
  handler.onmessage(msg);
};
