/**
 * Contract tests for the tiered model registry (src/config/models.ts).
 *
 * The strongest guarantee here: every model id the tier table references —
 * including the q4f32 fallback twins — MUST exist in the installed
 * @mlc-ai/web-llm `prebuiltAppConfig`. A typo'd id would only explode at
 * engine-create time on a user's device; this test fails the build instead.
 */
import { describe, it, expect } from "vitest";
import { prebuiltAppConfig } from "@mlc-ai/web-llm";
import {
  MODEL_TIERS,
  allTierModelIds,
  bootstrapPlanForDevice,
  getLocalModelDefinition,
  AUTO_CACHE_NOW_TIERS,
  AUTO_CACHE_BACKGROUND_TIERS,
} from "@/config/models";

const PREBUILT_IDS = new Set(prebuiltAppConfig.model_list.map((m) => m.model_id));

describe("model registry — MLC prebuilt contract", () => {
  it("every tier model id exists in web-llm's prebuiltAppConfig", () => {
    const missing = allTierModelIds().filter((id) => !PREBUILT_IDS.has(id));
    expect(missing).toEqual([]);
  });

  it("every tier model resolves to a local definition with twin integrity", () => {
    for (const id of allTierModelIds()) {
      const def = getLocalModelDefinition(id);
      expect(def, `missing definition for ${id}`).toBeDefined();
      if (def?.fallbackModelId) {
        expect(PREBUILT_IDS.has(def.fallbackModelId), `twin ${def.fallbackModelId} not prebuilt`).toBe(true);
        expect(getLocalModelDefinition(def.fallbackModelId)).toBeDefined();
      }
    }
  });

  it("embeddings use the -b4 batch ids (the only prebuilt arctic variants)", () => {
    const embeddingTier = MODEL_TIERS.find((t) => t.id === "embeddings")!;
    for (const entry of embeddingTier.models) {
      expect(entry.id).toMatch(/-b4$/);
    }
    expect(embeddingTier.approxDownloadMB).toBeLessThanOrEqual(250);
  });

  it("instant default is Llama-3.2-1B with an f32 twin; SmolLM2-1.7B is the alternative", () => {
    const tier = MODEL_TIERS.find((t) => t.id === "instant")!;
    expect(tier.models[0].id).toBe("Llama-3.2-1B-Instruct-q4f16_1-MLC");
    expect(tier.models[1].id).toBe("SmolLM2-1.7B-Instruct-q4f16_1-MLC");
    expect(tier.approxDownloadMB).toBeGreaterThanOrEqual(800);
    expect(tier.approxDownloadMB).toBeLessThanOrEqual(900);
  });

  it("powerhouse requires WebGPU + 8GB RAM and holds the two 3B instructs", () => {
    const tier = MODEL_TIERS.find((t) => t.id === "powerhouse")!;
    expect(tier.minDeviceMemoryGB).toBe(8);
    expect(tier.requiresWebGPU).toBe(true);
    const ids = tier.models.map((m) => m.id);
    expect(ids).toContain("Qwen2.5-3B-Instruct-q4f16_1-MLC");
    expect(ids).toContain("Llama-3.2-3B-Instruct-q4f16_1-MLC");
  });

  it("coder tier offers Qwen2.5-Coder-3B with the 1.5B low-spec option", () => {
    const tier = MODEL_TIERS.find((t) => t.id === "coder")!;
    expect(tier.models[0].id).toBe("Qwen2.5-Coder-3B-Instruct-q4f16_1-MLC");
    expect(tier.models[1].id).toBe("Qwen2.5-Coder-1.5B-Instruct-q4f16_1-MLC");
    expect(tier.models[1].role).toBe("low-spec-option");
  });
});

describe("model registry — bootstrap plan", () => {
  it("caches embeddings first (auto-cache-now), then instant chat (auto-cache-background)", () => {
    expect(AUTO_CACHE_NOW_TIERS).toEqual(["embeddings"]);
    expect(AUTO_CACHE_BACKGROUND_TIERS).toEqual(["instant"]);
    const order = MODEL_TIERS.map((t) => t.id);
    expect(order.indexOf("embeddings")).toBeLessThan(order.indexOf("instant"));
  });

  it("picks arctic-m for ≥8GB devices, arctic-s otherwise", () => {
    expect(bootstrapPlanForDevice(16).embeddingModelId).toBe("snowflake-arctic-embed-m-q0f32-MLC-b4");
    expect(bootstrapPlanForDevice(8).embeddingModelId).toBe("snowflake-arctic-embed-m-q0f32-MLC-b4");
    expect(bootstrapPlanForDevice(4).embeddingModelId).toBe("snowflake-arctic-embed-s-q0f32-MLC-b4");
    expect(bootstrapPlanForDevice(undefined).embeddingModelId).toBe("snowflake-arctic-embed-s-q0f32-MLC-b4");
  });

  it("picks the 1B chat model normally and the 0.5B ultra-light on ≤2GB devices", () => {
    expect(bootstrapPlanForDevice(8).chatModelId).toBe("Llama-3.2-1B-Instruct-q4f16_1-MLC");
    expect(bootstrapPlanForDevice(2).chatModelId).toBe("Qwen2.5-0.5B-Instruct-q4f16_1-MLC");
  });
});
