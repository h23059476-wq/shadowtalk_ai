# ShadowTalk AI — Route Coverage (Mobile Responsiveness Initiative)

Branch: `feature/mobile-responsive-redesign` · Statuses reflect the **post-implementation** state unless marked otherwise.

Legend: ✅ Fully responsive & tested · 🟡 Responsive, emulated checks only · 🟠 Partially responsive · ⚪ Not yet addressed (with reason)

## Routed pages (src/App.tsx)

| Route | Page component | Mobile status | Notes |
|---|---|---|---|
| `/` | RootRoute → Index | 🟡 | Landing, mobile drawer nav ≤1023px; redirect logic verified by tests |
| `/home` | Index (landing) | 🟡 | LandingNavigation drawer + stacked sections |
| `/chatbot` | ChatbotPage | ✅ | Primary workspace — see Phase 2 in implementation report |
| `/auth` | AuthPage | 🟡 | Split layout stacks; OAuth grid scaled for 320px |
| `/auth/action` | AuthActionPage | 🟡 | Simple card form |
| `/settings` | SettingsPage | 🟡 | Already had mobile nav + search; verified |
| `/profile` | ProfilePage | 🟡 | Nav made compact on mobile (horizontal scroll tabs) |
| `/themes` | AppearanceStudioPage | 🟡 | Responsive preview grid; 320px overflow risk fixed |
| `/shadow-twin` | ShadowTwinSettingsPage | 🟡 | Verified stacking, no fixed widths found |
| `/admin` | AdminPage | 🟡 | Uses Navigation.tsx (mobile hamburger ≤1023px) |
| `/admin/intelligence` | IntelligenceCenterPage | 🟡 | Padding/grid made responsive (was desktop-only) |
| `/docs`, `/help` | DocsPage | 🟡 | Text-first page; overflow guarded by global rules |
| `/s/:slug` | SharedAnswerPage | 🟡 | Verified |
| `/t/:username` | PublicShadowTwinChat | 🟡 | Verified |
| `/proof/:proofId` | PublicProofCardPage | 🟡 | Verified |
| `/mission/:id` | MissionPublicPage | 🟡 | Verified |
| `/pricing`, `/about`, `/founder`, `/zain-ahmed`, `/blog`, `/faq`, `/benchmarks`, `/contact`, `/downloads`, `/ide`, `/proofloop`, `/status`, `/trust` (security), `/changelog`, `/enterprise`, `/developers`, `/referral`, `/templates` | various | 🟡 | Public marketing/info pages — mostly text/card layouts; grid stacking verified via overflow sweep |
| `/terms`, `/privacy`, `/gdpr`, `/cookies` | policy pages | 🟡 | Long-text pages, shared typography |
| `*` | NotFound | 🟡 | Simple centered card |

## Redirected legacy paths (no independent UI)

`/analytics`, `/sessions`, `/missioncontrol`, `/computer`, `/personal-llm`, `/research`, `/workspace` and ~15 more legacy aliases **redirect to `/chatbot`** (App.tsx:210–220). `AnalyticsPage`, `SessionsPage`, `MissionControlPage` components are imported but unrouted (dead code). Per initiative scope ("inspect before modifying"), no responsive work was spent on dead pages; they are excluded and tracked here so future re-routing re-audits them. ⚪ (intentionally out of scope)

## Dev-only

| Route | Page | Status |
|---|---|---|
| `/dev/viz-demo` | VizDemoPage | 🟡 dev-only, prod-redirects to /chatbot — used for visualization mobile verification |

## Shell-level coverage (applies to every route)

- Global `overflow-x: hidden` + image/media max-width guards (index.css).
- `MobileViewportFix` — `--vvh`/`--kbd` keyboard tracking, `kbd-open` class.
- Safe-area utilities + iOS input zoom prevention.
- PWA manifest + service worker with `viewport-fit=cover`.
- `Navigation.tsx` (admin/policy pages) — mobile hamburger ≤1023px.

## Verification method

Emulated viewport matrix: 320 / 360 / 375 / 390 / 414 / 430 / 768 / 820 / 1024 / 1280 / 1440 px (Puppeteer, desktop Chrome engine) + programmatic horizontal-overflow checks per route. Real-device testing (Android Chrome, iOS Safari) was **not** possible in this environment and is listed as a remaining limitation — 🟡 ratings are emulation-based, ✅ for /chatbot reflects emulation + component tests.
