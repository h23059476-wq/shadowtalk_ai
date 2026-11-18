/**
 * Self-hosted model mirror.
 *
 * Verifies the VITE_MODEL_MIRROR_URL_TEMPLATE contract ({slug} placeholder,
 * registry-only rewrites, model_id/model_lib preservation) and the
 * network-shaped error heuristic that gates the engine's mirror retry.
 * The URL rules these tests encode are verified against web-llm 0.2.84's
 * cleanModelUrl (see MODEL_MIRROR_SETUP.md).
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import { prebuiltAppConfig } from "@mlc-ai/web-llm";
import { MODEL_REGISTRY } from "@/ai/ModelRegistry";
import {
  mirrorUrlTemplate,
  isMirrorConfigured,
  buildMirrorAppConfig,
  isMirrorEligibleError,
  DEFAULT_MIRROR_TEMPLATE,
  DEFAULT_MIRRORED_MODEL_IDS,
  __setMirrorTemplateForTests,
} from "@/offline/modelMirror";

const REGISTRY_IDS = new Set(Object.keys(MODEL_REGISTRY));

describe("modelMirror — template contract", () => {
  afterEach(() => {
    __setMirrorTemplateForTests(null);
  });

  it("falls back to the built-in ShadowTalk weights mirror by default", () => {
    // The live default points at the orphan `weights` branch of this repo,
    // served by raw.githubusercontent.com (CORS-verified, byte-identical to
    // HF). VITE_MODEL_MIRROR_URL_TEMPLATE overrides it when set.
    expect(mirrorUrlTemplate()).toBe(DEFAULT_MIRROR_TEMPLATE);
    expect(DEFAULT_MIRROR_TEMPLATE).toContain("{slug}");
    expect(DEFAULT_MIRROR_TEMPLATE).toContain("/resolve/");
    expect(isMirrorConfigured()).toBe(true);
    expect(buildMirrorAppConfig()).not.toBeNull();
  });

  it("with the default template, only the hosted 0.5B twins are mirrored", () => {
    // raw.githubusercontent caps files at 100 MB: the 0.5B twins fit (largest
    // shard 64.9 MB) and live on the `weights` branch; 1B/3B shards (125/188
    // MB) cannot, so they keep their HF URLs — a mirror attempt there would
    // just 404 and waste the retry.
    const cfg = buildMirrorAppConfig()!;
    const mirrored = cfg.model_list.filter((r) =>
      DEFAULT_MIRRORED_MODEL_IDS.has(r.model_id),
    );
    const untouched = cfg.model_list.filter(
      (r) => !DEFAULT_MIRRORED_MODEL_IDS.has(r.model_id),
    );
    expect(mirrored.length).toBe(2);
    for (const rec of mirrored) {
      expect(rec.model.startsWith("https://raw.githubusercontent.com/")).toBe(true);
      expect(rec.model).toContain("/shadowtalk_ai/weights/models/");
      expect(rec.model).toContain("/resolve/main/");
    }
    const hfUntouched = untouched.filter((r) => REGISTRY_IDS.has(r.model_id));
    expect(hfUntouched.length).toBeGreaterThan(0);
    for (const rec of hfUntouched) {
      expect(rec.model).toMatch(/^https:\/\/huggingface\.co\//);
    }
  });

  it("with the default template, the mirrored twins' model_lib WASM is pinned to our weights branch", () => {
    // The WASM runtime comes from a third repo (mlc-ai/binary-mlc-llm-libs)
    // that moves independently of HF — a rename there would break engine init
    // even with a healthy weights mirror. The built-in mirror hosts its own
    // copies (scripts/upload-weights-branch.sh uploads them), so a mirrored
    // model's entire init depends only on this repo.
    const cfg = buildMirrorAppConfig()!;
    const mirrored = cfg.model_list.filter((r) =>
      DEFAULT_MIRRORED_MODEL_IDS.has(r.model_id),
    );
    expect(mirrored.length).toBe(2);
    for (const rec of mirrored) {
      expect(rec.model_lib).toContain("/shadowtalk_ai/weights/wasm/");
      // The runtime binary keeps its exact file name — it is what the
      // upload script stores under wasm/.
      const original = prebuiltAppConfig.model_list.find(
        (r) => r.model_id === rec.model_id,
      )!;
      expect(rec.model_lib.endsWith(original.model_lib!.split("/").pop()!)).toBe(true);
    }
    // Non-mirrored registry models keep the mlc-ai URLs.
    const untouched = cfg.model_list.filter(
      (r) => REGISTRY_IDS.has(r.model_id) && !DEFAULT_MIRRORED_MODEL_IDS.has(r.model_id),
    );
    for (const rec of untouched) {
      const original = prebuiltAppConfig.model_list.find((r) => r.model_id === rec.model_id)!;
      expect(rec.model_lib).toBe(original.model_lib);
    }
  });

  it("an invalid override (no {slug}) disables the mirror entirely", () => {
    __setMirrorTemplateForTests("https://mirror.example.com/models/");
    expect(isMirrorConfigured()).toBe(false);
    expect(buildMirrorAppConfig()).toBeNull();
  });

  it("rewrites registry model URLs to the mirror with the slug substituted", () => {
    __setMirrorTemplateForTests("https://mirror.example.com/{slug}/resolve/main/");
    const cfg = buildMirrorAppConfig();
    expect(cfg).not.toBeNull();

    const starter = cfg!.model_list.find(
      (r) => r.model_id === "Qwen2.5-0.5B-Instruct-q4f16_1-MLC",
    )!;
    expect(starter.model).toBe(
      "https://mirror.example.com/Qwen2.5-0.5B-Instruct-q4f16_1-MLC/resolve/main/",
    );
    // Same model_id — the engine still resolves initialize(model.id) unchanged.
    expect(starter.model_id).toBe("Qwen2.5-0.5B-Instruct-q4f16_1-MLC");
    // model_lib stays on the WASM binaries host (independent of the HF CDN).
    expect(starter.model_lib).toMatch(/^https:\/\/raw\.githubusercontent\.com/);

    for (const id of REGISTRY_IDS) {
      const rec = cfg!.model_list.find((r) => r.model_id === id)!;
      expect(rec.model.startsWith("https://mirror.example.com/")).toBe(true);
      expect(rec.model).toContain("/resolve/");
    }
  });

  it("keeps non-registry prebuilt records untouched", () => {
    __setMirrorTemplateForTests("https://mirror.example.com/{slug}/resolve/main/");
    const cfg = buildMirrorAppConfig()!;
    const untouched = cfg.model_list.filter((r) => !REGISTRY_IDS.has(r.model_id));
    const originalUntouched = prebuiltAppConfig.model_list.filter(
      (r) => !REGISTRY_IDS.has(r.model_id),
    );
    expect(untouched.length).toBeGreaterThan(0);
    expect(untouched.map((r) => r.model)).toEqual(originalUntouched.map((r) => r.model));
  });

  it("supports the GitHub Pages form (repo supplies the /resolve/<rev>/ marker)", () => {
    __setMirrorTemplateForTests(
      "https://owner.github.io/model-{slug}/resolve/main/",
    );
    const cfg = buildMirrorAppConfig()!;
    const starter = cfg.model_list.find(
      (r) => r.model_id === "Qwen2.5-0.5B-Instruct-q4f16_1-MLC",
    )!;
    expect(starter.model).toBe(
      "https://owner.github.io/model-Qwen2.5-0.5B-Instruct-q4f16_1-MLC/resolve/main/",
    );
    // web-llm's cleanModelUrl only appends "resolve/main/" when the URL lacks
    // "/resolve/<rev>/" — this form already has it, so files resolve flat
    // against the Pages directory: <base>mlc-chat-config.json, etc.
    expect(starter.model).toMatch(/.+\/resolve\/.+\//);
    // GitHub RELEASE assets (flat) can never satisfy this regex — which is
    // exactly why the doc mandates Pages/R2 instead of Releases.
  });
});

describe("isMirrorEligibleError — retry heuristic", () => {
  it("matches network-shaped failures", () => {
    expect(isMirrorEligibleError(new Error("Failed to fetch"))).toBe(true);
    expect(isMirrorEligibleError(new Error("TypeError: NetworkError when attempting to fetch"))).toBe(true);
    expect(isMirrorEligibleError(new Error("download timed out after 30000ms"))).toBe(true);
    expect(isMirrorEligibleError(new Error("getaddrinfo ENOTFOUND huggingface.co"))).toBe(true);
    expect(isMirrorEligibleError(new Error("ERR_INTERNET_DISCONNECTED"))).toBe(true);
  });

  it("does not match device/GPU failures or empty messages", () => {
    expect(isMirrorEligibleError(new Error("GPU device lost during init"))).toBe(false);
    expect(isMirrorEligibleError(new Error("WebGPU adapter unavailable"))).toBe(false);
    expect(isMirrorEligibleError(new Error(""))).toBe(false);
    expect(isMirrorEligibleError(null)).toBe(false);
    expect(isMirrorEligibleError(undefined)).toBe(false);
    expect(isMirrorEligibleError({ message: "socket hang up" } as unknown as Error)).toBe(true);
  });
});
