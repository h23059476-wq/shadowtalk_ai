import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { ThemeTemplateProvider } from "@/contexts/ThemeTemplateContext";

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

const { default: AppearanceStudioPage } = await import("@/pages/AppearanceStudioPage");

function renderPage() {
  return render(
    <MemoryRouter initialEntries={["/themes"]}>
      <ThemeTemplateProvider>
        <AppearanceStudioPage />
      </ThemeTemplateProvider>
    </MemoryRouter>,
  );
}

function typeSearch(value: string) {
  fireEvent.change(screen.getByTestId("theme-search"), { target: { value } });
}

beforeEach(() => {
  localStorage.clear();
  document.documentElement.style.cssText = "";
  delete document.documentElement.dataset.shadowtalkMode;
});

describe("Appearance Studio page", () => {
  it("renders the studio header and all 100 builtin theme cards", async () => {
    renderPage();
    expect(screen.getByTestId("appearance-studio")).toBeInTheDocument();
    expect(screen.getByText("Appearance Studio")).toBeInTheDocument();
    await waitFor(() => expect(screen.getAllByTestId("theme-card").length).toBeGreaterThanOrEqual(100));
  });

  it("shows all six collection sections with their labels", () => {
    renderPage();
    for (const id of [
      "section-collection-dark-futuristic",
      "section-collection-minimal-professional",
      "section-collection-nature-atmospheric",
      "section-collection-light-elegant",
      "section-collection-warm-creative",
      "section-collection-high-contrast",
    ]) {
      expect(screen.getByTestId(id)).toBeInTheDocument();
    }
    // Collection labels appear in both the filter chip and the section heading
    expect(screen.getAllByText("Dark and Futuristic").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("High Contrast and Accessibility").length).toBeGreaterThanOrEqual(1);
  });

  it("searches by name", async () => {
    renderPage();
    typeSearch("emerald");
    await waitFor(() => expect(screen.getAllByTestId("theme-card")).toHaveLength(1));
    expect(screen.getByText("Midnight Emerald")).toBeInTheDocument();
  });

  it("combines collection and light/dark filters", async () => {
    renderPage();
    fireEvent.click(screen.getByTestId("collection-filter-dark-futuristic"));
    await waitFor(() => expect(screen.getAllByTestId("theme-card")).toHaveLength(25));

    // Light filter on top: no light themes in the futuristic collection
    fireEvent.click(screen.getByTestId("mode-filter-light"));
    expect(screen.getByTestId("no-results")).toBeInTheDocument();

    fireEvent.click(screen.getByTestId("collection-filter-all"));
    await waitFor(() => {
      const cards = screen.getAllByTestId("theme-card");
      expect(cards.length).toBeGreaterThan(0);
      for (const card of cards) {
        expect(card.textContent).toContain("light");
      }
    });
  });

  it("favorites a theme and shows it in the favorites section", async () => {
    renderPage();
    expect(screen.queryByTestId("section-favorites")).not.toBeInTheDocument();
    fireEvent.click(screen.getAllByTestId("favorite-obsidian-indigo")[0]);
    await waitFor(() => expect(screen.getByTestId("section-favorites")).toBeInTheDocument());
    expect(screen.getAllByTestId("favorite-obsidian-indigo")[0]).toHaveAttribute("aria-pressed", "true");
  });

  it("applies a theme live and marks it active", async () => {
    renderPage();
    fireEvent.click(screen.getAllByTestId("apply-deep-sapphire")[0]);
    await waitFor(() => expect(screen.getAllByTestId("active-badge-deep-sapphire").length).toBeGreaterThan(0));
    expect(document.documentElement.dataset.shadowtalkTemplate).toBe("deep-sapphire");
    expect(document.documentElement.dataset.shadowtalkMode).toBe("dark");
    expect(screen.getByTestId("active-theme-label").textContent).toContain("Deep Sapphire");
    expect(localStorage.getItem("shadowtalk_active_theme_id")).toBe("deep-sapphire");
  });

  it("opens the theme designer from the Create Theme action", async () => {
    renderPage();
    fireEvent.click(screen.getByTestId("create-theme"));
    await waitFor(() => expect(screen.getByTestId("theme-designer")).toBeInTheDocument());
    expect(screen.getByTestId("designer-live-preview")).toBeInTheDocument();
    expect(screen.getByTestId("designer-name")).toBeInTheDocument();
  });

  it("shows a recently-used section after applying a theme", async () => {
    renderPage();
    expect(screen.queryByTestId("section-recents")).not.toBeInTheDocument();
    fireEvent.click(screen.getAllByTestId("apply-graphite")[0]);
    await waitFor(() => expect(screen.getByTestId("section-recents")).toBeInTheDocument());
    expect(screen.getByTestId("active-theme-label").textContent).toContain("Graphite");
  });

  it("keeps the required original concepts discoverable by search", async () => {
    renderPage();
    for (const [query, name] of [
      ["obsidian indigo", "Obsidian Indigo"],
      ["cosmic violet", "Cosmic Violet"],
      ["arctic light", "Arctic Light"],
    ] as Array<[string, string]>) {
      typeSearch(query);

      await waitFor(
        () => {
          const cards = screen.getAllByTestId("theme-card");
          expect(cards.length).toBeGreaterThan(0);
          expect(cards.some((card) => card.textContent?.includes(name))).toBe(true);
        },
        { timeout: 10000 },
      );

      typeSearch("");
    }
  });

  it("renders the custom themes empty state with a designer CTA", async () => {
    renderPage();
    expect(screen.getByTestId("custom-empty-cta")).toBeInTheDocument();
    fireEvent.click(screen.getByTestId("custom-empty-cta"));
    await waitFor(() => expect(screen.getByTestId("theme-designer")).toBeInTheDocument());
  });
});
