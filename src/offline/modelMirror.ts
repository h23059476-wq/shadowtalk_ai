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
 * "Qwen2.5-0.5B-Instruct-q4f16_1-MLC"). Unset/invalid ⇒ mirror disabled and
 * everything behaves exactly as before. model_lib WASM URLs are NOT mirrored
 * — they point at raw.githubusercontent.com and are independent of the HF CDN.
 */
import { prebuiltAppConfig, type AppConfig } from "@mlc-ai/web-llm";
import { MODEL_REGISTRY } from "@/ai/ModelRegistry";

const RAW_TEMPLATE =
  (import.meta.env?.VITE_MODEL_MIRROR_URL_TEMPLATE as string | undefined)?.trim() ?? "";

/** The configured mirror template ("" when unset). */
export function mirrorUrlTemplate(): string {
  return overrideTemplate ?? RAW_TEMPLATE;
}

/** True when the mirror is configured and the template is usable. */
export function isMirrorConfigured(): boolean {
  const template = mirrorUrlTemplate();
  return template.length > 0 && template.includes("{slug}");
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
 * Clone of prebuiltAppConfig with every registry model's `model` URL rewritten
 * to the mirror. Returns null when the mirror is disabled or malformed —
 * callers must treat null as "no mirror, keep the default behavior".
 */
export function buildMirrorAppConfig(): AppConfig | null {
  if (!isMirrorConfigured()) return null;
  const template = mirrorUrlTemplate();
  const registryIds = new Set(Object.keys(MODEL_REGISTRY));
  const model_list = prebuiltAppConfig.model_list.map((rec) => {
    if (!registryIds.has(rec.model_id)) return rec;
    const slug = slugOfModelUrl(rec.model);
    if (!slug) return rec;
    return { ...rec, model: template.replace("{slug}", slug) };
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
