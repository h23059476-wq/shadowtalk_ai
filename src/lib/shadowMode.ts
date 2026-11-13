const SHADOW_MODE_KEY = "shadowtalk_shadow_mode";

/**
 * Shadow (stealth) mode is an explicit opt-in: when enabled it brand-locks
 * the semantic tokens with !important so Appearance Studio themes cannot
 * leak into it. It must therefore default to OFF — otherwise every fresh
 * visitor would silently get the brand-locked look and studio themes would
 * never visibly apply site-wide. The base :root tokens already render the
 * ShadowTalk dark brand look when no theme is applied.
 */
export function getShadowModeEnabled(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(SHADOW_MODE_KEY) === "true";
}

export function applyShadowMode(enabled: boolean): void {
  if (typeof document === "undefined") return;
  document.documentElement.classList.toggle("stealth-mode", enabled);
}

export function setShadowModeEnabled(enabled: boolean): void {
  localStorage.setItem(SHADOW_MODE_KEY, enabled ? "true" : "false");
  applyShadowMode(enabled);
}

export function initShadowMode(): void {
  applyShadowMode(getShadowModeEnabled());
}
