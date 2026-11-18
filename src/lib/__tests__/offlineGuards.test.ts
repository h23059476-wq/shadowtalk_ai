/**
 * Offline guards — the never-hang guarantees for the send path.
 *
 * Remote-area connections (captive portals, 2G, tunnels) produce requests
 * that neither succeed nor fail for minutes. These helpers are used by
 * ChatbotPage.ensureConversation, aiAccessMode.loadAiAccessMode and
 * BackgroundInstall — a regression here means the chat spins forever, so
 * they are pinned by unit tests.
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import {
  isOffline,
  withNetworkTimeout,
  NetworkTimeoutError,
  installRetryBackoffMs,
  INSTALL_RETRY_LIMIT,
} from "@/lib/offlineGuards";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("isOffline", () => {
  it("returns true only when navigator.onLine is exactly false", () => {
    vi.stubGlobal("navigator", { onLine: false });
    expect(isOffline()).toBe(true);
    vi.stubGlobal("navigator", { onLine: true });
    expect(isOffline()).toBe(false);
    vi.unstubAllGlobals();
    expect(isOffline()).toBe(false);
  });
});

describe("withNetworkTimeout", () => {
  it("resolves with the promise value when it settles in time", async () => {
    const result = await withNetworkTimeout(Promise.resolve("ok"), 1_000, "op");
    expect(result).toBe("ok");
  });

  it("rejects with NetworkTimeoutError when the promise never settles", async () => {
    vi.useFakeTimers();
    const pending = new Promise(() => {});
    const guarded = withNetworkTimeout(pending, 8_000, "Firestore read");
    const expectation = expect(guarded).rejects.toBeInstanceOf(NetworkTimeoutError);
    vi.advanceTimersByTime(8_001);
    await expectation;
    vi.useRealTimers();
  });

  it("the losing late rejection does not surface as an unhandled rejection", async () => {
    vi.useFakeTimers();
    const boom = new Promise((_resolve, reject) => {
      setTimeout(() => reject(new Error("late failure")), 20_000);
    });
    const guarded = withNetworkTimeout(boom, 5_000, "slow op");
    const expectation = expect(guarded).rejects.toBeInstanceOf(NetworkTimeoutError);
    vi.advanceTimersByTime(5_001);
    await expectation;
    vi.advanceTimersByTime(20_000);
    vi.useRealTimers();
  });

  it("carries a label describing the operation", () => {
    const err = new NetworkTimeoutError("Conversation creation", 10_000);
    expect(err.message).toContain("Conversation creation");
    expect(err.message).toContain("10000ms");
  });
});

describe("installRetryBackoffMs", () => {
  it("steps 15s / 45s / 120s and stops after the limit", () => {
    expect(installRetryBackoffMs(0)).toBe(15_000);
    expect(installRetryBackoffMs(1)).toBe(45_000);
    expect(installRetryBackoffMs(2)).toBe(120_000);
    expect(installRetryBackoffMs(3)).toBe(0);
    expect(INSTALL_RETRY_LIMIT).toBe(3);
  });
});
