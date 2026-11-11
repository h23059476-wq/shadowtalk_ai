import { beforeEach, describe, expect, it, vi } from "vitest";

const sdk = vi.hoisted(() => ({
  auth: { currentUser: null as any },
  sendPasswordResetEmail: vi.fn(),
  signInWithEmailAndPassword: vi.fn(),
}));

vi.mock("./app", () => ({ fbAuth: () => sdk.auth }));
vi.mock("firebase/auth", () => ({
  GoogleAuthProvider: class {}, OAuthProvider: class {},
  applyActionCode: vi.fn(), confirmPasswordReset: vi.fn(),
  createUserWithEmailAndPassword: vi.fn(), getRedirectResult: vi.fn(),
  onAuthStateChanged: vi.fn(), reload: vi.fn(), sendEmailVerification: vi.fn(),
  sendPasswordResetEmail: sdk.sendPasswordResetEmail,
  signInAnonymously: vi.fn(), signInWithEmailAndPassword: sdk.signInWithEmailAndPassword,
  signInWithRedirect: vi.fn(), signOut: vi.fn(), updateEmail: vi.fn(),
  updatePassword: vi.fn(), updateProfile: vi.fn(), verifyPasswordResetCode: vi.fn(),
  deleteUser: vi.fn(),
}));

import { createAuthAdapter } from "./auth";

describe("Firebase auth adapter", () => {
  beforeEach(() => vi.clearAllMocks());

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
});