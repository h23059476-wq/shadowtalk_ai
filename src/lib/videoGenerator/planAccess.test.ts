import { describe, expect, it } from "vitest";
import { canAccessVideoStudio } from "./planAccess";

// FREE ACCESS TRANSITION: Video Studio is free for everyone — paid plans no
// longer exist, so every plan resolves to access granted.
describe("canAccessVideoStudio", () => {
  it("allows pro and elite tiers", () => {
    expect(canAccessVideoStudio("pro")).toBe(true);
    expect(canAccessVideoStudio("elite")).toBe(true);
    expect(canAccessVideoStudio("premium")).toBe(true);
    expect(canAccessVideoStudio("enterprise")).toBe(true);
  });

  it("allows free (free access — no paid tiers)", () => {
    expect(canAccessVideoStudio("free")).toBe(true);
  });

  it("allows special access bypass", () => {
    expect(canAccessVideoStudio("free", true)).toBe(true);
  });
});
