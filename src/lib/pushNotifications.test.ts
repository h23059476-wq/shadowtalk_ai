/**
 * Unit tests for pushNotifications.enablePushNotifications — the FCM token
 * registration path, including the VAPID rotation ladder:
 *   getToken(vapid) → [mismatch?] → deleteToken + unsubscribe →
 *   getToken(vapid) → [still failing?] → legacy getToken() (no vapidKey).
 */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { enablePushNotifications } from "./pushNotifications";

const h = vi.hoisted(() => ({
  registration: {
    active: { state: "activated" },
    installing: null,
    waiting: null,
    pushManager: { getSubscription: vi.fn(async () => null) },
  },
  getToken: vi.fn(),
  deleteToken: vi.fn(),
  upsert: vi.fn(),
}));

vi.mock("firebase/messaging", () => ({
  isSupported: vi.fn(async () => true),
  getMessaging: vi.fn(() => ({ __messaging: true })),
  getToken: h.getToken,
  onMessage: vi.fn(() => () => {}),
  deleteToken: h.deleteToken,
}));

vi.mock("@/integrations/local/client", () => ({
  backend: {
    from: vi.fn(() => ({ upsert: h.upsert })),
  },
}));

describe("enablePushNotifications", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    h.upsert.mockResolvedValue({ error: null });
    h.deleteToken.mockResolvedValue(undefined);
    h.registration.pushManager.getSubscription.mockClear().mockResolvedValue(null as never);
    vi.stubGlobal("navigator", {
      userAgent: "vitest-agent",
      serviceWorker: {
        getRegistration: vi.fn(async () => undefined),
        register: vi.fn(async () => h.registration),
      },
    });
    vi.stubGlobal("Notification", {
      permission: "default",
      requestPermission: vi.fn(async () => "granted"),
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("mints a token with the VAPID key and upserts an active, user-owned doc", async () => {
    h.getToken.mockResolvedValueOnce("TOKEN-A");

    const res = await enablePushNotifications("user-1");

    expect(res.ok).toBe(true);
    expect(res.token).toBe("TOKEN-A");
    // Standard path: the subscription must carry our VAPID public key.
    expect(h.getToken).toHaveBeenCalledWith(
      { __messaging: true },
      expect.objectContaining({ vapidKey: expect.stringMatching(/^B[A-Za-z0-9_-]{40,}$/) }),
    );
    expect(h.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "TOKEN-A",
        token: "TOKEN-A",
        user_id: "user-1",
        platform: "web",
        topic: "campaigns",
        active: true,
      }),
      { onConflict: "id" },
    );
  });

  it("rotates a stale legacy subscription on applicationServerKey mismatch", async () => {
    h.getToken
      .mockRejectedValueOnce(new Error("The subscription does not match the provided applicationServerKey"))
      .mockResolvedValueOnce("TOKEN-B");
    h.registration.pushManager.getSubscription.mockResolvedValueOnce({
      unsubscribe: vi.fn(async () => true),
    } as never);

    const res = await enablePushNotifications("user-2");

    expect(res.ok).toBe(true);
    expect(res.token).toBe("TOKEN-B");
    expect(h.deleteToken).toHaveBeenCalledTimes(1);
    expect(h.getToken).toHaveBeenLastCalledWith(
      { __messaging: true },
      expect.objectContaining({ vapidKey: expect.any(String) }),
    );
    expect(h.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ id: "TOKEN-B", user_id: "user-2", active: true }),
      { onConflict: "id" },
    );
  });

  it("falls back to FCM's project-managed certificate when the VAPID path keeps failing", async () => {
    h.getToken
      .mockRejectedValueOnce(new Error("applicationServerKey mismatch"))
      .mockRejectedValueOnce(new Error("applicationServerKey mismatch"))
      .mockResolvedValueOnce("TOKEN-LEGACY");

    const res = await enablePushNotifications("user-3");

    expect(res.ok).toBe(true);
    expect(res.token).toBe("TOKEN-LEGACY");
    expect(h.getToken).toHaveBeenCalledTimes(3);
    // The last-resort call passes NO vapidKey.
    expect(h.getToken.mock.calls[2][1]).not.toHaveProperty("vapidKey");
  });

  it("surfaces non-mismatch token errors without rotating", async () => {
    h.getToken.mockRejectedValueOnce(new Error("FCM server refused the registration"));

    const res = await enablePushNotifications("user-4");

    expect(res.ok).toBe(false);
    expect(res.error).toContain("FCM server refused");
    expect(h.deleteToken).not.toHaveBeenCalled();
    expect(h.upsert).not.toHaveBeenCalled();
  });

  it("reports failure when Firestore rejects the token doc", async () => {
    h.getToken.mockResolvedValueOnce("TOKEN-D");
    h.upsert.mockResolvedValue({ error: { message: "permission denied" } });

    const res = await enablePushNotifications("user-5");

    expect(res.ok).toBe(false);
    expect(res.error).toContain("Could not save");
  });
});
