// Compatibility shim — the canonical worker now lives at
// `src/workers/webllm.worker.ts` (same handler, same engine). This file only
// re-exports it so any stale reference keeps working while the engine and
// the model manager both spawn the canonical path.
import "./workers/webllm.worker";
