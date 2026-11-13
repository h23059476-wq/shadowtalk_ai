import { beforeEach, describe, expect, it, vi } from "vitest";

const sdk = vi.hoisted(() => ({
  auth: { currentUser: null as any },
  sendPasswordResetEmail: vi.fn(),
  signInWithEmailAndPassword: vi.fn(),
  signInWithRedirect: vi.fn(),
  getRedirectResult: vi.fn(),
}));

vi.mock("./app", () => ({ fbAuth: () => sdk.auth }));
vi.mock("firebase/auth", () => ({
  GoogleAuthProvider: class {
    setCustomParameters = vi.fn();
  },
  OAuthProvider: class {
    addScope = vi.fn();
  },
  applyActionCode: vi.fn(), confirmPasswordReset: vi.fn(),
  createUserWithEmailAndPassword: vi.fn(), getRedirectResult: sdk.getRedirectResult,
  onAuthStateChanged: vi.fn(), reload: vi.fn(), sendEmailVerification: vi.fn(),
  sendPasswordResetEmail: sdk.sendPasswordResetEmail,
  signInAnonymously: vi.fn(), signInWithEmailAndPassword: sdk.signInWithEmailAndPassword,
  signInWithRedirect: sdk.signInWithRedirect, signOut: vi.fn(), updateEmail: vi.fn(),
  updatePassword: vi.fn(), updateProfile: vi.fn(), verifyPasswordResetCode: vi.fn(),
  deleteUser: vi.fn(),
}));

import { createAuthAdapter } from "./auth";
import { onAuthStateChanged } from "firebase/auth";
import type { Mock } from "vitest";

const PENDING_KEY = "shadowtalk_auth_redirect_pending";
const RETURN_KEY = "shadowtalk_oauth_return_destination";

const mockFbUser = () => ({
  uid: "u1",
  email: "person@example.test",
  isAnonymous: false,
  displayName: "Probe",
  photoURL: null,
  emailVerified: true,
  providerData: [{ providerId: "google.com" }],
  metadata: { creationTime: new Date().toISOString() },
  getIdTokenResult: async () => ({
    token: "tok",
    expirationTime: new Date(Date.now() + 3600_000).toISOString(),
  }),
});

describe("Firebase auth adapter", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.sessionStorage.clear();
    (onAuthStateChanged as unknown as Mock).mockImplementation(() => () => {});
  });

  it("keeps password recovery responses neutral and restricts continuation URLs", async () => {
    sdk.sendPasswordResetEmail.mockRejectedValueOnce({ code: "auth/user-not-found" });
    const adapter = createAuthAdapter();
    const result = await adapter.resetPasswordForEmail("person@example.test", { redirectTo: "https://attacker.example/landing" });
    expect(result.error).toBeNull();
    expect(sdk.sendPasswordResetEmail).toHaveBeenCalledWith(sdk.auth, "person@example.test", {
      url: `${window.location.origin}/auth?flow=reset-complete`,
      handleCodeInApp: false,
    });
  });

  it("does not return account-specific sign-in errors", async () => {
    sdk.signInWithEmailAndPassword.mockRejectedValueOnce({ code: "auth/user-not-found", message: "missing person@example.test" });
    const result = await createAuthAdapter().signInWithPassword({ email: "person@example.test", password: "bad" });
    expect(result.error?.message).toBe("Unable to authenticate with these details. Check them or try another sign-in method.");
    expect(result.error?.message).not.toContain("person@example.test");
  });

  it("persists the OAuth return destination and a fresh pending flag for the redirect handoff", async () => {
    const adapter = createAuthAdapter();
    const result = await adapter.signInWithOAuth({
      provider: "google",
      options: { redirectTo: "https://example.org/chatbot?q=hello" },
    });
    expect(result.error).toBeNull();
    expect(sdk.signInWithRedirect).toHaveBeenCalledTimes(1);

    // The previous implementation dropped options.redirectTo entirely, so
    // Firebase returned the browser to /auth and the destination was lost.
    expect(window.sessionStorage.getItem(RETURN_KEY)).toBe("https://example.org/chatbot?q=hello");
    // Timestamp format (not the legacy bare "1") so the handoff can expire it.
    expect(Number(window.sessionStorage.getItem(PENDING_KEY))).toBeGreaterThan(0);
  });

  it("clears the handoff state when initiating the redirect fails", async () => {
    sdk.signInWithRedirect.mockRejectedValueOnce({ code: "auth/unauthorized-domain" });
    window.sessionStorage.setItem(PENDING_KEY, String(Date.now()));
    const adapter = createAuthAdapter();
    const result = await adapter.signInWithOAuth({ provider: "google" });
    expect(result.error).not.toBeNull();
    expect(window.sessionStorage.getItem(PENDING_KEY)).toBeNull();
  });

  it("clears the pending flag and fires SIGNED_IN when the redirect result has a user", async () => {
    window.sessionStorage.setItem(PENDING_KEY, String(Date.now()));
    window.sessionStorage.setItem(RETURN_KEY, "https://example.org/chatbot");
    sdk.getRedirectResult.mockResolvedValueOnce({ user: mockFbUser() });

    const adapter = createAuthAdapter();
    const cb = vi.fn();
    adapter.onAuthStateChange(cb);

    await vi.waitFor(() => expect(cb).toHaveBeenCalledWith("SIGNED_IN", expect.objectContaining({
      user: expect.objectContaining({ id: "u1", email: "person@example.test" }),
    })));
    // Regression: the previous code only cleared the flag on the failure
    // paths, leaving a stale pending flag after every successful Google login.
    expect(window.sessionStorage.getItem(PENDING_KEY)).toBeNull();
    // The stored destination stays until the auth page consumes it.
    expect(window.sessionStorage.getItem(RETURN_KEY)).toBe("https://example.org/chatbot");
  });

  it("recovers via the pending flag when the redirect result is empty but a session exists", async () => {
    window.sessionStorage.setItem(PENDING_KEY, String(Date.now()));
    sdk.getRedirectResult.mockResolvedValueOnce(null);
    sdk.auth.currentUser = mockFbUser();

    const adapter = createAuthAdapter();
    const cb = vi.fn();
    adapter.onAuthStateChange(cb);

    await vi.waitFor(() => expect(cb).toHaveBeenCalledWith("SIGNED_IN", expect.anything()));
    expect(window.sessionStorage.getItem(PENDING_KEY)).toBeNull();
    sdk.auth.currentUser = null;
  });

  it("surfaces the redirect error and clears pending state on getRedirectResult failure", async () => {
    window.sessionStorage.setItem(PENDING_KEY, String(Date.now()));
    sdk.getRedirectResult.mockRejectedValueOnce({ code: "auth/network-request-failed" });

    const adapter = createAuthAdapter();
    const cb = vi.fn();
    adapter.onAuthStateChange(cb);

    await vi.waitFor(() =>
      expect(window.sessionStorage.getItem("shadowtalk.firebase-auth-redirect-error")).toContain("Network error"),
    );
    expect(window.sessionStorage.getItem(PENDING_KEY)).toBeNull();
    expect(cb).not.toHaveBeenCalled();
  });
});
