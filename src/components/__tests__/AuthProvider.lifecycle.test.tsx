/**
 * Batch 3 — AuthProvider boot/hydration + sign-out lifecycle.
 *
 * Verifies:
 *  - Initial session hydrates exactly once (the duplicate onAuthStateChange
 *    'SIGNED_IN' callback for the SAME user does NOT re-run syncProfile).
 *  - Account switch (A → B) re-syncs for B exactly once.
 *  - Sign-out resets ephemeral state and calls clearUserLocalData(uid) before
 *    backend.auth.signOut(), while preserving persistent user data.
 *  - The auth subscription is unsubscribed on unmount (old listeners cleaned up).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, waitFor, act } from "@testing-library/react";
import React from "react";

// Independent storage mocks.
const makeStorage = () => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((k: string) => (k in store ? store[k] : null)),
    setItem: vi.fn((k: string, v: string) => { store[k] = String(v); }),
    removeItem: vi.fn((k: string) => { delete store[k]; }),
    clear: vi.fn(() => { store = {}; }),
    _has: (k: string) => k in store,
  };
};
const lsMock = makeStorage();
const ssMock = makeStorage();
vi.stubGlobal("localStorage", lsMock);
vi.stubGlobal("sessionStorage", ssMock);

let authCallback: ((event: string, session: any) => void) | null = null;
const unsubscribeSpy = vi.fn();

const sessionA = {
  access_token: "a", refresh_token: "ra", token_type: "bearer",
  expires_in: 3600, expires_at: 9999,
  user: { id: "uid-alice", email: "alice@example.test", is_anonymous: false, app_metadata: {}, user_metadata: {}, aud: "authenticated", created_at: "2026-01-01T00:00:00Z" },
};
const sessionB = {
  access_token: "b", refresh_token: "rb", token_type: "bearer",
  expires_in: 3600, expires_at: 9999,
  user: { id: "uid-bob", email: "bob@example.test", is_anonymous: false, app_metadata: {}, user_metadata: {}, aud: "authenticated", created_at: "2026-01-01T00:00:00Z" },
};

const syncProfileSpy = vi.hoisted(() => vi.fn(async () => {}));
const clearUserLocalDataSpy = vi.hoisted(() => vi.fn());
const getSessionMock = vi.hoisted(() => vi.fn());
const signOutMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/authProfile", () => ({ syncProfile: syncProfileSpy }));
vi.mock("@/lib/signOutCleanup", () => ({ clearUserLocalData: clearUserLocalDataSpy }));
vi.mock("@/integrations/local/client", () => ({
  backend: {
    auth: {
      getSession: getSessionMock,
      getUser: vi.fn(async () => ({ data: { user: null }, error: null })),
      onAuthStateChange: vi.fn((cb: any) => {
        authCallback = cb;
        return { data: { subscription: { unsubscribe: unsubscribeSpy } } };
      }),
      signOut: signOutMock,
    },
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    })),
  },
  isConfigured: true,
}));

import { AuthProvider, useAuth } from "@/components/AuthProvider";

let captured: any = null;
const Consumer = () => {
  captured = useAuth();
  return null;
};

const wrap = () => render(<AuthProvider><Consumer /></AuthProvider>);

describe("AuthProvider boot + hydration", () => {
  beforeEach(() => {
    lsMock.clear(); ssMock.clear();
    syncProfileSpy.mockClear();
    clearUserLocalDataSpy.mockClear();
    signOutMock.mockClear();
    unsubscribeSpy.mockClear();
    getSessionMock.mockClear();
    authCallback = null;
    captured = null;
  });
  afterEach(() => { lsMock.clear(); ssMock.clear(); });

  it("hydrates the initial session exactly once (no duplicate syncProfile)", async () => {
    getSessionMock.mockResolvedValue({ data: { session: sessionA }, error: null });
    signOutMock.mockResolvedValue({ error: null });
    const { unmount } = wrap();
    await waitFor(() => expect(captured?.user?.id).toBe("uid-alice"));
    await waitFor(() => expect(captured?.loading).toBe(false));
    expect(syncProfileSpy).toHaveBeenCalledTimes(1);
    expect(syncProfileSpy).toHaveBeenCalledWith("uid-alice", expect.objectContaining({ email: "alice@example.test" }));

    await act(async () => {
      authCallback?.("SIGNED_IN", sessionA);
    });
    expect(syncProfileSpy).toHaveBeenCalledTimes(1);

    unmount();
  });

  it("re-syncs exactly once when the authenticated user changes (A to B)", async () => {
    getSessionMock.mockResolvedValue({ data: { session: sessionA }, error: null });
    const { unmount } = wrap();
    await waitFor(() => expect(captured?.user?.id).toBe("uid-alice"));
    expect(syncProfileSpy).toHaveBeenCalledTimes(1);

    await act(async () => {
      authCallback?.("SIGNED_IN", sessionB);
    });
    await waitFor(() => expect(captured?.user?.id).toBe("uid-bob"));
    expect(syncProfileSpy).toHaveBeenCalledTimes(2);
    expect(syncProfileSpy).toHaveBeenLastCalledWith("uid-bob", expect.objectContaining({ email: "bob@example.test" }));

    unmount();
  });

  it("cleans up the auth subscription on unmount (old listeners removed)", async () => {
    getSessionMock.mockResolvedValue({ data: { session: null }, error: null });
    const { unmount } = wrap();
    await waitFor(() => expect(captured?.loading).toBe(false));
    unmount();
    expect(unsubscribeSpy).toHaveBeenCalled();
  });
});

describe("AuthProvider signOut — ephemeral cleanup", () => {
  beforeEach(() => {
    lsMock.clear(); ssMock.clear();
    syncProfileSpy.mockClear();
    clearUserLocalDataSpy.mockClear();
    signOutMock.mockClear();
    getSessionMock.mockClear();
    authCallback = null;
    captured = null;
  });

  it("calls clearUserLocalData(uid) BEFORE backend.auth.signOut and resets state", async () => {
    getSessionMock.mockResolvedValue({ data: { session: sessionA }, error: null });
    signOutMock.mockResolvedValue({ error: null });
    const { unmount } = wrap();
    await waitFor(() => expect(captured?.user?.id).toBe("uid-alice"));

    const callOrder: string[] = [];
    clearUserLocalDataSpy.mockImplementation(() => { callOrder.push("clearUserLocalData"); });
    signOutMock.mockImplementation(async () => { callOrder.push("signOut"); return { error: null }; });

    await act(async () => {
      await captured.signOut();
    });

    expect(clearUserLocalDataSpy).toHaveBeenCalledWith("uid-alice");
    expect(callOrder).toEqual(["clearUserLocalData", "signOut"]);
    expect(captured?.user).toBeNull();
    expect(captured?.userPlan).toBe("free");
    expect(captured?.subscribed).toBe(false);
    unmount();
  });

  it("resets the sync guard so the next sign-in re-syncs", async () => {
    getSessionMock.mockResolvedValue({ data: { session: sessionA }, error: null });
    signOutMock.mockResolvedValue({ error: null });
    const { unmount } = wrap();
    await waitFor(() => expect(captured?.user?.id).toBe("uid-alice"));
    expect(syncProfileSpy).toHaveBeenCalledTimes(1);

    await act(async () => { await captured.signOut(); });
    expect(syncProfileSpy).toHaveBeenCalledTimes(1);

    await act(async () => { authCallback?.("SIGNED_OUT", null); });
    expect(captured?.user).toBeNull();

    await act(async () => { authCallback?.("SIGNED_IN", sessionA); });
    await waitFor(() => expect(captured?.user?.id).toBe("uid-alice"));
    expect(syncProfileSpy).toHaveBeenCalledTimes(2);
    unmount();
  });
});
