/**
 * Batch 4 — prefer-local wiring.
 *
 * Verifies the UID-scoped prefer-local flag and that AIProviderRouter honors
 * it (preferring local when available, falling back to cloud when not).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const makeStorage = () => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((k: string) => (k in store ? store[k] : null)),
    setItem: vi.fn((k: string, v: string) => { store[k] = String(v); }),
    removeItem: vi.fn((k: string) => { delete store[k]; }),
    clear: vi.fn(() => { store = {}; }),
  };
};
const lsMock = makeStorage();
vi.stubGlobal("localStorage", lsMock);

const authMock = vi.hoisted(() => ({ uid: "uid-alice" as string | null }));
vi.mock("@/integrations/firebase/app", () => ({
  fbAuth: () => ({ currentUser: { uid: authMock.uid } }),
  functionsBaseUrl: "https://test.functions.example.com",
}));

import { getPreferLocal, setPreferLocal } from "@/lib/aiAccessMode";

describe("prefer-local flag — UID-scoped storage", () => {
  beforeEach(() => { lsMock.clear(); authMock.uid = "uid-alice"; });
  afterEach(() => { lsMock.clear(); });

  it("defaults to false for any uid", () => {
    expect(getPreferLocal("uid-alice")).toBe(false);
    expect(getPreferLocal("uid-bob")).toBe(false);
  });

  it("writes and reads the flag in the UID namespace", () => {
    setPreferLocal("uid-alice", true);
    expect(getPreferLocal("uid-alice")).toBe(true);
    expect(lsMock.getItem("shadowtalk_prefer_local_v1.uid-alice")).toBe("1");
  });

  it("isolates the flag across accounts", () => {
    setPreferLocal("uid-alice", true);
    expect(getPreferLocal("uid-bob")).toBe(false);
    setPreferLocal("uid-bob", true);
    expect(getPreferLocal("uid-alice")).toBe(true);
    expect(getPreferLocal("uid-bob")).toBe(true);
    setPreferLocal("uid-alice", false);
    expect(getPreferLocal("uid-alice")).toBe(false);
    expect(getPreferLocal("uid-bob")).toBe(true);
  });

  it("survives sign-out (clearUserLocalData never touches this key)", async () => {
    setPreferLocal("uid-alice", true);
    // The cleanup module only clears E2EE session keys — verify the prefer-local
    // key remains in storage after a simulated cleanup.
    const { clearUserLocalData } = await import("@/lib/signOutCleanup");
    clearUserLocalData("uid-alice");
    expect(getPreferLocal("uid-alice")).toBe(true);
  });

  it("returns false when no uid is available (guest)", () => {
    authMock.uid = null;
    expect(getPreferLocal()).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// AIProviderRouter honors prefer-local when local is available.
// ---------------------------------------------------------------------------

describe("AIProviderRouter honors prefer-local", () => {
  beforeEach(() => { lsMock.clear(); authMock.uid = "uid-alice"; });
  afterEach(() => { lsMock.clear(); });

  it("prefers the cloud provider when prefer-local is false (default)", async () => {
    const { AIProviderRouter } = await import("@/ai/AIProviderRouter");
    const provider = await AIProviderRouter.getBestProvider();
    expect(provider.id).toBe("cloud");
  });

  it("falls back to cloud when prefer-local is true but local is unavailable", async () => {
    setPreferLocal("uid-alice", true);
    // LocalAIProvider.isAvailable() requires WebGPU + a loaded model — in
    // tests DeviceCapability.hasWebGPU returns false, so local is unavailable.
    const { AIProviderRouter } = await import("@/ai/AIProviderRouter");
    const provider = await AIProviderRouter.getBestProvider();
    // Should fall back to cloud (no silent local fallback when unavailable).
    expect(provider.id).toBe("cloud");
  });
});

// ---------------------------------------------------------------------------
// Source contract — helpers exist with the right signatures.
// ---------------------------------------------------------------------------

describe("prefer-local — source contract", () => {
  it("exports getPreferLocal and setPreferLocal with the expected storage key prefix", async () => {
    const src = (await import("node:fs")).readFileSync(
      (await import("node:path")).resolve(process.cwd(), "src/lib/aiAccessMode.ts"),
      "utf8",
    );
    expect(src).toContain("shadowtalk_prefer_local_v1");
    expect(src).toMatch(/export function getPreferLocal/);
    expect(src).toMatch(/export function setPreferLocal/);
  });

  it("AIProviderRouter reads getPreferLocal inside getBestProvider (not via a setter)", async () => {
    const src = (await import("node:fs")).readFileSync(
      (await import("node:path")).resolve(process.cwd(), "src/ai/AIProviderRouter.ts"),
      "utf8",
    );
    expect(src).toContain("getPreferLocal()");
    expect(src).not.toMatch(/setPreferLocal\s*\(/);
  });
});

// ---------------------------------------------------------------------------
// Final completion phase — main chat path (ChatbotPage) honors prefer-local
// without silent provider switches, and the Offline AI settings section is
// reachable (it was previously implemented but unreachable).
// ---------------------------------------------------------------------------

describe("ChatbotPage prefer-local integration (source contract)", () => {
  const read = async (rel: string) => {
    const fs = await import("node:fs");
    const path = await import("node:path");
    return fs.readFileSync(path.resolve(process.cwd(), rel), "utf8");
  };

  it("checks the preference and engine state before cloud streaming, and labels local replies", async () => {
    const src = await read("src/pages/ChatbotPage.tsx");
    // Preference is read from the UID-scoped helper with the current user id.
    expect(src).toContain("getPreferLocal(user?.id ?? undefined)");
    // The engine is loaded lazily so web-llm stays out of the chat bundle.
    expect(src).toContain('await import("@/offline/LocalInferenceEngine")');
    // Local generation only when the engine is actually ready.
    expect(src).toContain('engineState === "ready"');
    // Local replies are labeled as local (never claim cloud execution was local).
    expect(src).toContain("localResult.content");
  });

  it("never silently switches providers", async () => {
    const src = await read("src/pages/ChatbotPage.tsx");
    // Local failure is surfaced, not retried on cloud in secret.
    expect(src).toMatch(/Local generation failed — surface the error honestly/);
    expect(src).toContain("throw new Error(localResult.error)");
    // Online-but-not-loaded fall-through shows an explicit one-time notice.
    expect(src).toContain("preferLocalNoticeShownRef");
    expect(src).toMatch(/Local AI not loaded/);
    // Offline without the engine fails with actionable guidance instead of a
    // generic network error.
    expect(src).toMatch(/isn't loaded yet/);
  });

  it("keeps the Offline AI settings section reachable", async () => {
    const page = await read("src/pages/SettingsPage.tsx");
    // The nav sections must include the offline entry (previously the panel
    // existed but ?section=offline silently fell back to "home").
    expect(page).toMatch(/\{\s*id:\s*"offline",\s*label:\s*"Offline AI"/);
    const catalog = await read("src/lib/settingsCatalog.ts");
    expect(catalog).toMatch(/id:\s*"offline",\s*section:\s*"offline"/);
  });

  it("does not claim offline AI is active when the engine is not ready", async () => {
    const src = await read("src/components/chat/NetworkTransitionOverlay.tsx");
    // The unconditional "Sovereign AI is active" claim is gone.
    expect(src).not.toContain("Sovereign AI is active");
    // The banner now gates the claim on the engine's real state.
    expect(src).toContain("localReady");
    expect(src).toContain("on-device AI is active");
  });

  it("removed the orphaned sw-downloader service worker", async () => {
    const fs = await import("node:fs");
    const path = await import("node:path");
    const p = path.resolve(process.cwd(), "public/sw-downloader.js");
    expect(fs.existsSync(p)).toBe(false);
  });
});
