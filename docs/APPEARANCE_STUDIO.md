# Appearance Studio

Route: **`/themes`** · Branch: `feature/appearance-studio` · Free for all users — no paywalls.

Appearance Studio is a first-class ShadowTalk feature for discovering, previewing and creating
themes. It ships **100 curated builtin themes across 6 collections**, a favorites/recents system,
personal custom themes with cross-device sync, and a no-code visual Theme Designer.

## Architecture

One centralized theme engine. No per-theme CSS. No duplicate providers.

```
src/lib/themes/
  types.ts           # ThemeTemplate (legacy) + ResolvedTheme (canonical), storage keys, caps
  contrast.ts        # WCAG math: hsl/hex conversion, luminance, contrastRatio, ensureContrast
  collections.ts     # 6 collection definitions + expected counts
  fonts.ts           # Sans/mono font options (loaded via Google Fonts in index.css)
  registry.ts        # 100 hand-tuned seeds → deterministic buildTheme() → THEME_REGISTRY
  normalize.ts       # Any theme-like data (incl. legacy 21-token JSON) → complete ResolvedTheme
  applyTheme.ts      # Writes 29 CSS vars + fonts/radius/chart/code vars + data-* attrs; persist flag
  customThemes.ts    # Custom theme CRUD (localStorage) + zod-validated JSON import/export
  appearancePrefs.ts # Favorites, recents, Firestore user_settings sync + merge policy
  generateTemplates.ts  # (legacy) original procedural generator, still supported

src/contexts/ThemeTemplateContext.tsx  # Single provider: legacy API + full studio API
src/pages/AppearanceStudioPage.tsx     # /themes discovery page
src/components/themes/                 # ThemeMiniPreview, ThemePreviewCard, ThemePreviewDialog,
                                       # ThemeDesigner, themeVars.ts
```

### Theme application

`applyTheme(theme)` normalizes the input, then writes **inline CSS variables on `<html>`** —
`--background … --sidebar-ring` (29 tokens), `--radius`, `--app-font-sans/mono`, `--chart-1…5`,
`--code-background/foreground` — plus `data-shadowtalk-template/motion/density/mode` attributes.
Inline variables beat every stylesheet rule, so the whole app (chat, sidebar, settings, modals,
inputs, dropdowns, toasts, docs, code blocks, charts) re-skins instantly with zero component
changes. Tailwind maps every semantic color to `hsl(var(--token))` (`tailwind.config.ts`).

- Light/dark: `data-shadowtalk-mode="light|dark"`; `index.css` re-derives the few hardcoded
  glass/gradient surfaces under `[data-shadowtalk-mode="light"]`.
- Stealth mode: `.stealth-mode` tokens now use `!important` so themes can never leak into it.
- Fonts: themes select from Inter, System UI, IBM Plex Sans, Manrope (sans) and JetBrains Mono,
  IBM Plex Mono, Fira Code (mono) via `--app-font-sans/mono` (loaded once in `index.css`).
- Charts: `--chart-1…5` tokens; code blocks: `--code-background/foreground`.

### Contrast guarantees

Every builtin theme is built by `buildTheme()`, which auto-corrects any text-carrying pair below
WCAG AA (4.5:1) — including nudging vivid base colors out of the "dead zone" where neither dark
nor light text passes (`ensureTextable`). The High Contrast collection additionally achieves
**AAA (≥ 7:1)** body-text contrast. `validateThemeContrast()` powers both tests and the live
designer report.

## Discovery page (/themes)

Premium header (count, sync state, active theme), sticky toolbar (search, collection chips,
All/Light/Dark, favorites toggle), recently used, favorites, custom themes, and per-collection
grids of realistic mini previews (each card renders a true miniature of the app UI scoped by the
theme's own CSS variables). Search + all filters compose. Cards expose Preview, Apply, Favorite
and (for custom themes) Edit/Rename/Duplicate/Export/Delete.

## Theme Designer

Opened via *Create Theme*, custom-theme *Edit*, `/themes?design=new` or the Settings card.
Features: 29 editable semantic colors (picker + editable HSL triplet, per-token reset,
auto-derive foregrounds), chart + code colors, light/dark mode with polarity flip, 4 sans /
3 mono fonts, radius presets, density + motion, live scoped preview, live WCAG contrast report,
apply temporarily (non-persisted), save/rename/duplicate/delete, export JSON, import validated
JSON, restore default appearance. Import is **JSON-only, zod-validated, size-capped and
allow-listed — CSS/JS/HTML cannot enter, nothing is ever evaluated**.

## Persistence

| What | Where |
| --- | --- |
| Active theme | localStorage `shadowtalk_active_theme_id` + `_json` (reused legacy keys) |
| Custom themes | localStorage `shadowtalk_custom_themes_v1` (cap 50) |
| Favorites / recents | `shadowtalk_theme_favorites_v1` / `shadowtalk_theme_recents_v1` (cap 8) |
| Cross-device sync | Firestore `user_settings/{doc}` `setting_key: "appearance_studio"` |

Sync uses the app's existing `backend.from("user_settings")` client and the **already-whitelisted
owner-only rules** — no new collections, no rule changes needed. Merge policy: custom themes
union-by-id with newest `updatedAt` winning (nothing silently overwritten); favorites unioned;
recents capped; remote active theme adopted only when the local device has none. Offline or
Firestore failures degrade gracefully to local-only.

## Tests

`npx vitest --run` — 81 new tests, suite total 748 passing:

- `src/lib/themes/__tests__/contrast.test.ts` — WCAG math incl. impossible-pair termination
- `src/lib/themes/__tests__/registry.test.ts` — counts (25/20/20/15/10/10), unique ids, required
  concepts (Obsidian Indigo, Midnight Emerald, Deep Sapphire, Graphite, Cosmic Violet,
  Arctic Light), complete token sets, **AA for all 100 themes, AAA for high-contrast**
- `src/lib/themes/__tests__/customThemes.test.ts` — CRUD, caps, corrupt storage, import/export,
  sanitization (no eval, unknown keys stripped)
- `src/lib/themes/__tests__/appearancePrefs.test.ts` — favorites/recents + merge policy
- `src/lib/themes/__tests__/applyTheme.test.ts` — var application, mode attr, temporary preview,
  legacy normalization, restore/clear
- `src/contexts/__tests__/ThemeTemplateContext.test.tsx` — legacy compat, favorites/recents,
  custom lifecycle, preview commit/discard, restore default
- `src/pages/__tests__/AppearanceStudioPage.test.tsx` — rendering, search, composed filters,
  favorites, apply + active badge, recents, designer entry
- `src/components/themes/__tests__/ThemeDesigner.test.tsx` — editing + reset, temp apply,
  save, import (valid + invalid), mode flip
- `src/integrations/firebase/firestore.rules.test.ts` — `user_settings` owner-only cases
  (run when `FIRESTORE_EMULATOR_HOST` is set; skipped otherwise)

## Verification

- `npm run typecheck` — clean
- `npm run lint` — 0 errors (2 warnings for hook exports, same pattern as before this branch)
- `npm run test` — 748 passed, 0 failures
- `npm run build` — production build + prerender (incl. `/themes`)

## Screenshots

In `docs/appearance-studio/` (also shipped under `download/appearance-studio-screenshots/`):

1. `1-appearance-studio-landing.png` — studio landing page
2. `2-theme-collections.png` — Dark and Futuristic collection grid
3. `3-theme-preview-dialog.png` — full theme preview dialog
4. `4-custom-theme-designer.png` — custom theme editor
5. `5-designer-live-preview-editing.png` — live preview while editing + contrast report
6. `6-mobile-layout.png` — mobile layout

## Known limitations

- The app remains `forcedTheme="dark"` under next-themes; themes override all tokens inline, so
  a light theme re-skins everything, but the few `dark:` utility variants (22 usages) stay active.
  All audited instances are decorative and remain correct under light themes.
- Chart tokens are provided and applied; existing chart components that pass their own hex
  configs keep their colors until they adopt `hsl(var(--chart-N))`.
- Syntax-highlighter colors inside code blocks remain the oneDark palette; code block
  background/foreground follow the theme.
- Firestore sync is last-write-wins per field group (see merge policy above); simultaneous edits
  on two devices within the same second resolve by `updatedAt`.
