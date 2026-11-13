# ShadowTalk AI — Mobile Responsiveness Audit (Batch 0)

Branch: `feature/mobile-responsive-redesign` · Baseline: `main` @ `809792b2` · Date: 2026-11-13

## 1. What was inspected

- Git state: `main` @ `809792b2`, clean tree (skill-doc churn only). Feature branch created before any edit.
- Routing (`src/App.tsx`), design tokens (`tailwind.config.ts`, `src/index.css`), UI primitives (`src/components/ui/*`, 48 files), chatbot architecture (`ChatbotPage.tsx` + 12 child components), PWA config (`vite.config.ts`, `index.html`), test infra (`vitest.config.ts`, Puppeteer screenshot scripts).
- Two parallel deep-audit passes: (a) routes/shell/design-system, (b) `/chatbot` architecture.

## 2. Headline finding

**The app already has a real mobile foundation — the initiative is a targeted upgrade, not a rebuild.**

Already in place (do NOT recreate):
- Mobile chat nav drawer (`src/components/chat/ChatMobileNavDrawer.tsx`, vaul-style, `md:hidden`) wrapping the full sidebar.
- Dual chat header: mobile bar `flex md:hidden` + desktop `hidden md:flex` (`ChatHeader.tsx:113/171`).
- Keyboard handling: `MobileViewportFix.tsx` sets `--vvh`/`--kbd` on `<html>`, toggles `kbd-open`; composer dock lifts via `--kbd` (`index.css:1156–1165`).
- Safe-area utilities `.safe-top`/`.safe-bottom` (index.css:950–957), `.touch-target` 44px (991), iOS input-zoom prevention (`font-size:max(16px,1rem)`, 2270).
- `useIsMobile()` hook, `useIosKeyboard()` hook, shadcn `sheet`/`drawer` primitives, `xs:475px` breakpoint.
- PWA: manifest + service worker (vite-plugin-pwa), `viewport-fit=cover`, `maximum-scale=5`, iOS meta tags.
- Landing/Auth/Settings/Footer are largely responsive already.

## 3. Confirmed gaps (ranked)

| # | Gap | Location | Severity |
|---|-----|----------|----------|
| G1 | `ChatToolbar` is desktop-only (`hidden md:flex`): encryption toggle, Live Voice, Clear chat, Delete all unreachable on mobile | `ChatToolbar.tsx:65` | High |
| G2 | No pinch-zoom in diagrams; viewport `touch-none` (blocks native pinch), wheel-zoom gated on ctrl/meta only; zoom buttons 24px (< 44px target) | `ConceptualDiagramRenderer.tsx:524–660` | High |
| G3 | Viz expand dialog `max-h-[85vh] max-w-2xl` with fixed `height={420}` spec — not full-screen on mobile, small canvas | `VisualizationContainer.tsx:284,300` | High |
| G4 | Markdown tables render without horizontal-scroll wrapper + prose container `overflow-hidden` → clipped tables on phones | `MessageBubble.tsx:286,390–398` | High |
| G5 | Message actions (edit/regenerate) are hover-only (`opacity-0 group-hover:opacity-100`) — invisible on touch | `MessageBubble.tsx:530` | High |
| G6 | Floating voice FAB `fixed bottom-24 right-4` overlaps composer; stays when keyboard opens | `ChatbotPage.tsx:2692–2699` | Medium |
| G7 | Double keyboard compensation: dock gets BOTH `--kbd` CSS transform AND `useIosKeyboard` inline padding | `index.css:1156–1165` + `ChatbotPage.tsx:249–251,2631` | Medium |
| G8 | Mobile drawer lacks safe-area bottom padding / width cap | `ChatMobileNavDrawer.tsx:56` | Medium |
| G9 | `.shadowtalk-chat-shell` uses plain `100dvh`, ignores `--vvh` set by MobileViewportFix | `index.css:1006–1015` | Medium |
| G10 | AuthPage OAuth button grid has no small-screen scaling (cramped at 320px) | `AuthPage.tsx:561` | Medium |
| G11 | ProfilePage `ProfileNav` renders full vertical list on phones (no compact variant) | `ProfilePage.tsx:381` | Medium |
| G12 | AppearanceStudio control `min-w-[220px]` can overflow at 320–360px | `AppearanceStudioPage.tsx:310` | Low |
| G13 | IntelligenceCenter (routed) has desktop sidebar padding + hardcoded bg, inner grids unresponsive | `IntelligenceCenterPage.tsx:26–37` | Low |
| G14 | Footer hides social links on mobile (`hidden md:flex`) | `Footer.tsx:163` | Low |
| G15 | Chart renderer (`DataChartRenderer.tsx`) has no touch handling; recharts tooltips touch behavior unverified | `DataChartRenderer.tsx` | Low |

## 4. Existing responsive state by area (for ROUTE_COVERAGE baseline)

- **Public/landing** (`Index`, LandingNavigation): mobile-ready — drawer at ≤1023px, center links `hidden lg:flex`. Footer stacks; social block hidden on mobile (G14).
- **Auth**: split layout `flex-col lg:flex-row`, good; OAuth grid gap (G10).
- **Settings**: strong — mobile search + mobile section nav `md:hidden`; list not collapsed but scrollable.
- **Profile**: stacks `flex-col md:flex-row`; nav not compact (G11).
- **Appearance Studio**: responsive preview grid; minor overflow risk (G12).
- **Admin**: uses `Navigation.tsx` which is fully mobile-ready (hamburger + dropdown ≤1023px).
- **Docs/Help/policy**: text pages, inherit body overflow rules; tables in docs not audited (low risk).
- **Dead pages** (`AnalyticsPage`, `SessionsPage`, `MissionControlPage`, others): imported but **unrouted** — every legacy path redirects to `/chatbot`. Excluded from scope; documented in ROUTE_COVERAGE.

## 5. Test & screenshot infrastructure (existing)

- Vitest + happy-dom + Testing Library (90 suites, 785 tests) — no layout assertions; usable for class/behavior regression only.
- Puppeteer 25 installed (`puppeteer` dep) with prior ad-hoc capture scripts (`scripts/capture-*.cjs`) — reusable for real viewport screenshots at 320/390/768/1024/1440 and programmatic horizontal-overflow checks.
- No Playwright/e2e runner. iOS Safari: not testable in sandbox — documented as emulated-only.

## 6. Approach

1. Extend the existing system (`index.css` utilities, Tailwind `xs` breakpoint, `useIsMobile`) — no second design system.
2. Fix G1–G9 in the chatbot/visualization first (Phase 2), then page-level gaps (Phase 3), then a11y sweep (44px targets, reduced-motion, focus).
3. Verify with Puppeteer screenshots + overflow checks at all Phase-1 widths; honest reporting for what is emulated-only.
