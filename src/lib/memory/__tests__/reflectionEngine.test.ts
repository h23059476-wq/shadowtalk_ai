/**
 * Production-readiness pass — the reflection engine was a documented stub
 * (always false / []) making the memory-reflection flow silently dead.
 * These tests pin the REAL behavior: local extractive analysis, no provider
 * calls, conservative memory extraction.
 */
import { describe, it, expect } from "vitest";
import { shouldReflect, reflectOnConversation } from "@/lib/memory/reflectionEngine";
import { embedText } from "@/lib/shadowtalkModel/embedding";

describe("shouldReflect", () => {
  it("reflects every 12 messages, never at 0", () => {
    expect(shouldReflect(0)).toBe(false);
    expect(shouldReflect(11)).toBe(false);
    expect(shouldReflect(12)).toBe(true);
    expect(shouldReflect(13)).toBe(false);
    expect(shouldReflect(24)).toBe(true);
  });
});

describe("reflectOnConversation", () => {
  it("extracts preferences the user stated", async () => {
    const result = await reflectOnConversation([
      { role: "user", content: "I prefer concise answers with bullet points whenever possible." },
      { role: "assistant", content: "Understood, I will keep responses tight." },
    ]);
    expect(result).not.toBeNull();
    const pref = result!.find((r) => r.category === "preference");
    expect(pref).toBeDefined();
    expect(pref!.confidence).toBeGreaterThan(0.5);
  });

  it("extracts decisions and requirements as project context", async () => {
    const result = await reflectOnConversation([
      { role: "user", content: "We decided to use PostgreSQL for the storage layer. The API must stay backwards compatible at all times." },
    ]);
    const keys = result!.filter((r) => r.category === "context").map((r) => r.key);
    expect(keys).toContain("decisions");
    expect(keys).toContain("requirements");
  });

  it("extracts recurring topics as skills", async () => {
    const result = await reflectOnConversation([
      { role: "user", content: "Help me debug the kubernetes deployment config again." },
      { role: "user", content: "The kubernetes pods keep crash looping." },
      { role: "user", content: "Can you review my kubernetes helm values?" },
    ]);
    const skill = result!.find((r) => r.category === "skill");
    expect(skill).toBeDefined();
    expect(String(skill!.value)).toContain("kubernetes");
  });

  it("returns null when nothing durable was said", async () => {
    const result = await reflectOnConversation([
      { role: "user", content: "lol ok" },
      { role: "assistant", content: "Ha, right." },
    ]);
    expect(result).toBeNull();
  });

  it("returns null for empty conversations", async () => {
    expect(await reflectOnConversation([])).toBeNull();
  });

  it("caps and deduplicates reflections", async () => {
    const decision = "We decided to standardize the deployment pipeline for the platform team this quarter.";
    const result = await reflectOnConversation(
      Array.from({ length: 10 }, () => [{ role: "user" as const, content: decision }]).flat(),
    );
    expect(result!.length).toBeLessThanOrEqual(8);
    const decisionValues = result!.filter((r) => r.key === "decisions").map((r) => r.value);
    expect(new Set(decisionValues).size).toBe(1);
  });
});

describe("embedText (previously a 384-zero stub)", () => {
  it("returns real, deterministic, normalized 512-dim vectors", async () => {
    const a = await embedText("The deployment pipeline uses kubernetes and github actions.");
    const b = await embedText("The deployment pipeline uses kubernetes and github actions.");
    expect(a).toHaveLength(512);
    expect(a).toEqual(b);
    const norm = Math.sqrt(a.reduce((n, v) => n + v * v, 0));
    expect(norm).toBeCloseTo(1, 4);
    expect(a.some((v) => v !== 0)).toBe(true);
  });

  it("keeps lexically related text closer than unrelated text", async () => {
    const query = await embedText("configure the postgres connection pool");
    const related = await embedText("postgres connection pool size configuration");
    const unrelated = await embedText("pancake recipe with blueberries");
    const dot = (x: number[], y: number[]) => x.reduce((n, v, i) => n + v * y[i], 0);
    expect(dot(query, related)).toBeGreaterThan(dot(query, unrelated));
  });
});
