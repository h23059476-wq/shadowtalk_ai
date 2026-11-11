import { describe, expect, it } from "vitest";
import { aiKeyStorageKey } from "@/lib/aiKeyStorage";

describe("AI onboarding storage isolation", () => {
  it("uses distinct namespaced credential keys for distinct Firebase users", () => {
    const aliceKey = aiKeyStorageKey("alice", "api_key");
    const bobKey = aiKeyStorageKey("bob", "api_key");

    expect(aliceKey).not.toBe(bobKey);
    expect(aliceKey).toBe("shadowtalk_ai_v2.alice.api_key");
  });
});
