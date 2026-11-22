/**
 * Self-hosted model mirror — $0 resilience outside any single CDN.
 *
 * WebLLM resolves every model file (mlc-chat-config.json, tokenizer files,
 * per-shard weights) flat against the ModelRecord.model URL. Per the installed
 * web-llm source (cleanModelUrl), a URL matching "/resolve/<rev>/" is used
 * verbatim — otherwise "resolve/main/" is appended (the Hugging Face layout).
 * That single rule makes two free hosting recipes work:
 *
 *   1. Cloudflare R2 public bucket (or any static host that preserves
 *      directories and allows >100MB objects): upload each model's files
 *      under "<slug>/resolve/main/…" and use a template like
 *      "https://<bucket>.r2.dev/{slug}/resolve/main/". Fits every model.
 *
 *   2. GitHub Pages (one repo per model, ≤1GB repo limit — starter + 1B tiers):
 *      push the files under "resolve/main/…" on the published branch and use
 *      "https://<owner>.github.io/model-{slug}/resolve/main/". NOTE: the
 *      "/resolve/<rev>/" infix is REQUIRED — web-llm appends "resolve/main/"
 *      itself when the URL lacks it. GitHub RELEASE assets are flat (no
 *      subdirectories) so they cannot satisfy the path shape — Releases do
 *      NOT work here; use Pages or R2.
 *
 * The template comes from VITE_MODEL_MIRROR_URL_TEMPLATE and MUST contain a
 * "{slug}" placeholder (replaced with the model's repo slug, e.g.
 * "Qwen2.5-0.5B-Instruct-q4f16_1-MLC"). Unset ⇒ the built-in ShadowTalk
 * weights mirror is used (orphan `weights` branch of this repo, served by
 * raw.githubusercontent.com with CORS — see DEFAULT_MIRROR_TEMPLATE);
 * an invalid override (no {slug}) ⇒ mirror disabled and everything behaves
 * exactly as before. For the built-in mirror, the mirrored models' model_lib
 * WASM URLs are ALSO rewritten to our own copy on the weights branch (see
 * WASM_MIRROR_BASE) — the default mlc-ai URLs stay untouched for every
 * non-mirrored model.
 */
import { prebuiltAppConfig, type AppConfig } from "@mlc-ai/web-llm";
import { MODEL_REGISTRY } from "@/ai/ModelRegistry";

/**
 * Built-in $0 mirror: the universal starter's two 0.5B twins live on the
 * orphan `weights` branch of this repo (models/<slug>/resolve/main/…), served
 * by raw.githubusercontent.com — CORS verified in-browser (ACAO: *) and
 * byte-identical to the Hugging Face originals. raw.github caps files at
 * 100 MB (largest 0.5B shard 64.9 MB fits); 1B/3B shards exceed it, so those
 * optional tiers stay HuggingFace-only. The `weights` branch is orphaned so
 * ordinary `main` clones never download any weights.
 */
export const DEFAULT_MIRROR_TEMPLATE =
  "https://raw.githubusercontent.com/h23059476-wq/shadowtalk_ai/weights/models/{slug}/resolve/main/";

/**
 * Mirror for the web-llm model_lib WASM runtimes of the mirrored models.
 * The WASM is fetched from a THIRD repo (mlc-ai/binary-mlc-llm-libs) that
 * moves independently of Hugging Face — a rename or deletion there would
 * break engine init even when the weights mirror is healthy. We host our own
 * copies at wasm/<filename> on the same orphan branch, so a mirrored model's
 * entire init (config + shards + WASM) depends only on this repo.
 * (Keep in sync with scripts/upload-weights-branch.sh, which uploads them.)
 */
export const WASM_MIRROR_BASE =
  "https://raw.githubusercontent.com/h23059476-wq/shadowtalk_ai/weights/wasm/";

/**
 * The model ids actually hosted on the built-in mirror (keep in sync with the
 * `weights` branch). With the default template, only these records get
 * rewritten — a 1B/3B mirror attempt would just 404 and waste a retry.
 * A custom VITE_MODEL_MIRROR_URL_TEMPLATE host rewrites every registry model;
 * the operator is responsible for what their mirror serves.
 */
export const DEFAULT_MIRRORED_MODEL_IDS: ReadonlySet<string> = new Set([
  "Qwen2.5-0.5B-Instruct-q4f16_1-MLC",
  "Qwen2.5-0.5B-Instruct-q4f32_1-MLC",
]);

const RAW_TEMPLATE =
  (import.meta.env?.VITE_MODEL_MIRROR_URL_TEMPLATE as string | undefined)?.trim() ||
  DEFAULT_MIRROR_TEMPLATE;

/** The configured mirror template ("" when unset). */
export function mirrorUrlTemplate(): string {
  return overrideTemplate ?? RAW_TEMPLATE;
}

/** True when the mirror is configured and the template is usable. */
export function isMirrorConfigured(): boolean {
  const template = mirrorUrlTemplate();
  return template.length > 0 && template.includes("{slug}");
}

/**
 * True when `modelId` is hosted on the BUILT-IN mirror (default template):
 * its shards AND model_lib WASM are cached under the mirrored URLs, so cache
 * checks and deletes must run against the mirror appConfig too — the default
 * prebuiltAppConfig keys miss them entirely (orphaned ~600MB+ on "Clear").
 */
export function isBuiltInMirroredModelId(modelId: string): boolean {
  return (
    isMirrorConfigured() &&
    mirrorUrlTemplate() === DEFAULT_MIRROR_TEMPLATE &&
    DEFAULT_MIRRORED_MODEL_IDS.has(modelId)
  );
}

let overrideTemplate: string | null = null;
/** Test hook: override the template without re-importing the module. */
export function __setMirrorTemplateForTests(template: string | null): void {
  overrideTemplate = template;
}

function slugOfModelUrl(modelUrl: string): string | null {
  try {
    const parts = new URL(modelUrl).pathname.split("/").filter(Boolean);
    const slug = parts.pop();
    return slug && /^[A-Za-z0-9._-]+$/.test(slug) ? slug : null;
  } catch {
    return null;
  }
}

/**
 * Clone of prebuiltAppConfig with the mirrored models' `model` URLs rewritten
 * to the mirror. With the built-in default template only the hosted 0.5B
 * twins are rewritten; a custom template rewrites every registry model.
 * Returns null when the mirror is disabled or malformed — callers must treat
 * null as "no mirror, keep the default behavior".
 */
export function buildMirrorAppConfig(): AppConfig | null {
  if (!isMirrorConfigured()) return null;
  const template = mirrorUrlTemplate();
  const builtIn = template === DEFAULT_MIRROR_TEMPLATE;
  const registryIds = new Set(Object.keys(MODEL_REGISTRY));
  const model_list = prebuiltAppConfig.model_list.map((rec) => {
    if (!registryIds.has(rec.model_id)) return rec;
    if (builtIn && !DEFAULT_MIRRORED_MODEL_IDS.has(rec.model_id)) return rec;
    const slug = slugOfModelUrl(rec.model);
    if (!slug) return rec;
    const mirrored: typeof rec = { ...rec, model: template.replace("{slug}", slug) };
    // Built-in mirror only: also pin the model_lib WASM to our own copy so a
    // mirrored model never depends on mlc-ai's binary-mlc-llm-libs repo.
    // Custom-operator mirrors only rewrite the weights (they serve what they
    // serve); the WASM URL is an absolute URL, independent of {slug}.
    if (builtIn && rec.model_lib) {
      const wasmName = rec.model_lib.split("/").pop();
      if (wasmName) mirrored.model_lib = WASM_MIRROR_BASE + wasmName;
    }
    return mirrored;
  });
  return { ...prebuiltAppConfig, model_list };
}

/**
 * Whether a failed engine initialization looks like a network/download
 * problem worth retrying against the mirror. GPU/device-lost failures are
 * NOT retried — switching CDNs can't fix a broken device.
 */
export function isMirrorEligibleError(error: unknown): boolean {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : (error as { message?: string } | null)?.message ?? "";
  if (!message) return false;
  return /fetch|network|timeout|timed out|dns|socket|getaddrinfo|ENOTFOUND|ECONN|EAI_AGAIN|ERR_|Failed to download|connection/i.test(
    message,
  );
}
