/**
 * Local model catalog helpers — the pure logic behind the chat header's
 * on-device model switcher (dropdown listing + trigger labeling).
 */
import { describe, it, expect } from "vitest";
import {
  chatModelOptions,
  isModelDownloaded,
  resolvePrimaryLocalModel,
  formatModelSize,
} from "@/lib/localModelCatalog";
import { LOCAL_MODEL_TIERS } from "@/ai/ModelRegistry";

describe("chatModelOptions — on-device chat lineup", () => {
  it("lists every tier model except embeddings", () => {
    const options = chatModelOptions();
    expect(options.length).toBeGreaterThan(0);
    expect(options.every((def) => def.modelKind !== "embedding")).toBe(true);
    expect(options.length).toBe(
      LOCAL_MODEL_TIERS.filter((def) => def.modelKind !== "embedding").length,
    );
  });

  it("keeps the smallest → largest registry order (ids unique)", () => {
    const options = chatModelOptions();
    const sizes = options.map((def) => def.approxStorageRequirementMB);
    for (let i = 1; i < sizes.length; i++) {
      expect(sizes[i]).toBeGreaterThanOrEqual(sizes[i - 1]);
    }
    expect(new Set(options.map((def) => def.id)).size).toBe(options.length);
  });
});

describe("isModelDownloaded — primary or device twin counts", () => {
  it("counts the primary id itself", () => {
    const def = chatModelOptions()[0];
    expect(isModelDownloaded(def.id, new Set([def.id]))).toBe(true);
  });

  it("counts the q4f32 twin as downloaded (shader-f16 fallback devices)", () => {
    const def = chatModelOptions().find((d) => d.fallbackModelId);
    // Every chat model carries a twin — but don't assume in the assertion.
    if (def?.fallbackModelId) {
      expect(isModelDownloaded(def.id, new Set([def.fallbackModelId]))).toBe(true);
    } else {
      expect(def).toBeDefined();
    }
  });

  it("reports not-downloaded when neither primary nor twin is cached", () => {
    const def = chatModelOptions()[0];
    const otherIds = chatModelOptions()
      .slice(1)
      .flatMap((d) => [d.id, d.fallbackModelId ?? ""]);
    expect(isModelDownloaded(def.id, new Set(otherIds))).toBe(false);
    expect(isModelDownloaded(def.id, new Set())).toBe(false);
  });
});

describe("resolvePrimaryLocalModel — trigger labeling", () => {
  it("maps a primary id to itself", () => {
    const def = chatModelOptions()[0];
    expect(resolvePrimaryLocalModel(def.id)?.id).toBe(def.id);
  });

  it("maps an engine-loaded f32 twin back to its friendly primary entry", () => {
    const twin = LOCAL_MODEL_TIERS.find((def) => def.fallbackModelId);
    if (!twin?.fallbackModelId) return; // registry always carries twins
    const resolved = resolvePrimaryLocalModel(twin.fallbackModelId);
    expect(resolved?.id).toBe(twin.id);
    expect(resolved?.displayName).not.toMatch(/f32/);
  });

  it("never resolves to an embedding model", () => {
    const embedding = LOCAL_MODEL_TIERS.find((def) => def.modelKind === "embedding");
    if (!embedding) return;
    expect(resolvePrimaryLocalModel(embedding.id)?.modelKind).not.toBe("embedding");
  });
});

describe("formatModelSize — dropdown size labels", () => {
  it("shows MB below 1GB and GB above", () => {
    expect(formatModelSize(880)).toBe("880 MB");
    expect(formatModelSize(1024)).toBe("1.0 GB");
    expect(formatModelSize(2300)).toBe("2.2 GB");
  });
});
