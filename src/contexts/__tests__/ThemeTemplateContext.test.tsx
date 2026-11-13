import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { ThemeTemplateProvider, useThemeTemplates, type ThemeTemplateContextValue } from "@/contexts/ThemeTemplateContext";

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

const { normalizeTheme } = await import("@/lib/themes/normalize");
const { getThemeById } = await import("@/lib/themes/registry");

/** Exposes the full provider state to assertions without a UI. */
function Probe() {
  const appearance = useThemeTemplates();
  return (
    <div
      data-testid="probe"
      data-active={appearance.activeTheme?.id ?? ""}
      data-temp={String(appearance.isTemporaryPreview)}
      data-custom-count={String(appearance.customThemes.length)}
      data-builtin-count={String(appearance.builtinThemes.length)}
      data-legacy-template-count={String(appearance.templates.length)}
      data-favorites={JSON.stringify(appearance.favorites)}
      data-recents={JSON.stringify(appearance.recents)}
    />
  );
}

function renderProvider(): { getApi: () => ThemeTemplateContextValue } {
  const apiRef: { current: ThemeTemplateContextValue | null } = { current: null };
  function ProbeWithCapture() {
    apiRef.current = useThemeTemplates();
    return <Probe />;
  }
  render(
    <MemoryRouter>
      <ThemeTemplateProvider>
        <ProbeWithCapture />
      </ThemeTemplateProvider>
    </MemoryRouter>,
  );
  return { getApi: () => apiRef.current! };
}

const probe = () => screen.getByTestId("probe");

beforeEach(() => {
  localStorage.clear();
  document.documentElement.style.cssText = "";
  delete document.documentElement.dataset.shadowtalkMode;
});

describe("ThemeTemplateProvider (Appearance provider)", () => {
  it("exposes the 100 builtin themes through both new and legacy APIs", () => {
    renderProvider();
    expect(Number(probe().dataset.builtinCount)).toBe(100);
    expect(Number(probe().dataset.legacyTemplateCount)).toBe(100);
  });

  it("applies a legacy 21-token template without breaking", async () => {
    const { getApi } = renderProvider();
    await waitFor(() => expect(getApi()).not.toBeNull());
    const legacy = normalizeTheme({
      id: "legacy-x",
      name: "Legacy X",
      mode: "dark",
      tokens: { background: "0 0% 3%", foreground: "0 0% 96%", primary: "195 100% 55%" },
    })!;
    act(() => {
      getApi().applyTemplate(legacy);
    });
    expect(probe().dataset.active).toBe("legacy-x");
    expect(document.documentElement.dataset.shadowtalkMode).toBe("dark");
    expect(localStorage.getItem("shadowtalk_active_theme_id")).toBe("legacy-x");
  });

  it("applyThemeById resolves builtin ids, records recents, ignores unknown ids", async () => {
    const { getApi } = renderProvider();
    await waitFor(() => expect(getApi()).not.toBeNull());
    act(() => {
      getApi().applyThemeById("cosmic-violet");
    });
    expect(probe().dataset.active).toBe("cosmic-violet");
    expect(JSON.parse(probe().dataset.recents ?? "[]")).toContain("cosmic-violet");
    act(() => {
      getApi().applyThemeById("does-not-exist");
    });
    expect(probe().dataset.active).toBe("cosmic-violet");
  });

  it("favorites toggle and custom theme lifecycle", async () => {
    const { getApi } = renderProvider();
    await waitFor(() => expect(getApi()).not.toBeNull());
    const custom = normalizeTheme({
      id: "custom-life",
      name: "Lifecycle",
      mode: "dark",
      tokens: { background: "250 30% 6%" },
    })!;

    act(() => {
      getApi().toggleFavorite("obsidian-indigo");
    });
    expect(JSON.parse(probe().dataset.favorites ?? "[]")).toContain("obsidian-indigo");

    let saveResult: { ok: boolean } = { ok: false };
    act(() => {
      saveResult = getApi().saveTheme(custom);
    });
    expect(saveResult.ok).toBe(true);
    expect(Number(probe().dataset.customCount)).toBe(1);

    act(() => {
      getApi().applyThemeById("custom-life");
    });
    expect(probe().dataset.active).toBe("custom-life");

    act(() => {
      getApi().deleteTheme("custom-life");
    });
    expect(Number(probe().dataset.customCount)).toBe(0);
    expect(probe().dataset.active).toBe("");
    // favorites and recents referencing the deleted theme are cleaned up
    expect(JSON.parse(probe().dataset.favorites ?? "[]")).not.toContain("custom-life");
    expect(JSON.parse(probe().dataset.recents ?? "[]")).not.toContain("custom-life");
  });

  it("temporary preview commits and discards cleanly", async () => {
    const { getApi } = renderProvider();
    await waitFor(() => expect(getApi()).not.toBeNull());
    act(() => {
      getApi().previewTheme(getThemeById("graphite")!);
    });
    expect(probe().dataset.active).toBe("graphite");
    expect(probe().dataset.temp).toBe("true");
    expect(localStorage.getItem("shadowtalk_active_theme_id")).toBeNull();

    act(() => {
      getApi().commitPreview();
    });
    expect(probe().dataset.temp).toBe("false");
    expect(localStorage.getItem("shadowtalk_active_theme_id")).toBe("graphite");
  });

  it("restoreDefaultAppearance returns to the stock look", async () => {
    const { getApi } = renderProvider();
    await waitFor(() => expect(getApi()).not.toBeNull());
    act(() => {
      getApi().applyThemeById("graphite");
    });
    act(() => {
      getApi().restoreDefaultAppearance();
    });
    expect(probe().dataset.active).toBe("");
    expect(document.documentElement.dataset.shadowtalkMode).toBeUndefined();
    expect(localStorage.getItem("shadowtalk_active_theme_id")).toBeNull();
  });
});
