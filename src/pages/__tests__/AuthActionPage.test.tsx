import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import AuthActionPage from "../AuthActionPage";

const auth = vi.hoisted(() => ({
  verifyPasswordResetCode: vi.fn(),
  confirmPasswordReset: vi.fn(),
  applyEmailVerificationCode: vi.fn(),
}));

vi.mock("@/integrations/local/client", () => ({ backend: { auth } }));

function renderAction(path: string) {
  return render(<MemoryRouter initialEntries={[path]}><AuthActionPage /></MemoryRouter>);
}

describe("AuthActionPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    auth.verifyPasswordResetCode.mockResolvedValue({ data: { email: "person@example.test" }, error: null });
    auth.confirmPasswordReset.mockResolvedValue({ data: {}, error: null });
    auth.applyEmailVerificationCode.mockResolvedValue({ data: {}, error: null });
  });

  it("validates a reset code and completes the password reset", async () => {
    renderAction("/auth/action?mode=resetPassword&oobCode=valid-code");
    expect(await screen.findByText("person@example.test")).toBeTruthy();
    fireEvent.change(screen.getByLabelText("New password"), { target: { value: "NewPass!123" } });
    fireEvent.change(screen.getByLabelText("Confirm new password"), { target: { value: "NewPass!123" } });
    fireEvent.click(screen.getByRole("button", { name: "Save new password" }));
    expect(await screen.findByText("Your password has been changed. You can now sign in with it.")).toBeTruthy();
    expect(auth.confirmPasswordReset).toHaveBeenCalledWith("valid-code", "NewPass!123");
  });

  it("shows a neutral error for an expired reset code", async () => {
    auth.verifyPasswordResetCode.mockResolvedValue({ data: null, error: new Error("expired") });
    renderAction("/auth/action?mode=resetPassword&oobCode=expired-code");
    expect(await screen.findByRole("alert")).toHaveTextContent("invalid or has expired");
  });

  it("applies verification codes without blocking account access", async () => {
    renderAction("/auth/action?mode=verifyEmail&oobCode=verify-code");
    expect(await screen.findByText("Your email address is verified. You can return to ShadowTalk and sign in.")).toBeTruthy();
    expect(auth.applyEmailVerificationCode).toHaveBeenCalledWith("verify-code");
  });
});