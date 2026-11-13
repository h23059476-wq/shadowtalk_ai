import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useOAuthReturnHandoff } from "./useOAuthReturnHandoff";

const PENDING_KEY = "shadowtalk_auth_redirect_pending";
const RETURN_KEY = "shadowtalk_oauth_return_destination";

const baseProps = (over: Partial<Parameters<typeof useOAuthReturnHandoff>[0]> = {}) => ({
  authenticated: false,
  authLoading: false,
  fallbackDestination: "/chatbot",
  toast: vi.fn(),
  hardNavigate: vi.fn(),
  ...over,
});

describe("useOAuthReturnHandoff", () => {
  beforeEach(() => {
    window.sessionStorage.clear();
    vi.useRealTimers();
  });
  afterEach(() => vi.useRealTimers());

  const setFreshFlag = () => window.sessionStorage.setItem(PENDING_KEY, String(Date.now()));

  it("does nothing when no OAuth redirect is pending", () => {
    const props = baseProps({ authenticated: true });
    renderHook((p) => useOAuthReturnHandoff(p), { initialProps: props });
    expect(props.hardNavigate).not.toHaveBeenCalled();
    expect(props.toast).not.toHaveBeenCalled();
  });

  it("waits for auth initialization before deciding anything", () => {
    setFreshFlag();
    const props = baseProps({ authenticated: true, authLoading: true });
    renderHook((p) => useOAuthReturnHandoff(p), { initialProps: props });
    expect(props.hardNavigate).not.toHaveBeenCalled();
    expect(window.sessionStorage.getItem(PENDING_KEY)).not.toBeNull();
  });

  it("navigates to the stored destination once the session is confirmed", async () => {
    setFreshFlag();
    window.sessionStorage.setItem(RETURN_KEY, "/chatbot?q=remembered-prompt");
    const props = baseProps({ authenticated: true });
    const { rerender } = renderHook((p) => useOAuthReturnHandoff(p), { initialProps: props });

    await waitFor(() => expect(props.hardNavigate).toHaveBeenCalledTimes(1));
    expect(props.hardNavigate).toHaveBeenCalledWith("/chatbot?q=remembered-prompt");
    expect(window.sessionStorage.getItem(PENDING_KEY)).toBeNull();
    expect(window.sessionStorage.getItem(RETURN_KEY)).toBeNull();

    // Idempotent — a re-render must not navigate twice.
    rerender(props);
    expect(props.hardNavigate).toHaveBeenCalledTimes(1);
  });

  it("falls back to /chatbot when no destination was stored", async () => {
    setFreshFlag();
    const props = baseProps({ authenticated: true, fallbackDestination: "/chatbot?q=from-auth" });
    renderHook((p) => useOAuthReturnHandoff(p), { initialProps: props });
    await waitFor(() => expect(props.hardNavigate).toHaveBeenCalledWith("/chatbot?q=from-auth"));
  });

  it("defers navigation while auth restores, then navigates when the user arrives", async () => {
    setFreshFlag();
    // Keep stable mock refs across rerenders so assertions see all calls.
    const toast = vi.fn();
    const hardNavigate = vi.fn();
    const props = baseProps({ authenticated: false, authLoading: true, toast, hardNavigate });
    const { rerender } = renderHook((p) => useOAuthReturnHandoff(p), { initialProps: props });
    expect(hardNavigate).not.toHaveBeenCalled();

    // Session restored AFTER auth init — the classic post-redirect timing.
    rerender(baseProps({ authenticated: true, authLoading: false, toast, hardNavigate }));
    await waitFor(() => expect(hardNavigate).toHaveBeenCalledTimes(1));
    expect(toast).not.toHaveBeenCalled();
  });

  it("reports a meaningful failure when the redirect completes with no session", () => {
    setFreshFlag();
    const toast = vi.fn();
    const props = baseProps({ authenticated: false, authLoading: false, toast });
    renderHook((p) => useOAuthReturnHandoff(p), { initialProps: props });
    expect(toast).toHaveBeenCalledTimes(1);
    expect(toast.mock.calls[0][0].title).toContain("didn't complete");
    expect(props.hardNavigate).not.toHaveBeenCalled();
    expect(window.sessionStorage.getItem(PENDING_KEY)).toBeNull();
  });

  it("ignores stale pending flags (browser without a just-attempted sign-in)", () => {
    window.sessionStorage.setItem(PENDING_KEY, String(Date.now() - 6 * 60 * 1000));
    const props = baseProps({ authenticated: false, authLoading: false });
    renderHook((p) => useOAuthReturnHandoff(p), { initialProps: props });
    expect(props.toast).not.toHaveBeenCalled();
  });
});
