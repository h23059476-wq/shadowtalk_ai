/**
 * ShadowTalk AI — Appearance Studio font options.
 *
 * Fonts are loaded via Google Fonts in index.css; a theme only selects which
 * stack the app uses through the `--app-font-sans` / `--app-font-mono`
 * variables. No font binaries ship in the bundle.
 */

export interface FontOption {
  id: string;
  label: string;
  /** Complete CSS font-family stack (fallbacks included). */
  stack: string;
}

export const SANS_FONTS: FontOption[] = [
  { id: "inter", label: "Inter", stack: "'Inter', system-ui, -apple-system, sans-serif" },
  { id: "system", label: "System UI", stack: "system-ui, -apple-system, 'Segoe UI', sans-serif" },
  { id: "ibm-plex-sans", label: "IBM Plex Sans", stack: "'IBM Plex Sans', 'Inter', system-ui, sans-serif" },
  { id: "manrope", label: "Manrope", stack: "'Manrope', 'Inter', system-ui, sans-serif" },
];

export const MONO_FONTS: FontOption[] = [
  { id: "jetbrains-mono", label: "JetBrains Mono", stack: "'JetBrains Mono', ui-monospace, monospace" },
  { id: "ibm-plex-mono", label: "IBM Plex Mono", stack: "'IBM Plex Mono', ui-monospace, monospace" },
  { id: "fira-code", label: "Fira Code", stack: "'Fira Code', 'JetBrains Mono', ui-monospace, monospace" },
];

export const DEFAULT_SANS_FONT = "inter";
export const DEFAULT_MONO_FONT = "jetbrains-mono";

export function getSansFont(id: string | undefined): FontOption {
  return SANS_FONTS.find((f) => f.id === id) ?? SANS_FONTS[0];
}

export function getMonoFont(id: string | undefined): FontOption {
  return MONO_FONTS.find((f) => f.id === id) ?? MONO_FONTS[0];
}
