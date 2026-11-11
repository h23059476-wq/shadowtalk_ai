const RELOAD_SESSION_KEY = "shadowtalk_vite_deps_reload_v1";

const DUPLICATE_REACT_PATTERNS = [
  "reading 'useState'",
  "reading 'useContext'",
  "reading 'useEffect'",
  "reading 'useRef'",
  "Invalid hook call",
];

export function isDuplicateReactError(message: string): boolean {
  return DUPLICATE_REACT_PATTERNS.some((p) => message.includes(p));
}

/** One-time hard reload when stale Vite dep chunks mix two React copies (ShadowTalk preview). */
export function installViteChunkRecovery(): void {
  if (typeof window === "undefined") return;

  window.addEventListener(
    "error",
    (event) => {
      const msg = event.message ?? (event.error instanceof Error ? event.error.message : "");
      if (!msg || !isDuplicateReactError(msg)) return;

      try {
        if (sessionStorage.getItem(RELOAD_SESSION_KEY)) return;
        sessionStorage.setItem(RELOAD_SESSION_KEY, "1");
      } catch {
        return;
      }

      const url = new URL(window.location.href);
      url.searchParams.set("vite_refresh", String(Date.now()));
      window.location.replace(url.toString());
    },
    true,
  );
}

export function clearViteChunkRecoveryFlag(): void {
  try {
    sessionStorage.removeItem(RELOAD_SESSION_KEY);
  } catch {
    /* ignore */
  }
}
