import type { Monaco } from "@monaco-editor/react";

/**
 * The ShadowTalk editor theme — the brand palette applied to code.
 *
 * Derived from the Sovereign OS design tokens in index.css:
 *   primary   hsl(195 100% 55%) → #1ac6ff  (keywords, cursor)
 *   secondary hsl(270  90% 62%) → #a78bfa  (strings)
 *   accent    hsl(315  90% 58%) → #f472b6  (numbers, tags)
 *   background hsl(240  12%  3%) → #08080d
 */
export const SHADOWTALK_MONACO_THEME = "shadowtalk-dark";

const TOKEN_RULES = [
  { token: "", foreground: "C9C9D6" },
  { token: "comment", foreground: "61617A", fontStyle: "italic" },
  { token: "keyword", foreground: "1AC6FF" },
  { token: "keyword.json", foreground: "1AC6FF" },
  { token: "string", foreground: "A78BFA" },
  { token: "string.html", foreground: "A78BFA" },
  { token: "number", foreground: "F472B6" },
  { token: "regexp", foreground: "F0ABFC" },
  { token: "type", foreground: "67E8F9" },
  { token: "type.identifier", foreground: "67E8F9" },
  { token: "identifier", foreground: "E4E4F0" },
  { token: "function", foreground: "7DD3FC" },
  { token: "delimiter", foreground: "8A8AA3" },
  { token: "tag", foreground: "F472B6" },
  { token: "tag.html", foreground: "F472B6" },
  { token: "attribute.name", foreground: "1AC6FF" },
  { token: "attribute.name.html", foreground: "1AC6FF" },
  { token: "attribute.value", foreground: "A78BFA" },
  { token: "metatag", foreground: "8A8AA3" },
] as const;

const THEME_COLORS = {
  "editor.background": "#08080D",
  "editor.foreground": "#C9C9D6",
  "editorLineNumber.foreground": "#3B3B52",
  "editorLineNumber.activeForeground": "#A5A5C0",
  "editorCursor.foreground": "#1AC6FF",
  "editor.selectionBackground": "#1AC6FF33",
  "editor.inactiveSelectionBackground": "#1AC6FF1A",
  "editor.lineHighlightBackground": "#12121C",
  "editorIndentGuide.background1": "#1B1B2A",
  "editorIndentGuide.activeBackground1": "#2E2E44",
  "editorWidget.background": "#0C0C15",
  "editorWidget.border": "#23233A",
  "editorSuggestWidget.background": "#0C0C15",
  "editorSuggestWidget.border": "#23233A",
  "editorSuggestWidget.selectedBackground": "#1AC6FF1F",
  "editorHoverWidget.background": "#0C0C15",
  "editorHoverWidget.border": "#23233A",
  "scrollbarSlider.background": "#23233A66",
  "scrollbarSlider.hoverBackground": "#2E2E4A99",
  "scrollbarSlider.activeBackground": "#1AC6FF44",
  "editorBracketMatch.background": "#1AC6FF26",
  "editorBracketMatch.border": "#1AC6FF66",
  "editorOverviewRuler.border": "#00000000",
  "editorGutter.background": "#08080D",
  "editor.findMatchBackground": "#F472B640",
  "editor.findMatchHighlightBackground": "#F472B626",
  "minimap.background": "#0A0A12",
} as const;

type MonacoWithTheme = Monaco & {
  editor: Monaco["editor"] & {
    defineTheme: (name: string, theme: unknown) => void;
  };
};

/** Register (or refresh) the ShadowTalk editor theme before first paint. */
export function defineShadowTalkTheme(monaco: Monaco): void {
  const m = monaco as MonacoWithTheme;
  m.editor.defineTheme(SHADOWTALK_MONACO_THEME, {
    base: "vs-dark",
    inherit: true,
    rules: TOKEN_RULES.map((rule) => ({ ...rule })),
    colors: { ...THEME_COLORS },
  });
}
