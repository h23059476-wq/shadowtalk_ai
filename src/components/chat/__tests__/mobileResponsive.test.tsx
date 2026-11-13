/**
 * Mobile responsiveness regression tests (mobile initiative, Batch 5).
 *
 * Locks in the Phase-2 behaviours so later refactors cannot silently
 * re-break the mobile workspace:
 *  - ChatToolbar is reachable on mobile (was `hidden md:flex` — G1);
 *  - ChatMobileNavDrawer exposes dialog semantics, closes on Escape and
 *    caps its width (G8);
 *  - MessageBubble action buttons are visible without hover (G5).
 * jsdom/happy-dom cannot compute layout, so these assert the responsive
 * CLASS CONTRACT plus real behaviour (Escape handling). Layout is verified
 * with real-browser screenshots (see docs/mobile/RESPONSIVE_TEST_RESULTS.md).
 */
import { describe, expect, it, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

// Chat components consume useAuth (sidebar identity, referral code, …) —
// same pattern as src/pages/__tests__/AppearanceStudioPage.test.tsx.
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

import { ChatToolbar } from "../ChatToolbar";
import { ChatMobileNavDrawer } from "../ChatMobileNavDrawer";
import { MessageBubble } from "../MessageBubble";

afterEach(cleanup);

const toolbarProps = {
  hasActiveChat: true,
  conversationCount: 3,
  onNewChat: vi.fn(),
  onOpenHistory: vi.fn(),
  onClearChat: vi.fn(),
  onDeleteAllChats: vi.fn(),
};

describe("ChatToolbar — reachable on mobile (G1)", () => {
  it("renders as a visible scrollable strip (no hidden md:flex)", () => {
    const { container } = render(<MemoryRouter><ChatToolbar {...toolbarProps} /></MemoryRouter>);
    const root = container.firstElementChild as HTMLElement;
    expect(root.className).not.toContain("hidden md:flex");
    expect(root.className).toContain("flex items-center");
    expect(root.className).toContain("overflow-x-auto");
  });

  it("keeps labels visible on desktop and exposes aria-labels for icon-only mobile state", () => {
    render(<MemoryRouter><ChatToolbar {...toolbarProps} /></MemoryRouter>);
    // Icon-only below md → every control needs an accessible name.
    for (const label of ["Start a new conversation", "View chat history", "Clear messages in this chat", "Open settings", "Delete all conversations"]) {
      expect(screen.getByLabelText(label)).toBeTruthy();
    }
    // Labels hidden below md, visible on md+.
    const newChatLabel = screen.getByText("New chat");
    expect(newChatLabel.className).toContain("hidden md:inline");
  });
});

describe("ChatMobileNavDrawer — accessible mobile navigation (G8)", () => {
  const base = {
    open: true,
    onClose: vi.fn(),
    userInitials: "TU",
    userDisplayName: "Test User",
    onNewChat: vi.fn(),
    conversations: [],
    currentConversationId: null,
    isArchived: () => false,
    onSelect: vi.fn(),
    onDelete: vi.fn(),
    onArchive: vi.fn(),
    onUnarchive: vi.fn(),
    onOpenSettings: vi.fn(),
  };

  it("exposes dialog semantics and a width-capped panel", () => {
    const { container } = render(<MemoryRouter><ChatMobileNavDrawer {...base} /></MemoryRouter>);
    const dialog = container.querySelector('[role="dialog"]');
    expect(dialog).toBeTruthy();
    expect(dialog!.getAttribute("aria-modal")).toBe("true");
    expect(dialog!.className).toContain("w-[min(86vw,20rem)]");
    expect(dialog!.className).toContain("md:hidden");
  });

  it("closes on Escape and locks body scroll while open", () => {
    const onClose = vi.fn();
    render(<MemoryRouter><ChatMobileNavDrawer {...base} onClose={onClose} /></MemoryRouter>);
    expect(document.body.style.overflow).toBe("hidden");
    fireEvent.keyDown(window, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

describe("MessageBubble — touch-visible actions (G5)", () => {
  const baseMessage = {
    id: "m1",
    type: "ai" as const,
    content: "USDT reserves are concentrated in short-term treasuries.",
    timestamp: new Date("2026-11-13T10:00:00Z"),
  };

  function renderBubble() {
    return render(
      <MemoryRouter>
        <MessageBubble
          message={baseMessage}
          index={0}
          isLoading={false}
          userPlan="free"
          speakingMessageId={null}
          isSpeaking={false}
          onEdit={vi.fn()}
          onRegenerate={vi.fn()}
          onTextToSpeech={vi.fn()}
          onOpenCodeCanvas={vi.fn()}
        />
      </MemoryRouter>,
    );
  }

  it("shows regenerate/copy actions without hover (visible on touch)", () => {
    const { container } = renderBubble();
    const actions = container.querySelector(".opacity-100.sm\\:opacity-0");
    expect(actions).toBeTruthy();
    // Desktop keeps the hover-reveal contract.
    expect(actions!.className).toContain("sm:group-hover:opacity-100");
    expect(screen.getByLabelText("Regenerate response")).toBeTruthy();
    expect(screen.getByLabelText("Copy message")).toBeTruthy();
  });
});
