import { useEffect, useCallback } from "react";

/**
 * Global keyboard shortcuts for power-user workflows.
 *
 * Hotkeys:
 *   Cmd/Ctrl + Enter       → dispatch prompt to all selected models
 *   Cmd/Ctrl + Shift + C   → run "Synthesize Consensus"
 *   Cmd/Ctrl + \           → toggle split-view columns
 *   Cmd/Ctrl + K           → open command palette (handled elsewhere, but
 *                             we expose it here for completeness)
 *
 * The hook takes a map of action callbacks; only the ones provided are
 * wired up. Each callback receives the original KeyboardEvent so the host
 * can do its own preventDefault / stopPropagation.
 *
 * Ignores key presses when the user is typing in an INPUT, TEXTAREA, or
 * contentEditable element — EXCEPT for Cmd+Enter which is the universal
 * "submit" shortcut and should always fire.
 */

export interface GlobalHotkeyActions {
  onDispatchToAllModels?: (e: KeyboardEvent) => void;
  onSynthesizeConsensus?: (e: KeyboardEvent) => void;
  onToggleSplitView?: (e: KeyboardEvent) => void;
  onOpenCommandPalette?: (e: KeyboardEvent) => void;
}

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName.toLowerCase();
  return tag === "input" || tag === "textarea" || target.isContentEditable;
}

export function useGlobalHotkeys(actions: GlobalHotkeyActions): void {
  const handleKey = useCallback(
    (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (!mod) return;

      // Cmd/Ctrl + Enter — dispatch to all models (always fires, even in inputs)
      if (e.key === "Enter" && !e.shiftKey) {
        if (actions.onDispatchToAllModels) {
          e.preventDefault();
          actions.onDispatchToAllModels(e);
        }
        return;
      }

      // For the rest, ignore if the user is typing in a text field
      if (isTypingTarget(e.target)) return;

      // Cmd/Ctrl + Shift + C — synthesize consensus
      if (e.shiftKey && (e.key === "c" || e.key === "C")) {
        if (actions.onSynthesizeConsensus) {
          e.preventDefault();
          actions.onSynthesizeConsensus(e);
        }
        return;
      }

      // Cmd/Ctrl + \ — toggle split view
      if (e.key === "\\") {
        if (actions.onToggleSplitView) {
          e.preventDefault();
          actions.onToggleSplitView(e);
        }
        return;
      }

      // Cmd/Ctrl + K — command palette (usually handled by the palette itself,
      // but we expose it here so the host can wire up an alternative trigger)
      if (e.key === "k" || e.key === "K") {
        if (actions.onOpenCommandPalette) {
          e.preventDefault();
          actions.onOpenCommandPalette(e);
        }
        return;
      }
    },
    [actions],
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKey, { capture: true });
    return () => window.removeEventListener("keydown", handleKey, { capture: true });
  }, [handleKey]);
}

export default useGlobalHotkeys;
