import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { ThemeTemplateProvider, useThemeTemplates } from "@/contexts/ThemeTemplateContext";

vi.mock("@/components/AuthProvider", async () => {
  const React = await import("react");
  return {
    AuthProvider: ({ children }: { children?: React.ReactNode }) =>
      React.createElement(React.Fragment, null, children),
    useAuth: () => ({
      user: null,
      session: null,
      loading: false,
      isOffline: false,
      isAnonymous: true,
      userPlan: "free",
      subscribed: false,
      subscriptionEnd: null,
      signOut: vi.fn(),
      checkSubscription: vi.fn(),
    }),
  };
});

const { getThemeById } = await import("@/lib/themes/registry");
const { ThemeDesigner } = await import("@/components/themes/ThemeDesigner");

/** Harness that renders the designer wired to the real provider context. */
function Harness({
  initialTheme,
  existingCustom = false,
}: {
  initialTheme?: ReturnType<typeof getThemeById> | null;
  existingCustom?: boolean;
}) {
  return (
    <MemoryRouter>
      <ThemeTemplateProvider>
        <DesignerViaContext initialTheme={initialTheme ?? null} existingCustom={existingCustom} />
      </ThemeTemplateProvider>
    </MemoryRouter>
  );
}

function DesignerViaContext({
  initialTheme,
  existingCustom,
}: {
  initialTheme: ReturnType<typeof getThemeById> | null;
  existingCustom: boolean;
}) {
  const { saveTheme, previewTheme, restoreDefaultAppearance, deleteTheme, duplicateTheme } = useThemeTemplates();
  return (
    <ThemeDesigner
      open
      onOpenChange={() => undefined}
      initialTheme={initialTheme}
      existingCustom={existingCustom}
      onSaveDraft={saveTheme}
      onApplyTemporary={previewTheme}
      onDelete={deleteTheme}
      onDuplicate={(theme) => duplicateTheme(theme.id)}
      onRestoreDefault={restoreDefaultAppearance}
    />
  );
}

beforeEach(() => {
  localStorage.clear();
  document.documentElement.style.cssText = "";
  delete document.documentElement.dataset.shadowtalkMode;
});

describe("Theme Designer", () => {
  it("renders controls, live preview and a passing contrast report for the default draft", () => {
    render(<Harness />);
    expect(screen.getByTestId("theme-designer")).toBeInTheDocument();
    expect(screen.getByTestId("designer-live-preview")).toBeInTheDocument();
    expect(screen.getByTestId("contrast-pass")).toBeInTheDocument();
    expect(screen.getByTestId("designer-name")).toHaveValue("My theme");
    for (const groupId of ["group-surfaces", "group-brand", "group-sidebar", "group-status", "group-charts", "group-code"]) {
      expect(screen.getByTestId(groupId)).toBeInTheDocument();
    }
  });

  it("edits a color, updates the preview, and resets the individual token", async () => {
    render(<Harness />);
    const input = screen.getByTestId("triplet-background");
    fireEvent.change(input, { target: { value: "210 30% 92%" } });
    fireEvent.blur(input);
    await waitFor(() => {
      expect(screen.getByTestId("contrast-fail")).toBeInTheDocument();
    });
    // Individual reset restores the initial value
    fireEvent.click(screen.getByTestId("reset-background"));
    await waitFor(() => expect(screen.getByTestId("contrast-pass")).toBeInTheDocument());
  });

  it("applies the draft temporarily without persisting", async () => {
    render(<Harness initialTheme={getThemeById("graphite")!} />);
    fireEvent.click(screen.getByTestId("designer-apply-temporary"));
    await waitFor(() => {
      expect(document.documentElement.dataset.shadowtalkTemplate).toBe("graphite");
      expect(localStorage.getItem("shadowtalk_active_theme_id")).toBeNull();
    });
  });

  it("saves a new personal theme that shows up in the store", async () => {
    render(<Harness />);
    fireEvent.change(screen.getByTestId("designer-name"), { target: { value: "Studio Special" } });
    fireEvent.click(screen.getByTestId("designer-save"));
    await waitFor(() => {
      const stored = JSON.parse(localStorage.getItem("shadowtalk_custom_themes_v1") ?? "[]");
      expect(stored.some((t: { name: string }) => t.name === "Studio Special")).toBe(true);
    });
  });

  it("rejects invalid JSON imports with an inline error", async () => {
    render(<Harness />);
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    expect(input).toBeTruthy();
    const file = new File(["{ this is not json"], "bad.json", { type: "application/json" });
    Object.defineProperty(input, "files", { value: [file], configurable: true });
    fireEvent.change(input);
    await waitFor(() => expect(screen.getByRole("alert")).toBeInTheDocument());
    expect(screen.getByRole("alert").textContent).toContain("Invalid JSON");
  });

  it("imports a valid exported theme into the editor", async () => {
    const { exportThemeJson } = await import("@/lib/themes/customThemes");
    const json = exportThemeJson(getThemeById("obsidian-indigo")!);
    render(<Harness />);
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File([json], "theme.json", { type: "application/json" });
    Object.defineProperty(input, "files", { value: [file], configurable: true });
    fireEvent.change(input);
    await waitFor(() => {
      expect((screen.getByTestId("designer-name") as HTMLInputElement).value).toBe("Obsidian Indigo");
    });
    expect(screen.getByTestId("contrast-pass")).toBeInTheDocument();
  });

  it("exports the current draft as valid JSON", async () => {
    const { exportThemeJson } = await import("@/lib/themes/customThemes");
    const exported = exportThemeJson(getThemeById("graphite")!);
    expect(JSON.parse(exported).format).toBe("shadowtalk-theme");
  });

  it("reset theme restores every token to the initial draft", async () => {
    render(<Harness initialTheme={getThemeById("graphite")!} />);
    const initial = (getThemeById("graphite")!).tokens.background;
    const input = screen.getByTestId("triplet-background");
    fireEvent.change(input, { target: { value: "0 0% 50%" } });
    fireEvent.blur(input);
    fireEvent.click(screen.getByTestId("designer-reset"));
    await waitFor(() => {
      expect((screen.getByTestId("triplet-background") as HTMLInputElement).value).toBe(initial);
    });
  });

  it("switching mode flips surface polarity for light themes", async () => {
    render(<Harness initialTheme={getThemeById("obsidian-indigo")!} />);
    fireEvent.click(screen.getByTestId("designer-mode-light"));
    await waitFor(() => {
      expect(screen.getByTestId("designer-mode-light")).toHaveAttribute("aria-pressed", "true");
    });
    const bg = (screen.getByTestId("triplet-background") as HTMLInputElement).value;
    const l = Number.parseFloat(bg.split(" ")[2]);
    expect(l).toBeGreaterThan(80);
  });
});
