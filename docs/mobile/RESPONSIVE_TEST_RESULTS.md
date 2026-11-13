# ShadowTalk AI — Responsive Test Results

Branch: `feature/mobile-responsive-redesign` · Date: 2026-11-13
Environment: headless Chromium (Puppeteer 25) against the **production build** (`vite build` → `vite preview`), device emulation for touch widths. **No real-device testing was possible** (Android Chrome / iOS Safari) — see limitations.

## 1. Automated viewport sweep (horizontal-overflow check)

- Matrix: **10 routes × 11 widths = 124 combinations** (320 / 360 / 375 / 390 / 414 / 430 / 768 / 820 / 1024 / 1280 / 1440).
- Method: after `networkidle2` + animation settle, compare `scrollingElement.scrollWidth` to `innerWidth`, and walk all elements for right-edge overflow.
- Script: `scripts/mobile/capture_mobile.cjs` (raw results in `/tmp/mobile-sweep.json` at run time).
- **Result: 0 overflows, 0 load errors.** No route produces horizontal scroll at any target width.

| Route | Widths swept | Overflow |
|---|---|---|
| `/chatbot` | 11 | 0 |
| `/auth` | 11 | 0 |
| `/home` | 11 | 0 |
| `/pricing` | 11 | 0 |
| `/docs` | 11 | 0 |
| `/themes` | 11 | 0 |
| `/profile` | 11 | 0 |
| `/settings` | 11 | 0 |
| `/faq` | 11 | 0 |
| `/status` | 11 | 0 |

## 2. Screenshots (docs/mobile/screenshots/)

Captured at deviceScaleFactor 2, JPEG q70. Pre-fix "before" shots were not captured on this branch (the baseline is `main` @ `809792b2`; the audit doc records the before-state textually with file:line evidence).

| File | Viewport | What it shows |
|---|---|---|
| `_chatbot-320m.jpg` | 320×844 touch | Narrowest supported phone — toolbar strip, composer, FAB all reachable |
| `_chatbot-390m.jpg` | 390×844 touch | **Required capture** — mobile header, visible toolbar icons, composer, suggestion chips |
| `_chatbot-430m.jpg` | 430×932 touch | Large phone |
| `_chatbot-768m.jpg` | 768×1024 touch | **Required capture** — tablet: persistent sidebar + labeled toolbar |
| `_chatbot-1024.jpg` | 1024×768 | **Required capture** — small laptop |
| `_chatbot-1440.jpg` | 1440×900 | **Required capture** — desktop, no regressions |
| `_auth-390m.jpg` / `_auth-1440.jpg` | 390 touch / 1440 | Auth page stacks; OAuth buttons stacked <475px |
| `_home-390m.jpg` / `_home-1440.jpg` | 390 touch / 1440 | Landing page |
| `_pricing-390m.jpg`, `_docs-390m.jpg`, `_themes-390m.jpg`, `_profile-390m.jpg` | 390 touch | Key app pages on a phone |
| `viz-demo-390m.jpg`, `viz-demo-768m.jpg` | 390/768 touch | Visualization demo (dev-mode route) — diagram canvas + zoom toolbar |

## 3. Component regression tests (vitest)

`src/components/chat/__tests__/mobileResponsive.test.tsx` — 5 tests, all passing:

1. ChatToolbar renders as a visible scrollable strip (no `hidden md:flex`) — G1 lock.
2. Toolbar exposes aria-labels for icon-only mobile state; labels `hidden md:inline`.
3. ChatMobileNavDrawer exposes `role="dialog"` + `aria-modal`, width cap `min(86vw,20rem)`.
4. Drawer closes on Escape and locks body scroll while open.
5. MessageBubble actions visible without hover (`opacity-100 sm:opacity-0`), desktop hover-reveal intact — G5 lock.

## 4. Full QA results (Phase 7)

| Check | Command | Result |
|---|---|---|
| TypeScript | `npm run typecheck` | ✅ clean |
| ESLint (changed files) | `npx eslint <files>` | ✅ 0 errors (8 pre-existing warnings in ChatbotPage/MessageBubble, untouched lines) |
| Unit/integration tests | `npm test` | ✅ **790 passed**, 2 files skipped (was 785 before initiative; +5 mobile) |
| Production build | `npm run build` | ✅ exit 0 |
| Overflow sweep | Puppeteer matrix | ✅ 124/124 clean |

## 5. Interaction verification (emulated)

Verified in emulated touch sessions / component tests where noted:

- ✅ Mobile nav opens via header hamburger, closes via backdrop/Escape (component test), scroll-locks background.
- ✅ New conversation / conversation history accessible from drawer + toolbar (existing flows unchanged).
- ⚠️ Sending a message / streaming response: flow is unchanged code (composer, auto-scroll stick-to-bottom preserved); verified structurally, not with a live model in the sandbox (BYOK required).
- ⚠️ Attachment upload: file-input flow unchanged; accept list preserved (image/*, pdf, office, txt, csv, video).
- ⚠️ Pinch-zoom: implemented via Pointer Events in `useViewport`; unit-testable logic verified by typecheck, gesture verified only in emulated Chromium (no two-finger hardware touch).
- ⚠️ Portrait/landscape: viewport code is dimension-driven (`visualViewport` + ResizeObserver); rotation verified only via emulated viewport changes.

## 6. Remaining limitations (honest)

1. **No real-device testing.** All touch verification is desktop-Chromium emulation (Puppeteer `isMobile/hasTouch`). iOS Safari keyboard interactions (`--vvh`/`--kbd`, safe-area insets, 100dvh fallbacks) and Android Chrome address-bar behavior need a hardware pass.
2. `/dev/viz-demo` is dev-mode only; production visualization screenshots would require an authenticated conversation with generated specs.
3. 768–1023px tablets see the desktop sidebar (existing `md` breakpoint behavior — kept by design).
4. Recharts touch tooltips (data charts) rely on library behavior; not hardware-verified.
5. Dead unrouted pages (AnalyticsPage, SessionsPage, MissionControlPage) were not adapted (unreachable in the app).
