import { describe, it, expect } from "vitest";
import { resolvePlanFromCheckSubscription, isFounderEmail } from "./resolveUserPlan";

describe("founder account", () => {
  it("zain@shadowtalk-ai.com always gets the elite plan", () => {
    expect(resolvePlanFromCheckSubscription("Zain@ShadowTalk-AI.com", null).plan).toBe("elite");
  });
  it("is recognised as founder", () => {
    expect(isFounderEmail("zain@shadowtalk-ai.com")).toBe(true);
    expect(isFounderEmail("someone@shadowtalk-ai.com")).toBe(false);
  });
});
