# ShadowTalk AI — Free Access Transition Report

**Branch:** `feature/free-access-transition` (not merged to `main`)
**Date:** 2026-11-11
**Scope:** Complete removal of subscription-based access. ShadowTalk AI is now free to use — no subscription plans, no paid feature tiers, no feature locks, no forced payments.

> **Canonical statement (used verbatim across the product and public surfaces):**
> "ShadowTalk AI is free to use. Bring your own AI provider API key and choose your preferred models. Your provider may charge separately for API usage."

---

## 1. What was inspected first (Phase 0)

Before any modification, the full monetization dependency map was established:

| System | Findings |
|---|---|
| Plan resolution | `AuthProvider.checkSubscription()` already resolved everyone to `free`; `resolveUserPlan.ts` retained Lemon Squeezy product IDs and special-access e-mails |
| Feature gating | `useFeatureGating.ts` — FEATURES map with paid-only features (Video Studio, fine-tuning, white-label, API access…), upgrade toasts with $/mo pricing |
| Quotas | `useDailyLimits` (messages/uploads/searches/research), `useVoiceSessionLimits`, `useMissionQuota` (3–50 missions/mo by plan), `useOfflineCredits` (credit costs for cloud features), guest caps |
| Paywalls & nudges | `StrategyPaywall` ($1/day), `FeatureLockedOverlay`, `ChatUpgradeNudge`, `UpgradePrompt`, `UsageLimitBanner`, `useSubscriptionNudge` (blocking send at limit), `AdBanner` (in-house upgrade ad), `FreeTierLimitsStrip`, conversion psychology/copy libs |
| Payments | Lemon Squeezy checkout (`lemonCheckout`), WhatsApp checkout, manual payment + receipt upload flow (`submitManualPayment`, `paymentInvoice`, `paymentCredentials`), PKR plan pricing (`planPricing`), Stripe config (`stripe.ts`, dormant), admin `ManualPaymentsManager` |
| Monetization pages | `/pricing` (4-plan grid + JazzCash/Easypaisa banner), `/billing` (MonetizationPage: credits/affiliate/usage billing/revenue streams), `/founder-access` (full manual checkout flow), `/enterprise-license` (unrouted), Video Studio paywall |
| Public claims | `llms.txt`, `llms-full.txt`, `shadowtalk.json`, `facts.html`, AEO answer corpus (61 answers), Google SEO topic pages, viral comparison pages, wedge pages, how-to guides, case studies, product docs, Terms §6 ("Subscription and Payments"), Privacy Policy, canonical pitch strings ×4 pages, `index.html` JSON-LD/OG, FAQ/help surfaces |
| Marketing of paid plans | Referral "20–40% commission on referred paid plans", affiliate tiers, support-widget product context (listed $19/$49/$99 plans) |

---

## 2. Monetization dependencies changed (Phase 1–2)

### 2.1 Core gating — unlocked, architecture preserved

| File | Change |
|---|---|
| `src/hooks/useFeatureGating.ts` | New `FREE_ACCESS_FOR_EVERYONE` master flag: `canAccess`/`checkAccess` always grant; `getDailyMessageLimit()` → `Infinity`; `isProOrHigher/isPremiumOrHigher/isElite` always true; upgrade toast removed. FEATURES map + plan hierarchy kept for future optional monetization. Display stays honest (`userPlan: 'free'`). |
| `src/hooks/useDailyLimits.ts` | `getLimit` → `Infinity`, `canPerform` → `true`, `isUnlimited` → `true`. Usage tracking retained for Insights analytics. |
| `src/hooks/useVoiceSessionLimits.ts` | Voice sessions unlimited (tracking retained). |
| `src/hooks/useMissionQuota.ts` | `MISSION_LIMITS` all `Infinity`; `canCreateMission` always true; mission counting retained. |
| `src/hooks/useSubscriptionNudge.ts` | Rewritten: always returns the "none" state — no banner, no send-blocking. Hook shape preserved. |
| `src/hooks/useOfflineCredits.ts` | All `FEATURE_COSTS` → 0; `canAfford`/`consumeCredits` always succeed; ledger kept for analytics/future use. |
| `src/lib/videoGenerator/planAccess.ts` | `canAccessVideoStudio` → always true (plan list kept). |
| `src/hooks/useStrategyAccess.ts` | Already unlocked on main ("No paywall needed") — verified, unchanged. |

### 2.2 Paywall/upsell UI — removed from user surfaces

| Item | Change |
|---|---|
| `ChatbotPage` | Removed mounts + imports: `UsageLimitBanner`, `AdBanner`, `ChatUpgradeNudge`, `UpgradePrompt`, `useSubscriptionNudge`, send-blocking branch. Referral banner retained (growth, not a paywall). |
| `ChatHeader` | Upgrade buttons removed (`showUpgrade = false`); menu item relabelled "Billing — everything is free". |
| `SignInPrompt` | Rewritten: free-access copy, no "Pro subscription" upsell lines. |
| `VideoTutorials` | Tutorial lock + "Upgrade to Pro" CTA removed (all tutorials unlocked). |
| `EnterpriseSettingsPage` | Team invites no longer require Elite/Enterprise; upgrade card removed. |
| `CommandPalette` | "Upgrade Plan" → "Free Access". |
| `ChatEmptyState` | PKR plan quick-links → free-access links (/pricing, /settings). |
| `ReferralProgram` | Steps 3–4 no longer reference subscribing to paid plans. |
| `PricingSection` (landing) | Plan grid replaced with free-access fact cards; keeps `#pricing` anchor. |
| `FreeTierLimitsStrip`, `PricingTransparencyBlock` copy, `brand.ts`, `conversionCopy.ts`, `ethicalGrowth.ts` | All marketing constants now state free access + BYOK. |

### 2.3 Pages replaced (routes kept for existing links/SEO)

| Route | Before | Now |
|---|---|---|
| `/pricing` | 4-plan grid, JazzCash/Easypaisa banner, addons, compare strip | Free-access page: canonical statement, facts grid, links to /chatbot & /settings |
| `/billing` | Credits, affiliate, usage billing, revenue streams | "There is nothing to pay here" — no subscriptions/invoices; provider bills you |
| `/founder-access` | Pakistan manual checkout (JazzCash/Easypaisa/bank/USDT + receipt upload) | Free-access explainer (route kept) |
| `/enterprise-license` | Offline-AI license tiers ($29–$499/mo) | **Deleted** (was unrouted dead page) |

### 2.4 Dead code deleted (zero remaining references — verified by scripted import graph check)

- `src/components/payments/*` — all 13 checkout-flow UI components (`PaymentDetailsPanel`, `PaymentProofOptions`, `PaymentGuaranteeBar`, `PaymentFounderCard`, `PaymentStatusPanel`, `PaymentTrustFAQ`, `PaymentTrustSection`, `PaymentInvoiceSuccess`, `PaymentReceiptForm`, `QuickReceiptUpload`, `CheckoutConfirmation`, `InternationalCardButton`, plus `pricingCatalog.ts` consumed only by them).
- `src/components/monetization/*` — `ChatUpgradeNudge`, `UpgradePrompt`, `UsageLimitBanner`, `CreditSystem`, `AffiliateProgram`, `UsageBasedBilling`, `RevenueStreams`, `AdNetwork`, `ShadowWallet`, `SponsorNetwork`, `EnterpriseLicensePanel`.
- `src/components/pricing/*` — `PricingPlansGrid`, `PricingPlanCard`, `PricingAddonsSection`, `PricingCompareStrip`, `PricingTrustSection`, `PricingPageShell`.
- `src/components/chat/AdBanner.tsx` (in-house upgrade ad), `src/pages/EnterpriseLicensePage.tsx` (+ dead lazy import in `App.tsx`).

### 2.5 Payment/billing architecture intentionally preserved (dormant)

Per the task ("preserve architecture that could support optional monetization later" / "do not blindly delete payment code"), the following were **kept** and marked dormant:

- `src/lib/stripe.ts` (plan/price IDs + PLAN_DETAILS copy — header notes dormancy)
- `src/lib/payments/*` libs (`submitManualPayment`, `paymentInvoice`, `paymentCredentials`, `planPricing`, `lemonCheckout`, `whatsappCheckout` + its test, `paymentTrustCopy`)
- `src/components/admin/ManualPaymentsManager.tsx` (admin tooling; harmless)
- `conversionPsychology.ts` / `conversionCopy.ts` helpers (dormant, header notes)
- `resolveUserPlan.ts` + its test (plan-resolution logic for future use; no longer called by `AuthProvider`)
- FEATURES map, `MISSION_LIMITS`, `DAILY_LIMITS`, `GUEST_LIMITS` structures

### 2.6 Referral/affiliate status

Referral & affiliate UI remains (growth feature) but no longer references paid plans. **Monetary referral commissions are effectively dormant** while no plans exist; copy now describes the free workspace. Listed here as a changed monetization dependency.

---

## 3. Public messaging updated (Phase 3)

Every public surface now carries the canonical free-access + BYOK + provider-costs statement:

- **Canonical pitch** in `aiPublicKnowledge.ts` and `public/shadowtalk.json` (the machine-readable AEO corpus).
- **`public/llms.txt` / `public/llms-full.txt`** — access model, navigation labels ("Account & billing" section), philosophy section rewritten; pricing table replaced with free access + BYOK table.
- **`public/facts.html`** — description, pricing table, differentiator copy.
- **AEO answer corpus** (`answerCorpus.ts` → regenerated `aeo-answers.{html,json}`, `aeo.txt`) — all pricing answers ($0, no tiers), offline answer no longer "Elite-oriented".
- **Google SEO topic pages, viral comparison pages, wedge pages, how-to guides, case studies** (sources patched → regenerated `public/learn/*`, `public/vs/*`, `public/*.html`, `feed.xml`, `discover.html`).
- **`index.html`** — meta description + JSON-LD SoftwareApplication description (Offer price stays "0" — now unambiguous), OG/Twitter descriptions.
- **`src/lib/seo.ts`** — `PAGE_SEO.pricing/billing/founderAccess` titles+descriptions, CHATBOT_FAQ and site FAQ pricing answers.
- **Product docs** (`productDocs.ts` → DocsPage) — quotas section, plan cards replaced with a single "Free" tier, FAQ.
- **Legal**: Terms §6 rewritten as "Free Access, BYOK and Provider Costs" (no payments collected; provider disputes are with the provider); Privacy Policy payment-information clause updated.
- **Support widget** product context corrected (previously advertised $19/$49/$99 plans).
- **Canonical pitch strings** on PromptPrivacyChecker/Prompts/SharedMission/Vs pages; `FactsPage` renders the new `pricing` block.
- **Historical docs preserved with SUPERSEDED banner**: `public/downloads/ShadowTalk-Founder-Strategy-2026.{md,html}` (pre-transition monetization strategy, incl. payment addresses) clearly marked as historical record.
- **`public/robots.txt`** — fixed GPTBot `Allow: /llms.txt` path typo.

### Preserved (legitimate references, intentionally untouched)

- Competitor pricing mentions (ChatGPT Plus $20/Pro $200, Microsoft 365, etc.) in comparison pages.
- "Rate limit" strings (infrastructure-level rate limiting, i18n labels).
- BYOK flow, provider/model selection, API-key encryption (`secureStore`), Firebase auth/ownership, Firestore security rules, abuse protections — all untouched.

---

## 4. SEO/GEO/AEO consistency (Phase 4)

- `/pricing` URL retained (no redirect churn); title/description now "Free Access — ShadowTalk AI…".
- Sitemap entries unchanged in coverage; `public/sitemap.xml` + `public/aeo-sitemap.xml` regenerated with today's date.
- `robots.txt` allows all major AI crawlers; directive typo fixed.
- Structured data: `SoftwareApplication` Offer price "0" retained; descriptions consistent with on-page copy.
- llms.txt / llms-full.txt / shadowtalk.json / aeo-answers.* / google-aeo.txt all state the same access model — verified by scan for stale claims (zero hits outside preserved competitor references and clearly-marked historical docs).
- No misleading "unlimited free AI" claims: provider-side costs and limits are stated everywhere.

---

## 5. Remaining infrastructure costs (unchanged, disclosed)

ShadowTalk's own infrastructure still costs money to run; free access does not change this:

- **Hosting/CDN** (Netlify/Vercel config present) for the web app and static AEO assets.
- **Firebase** project: auth, Firestore, storage, cloud function egress (the "chat" cloud function with OpenRouter key pool remains deployed infrastructure; it is **not** shared-inference-as-a-product — BYOK remains the documented path, and abuse/rate protections stay in place).
- **Desktop download hosting** for Electron/Tauri artifacts.
- **Third-party AI costs** are now always the user's own (BYOK) — ShadowTalk does not resell inference.

---

## 6. Testing & regression protection (Phase 5)

| Gate | Result |
|---|---|
| `npx tsc -b` (typecheck) | **PASS** (0 errors) |
| `npx vitest --run` (62 test files) | **59 files pass** (~170 tests). 3 pre-existing failures on `main`, unrelated to this branch (verified via `git stash` re-run on pristine main): `persistentAuth` (auth-key assertion), `shadowHealEngine` (expects deleted `backend/` dir), plus one environment-level module-resolution hiccup fixed by reinstalling `framer-motion`/`@huggingface/transformers` (sandbox install artifact). |
| `npx eslint src --quiet` | 4 pre-existing errors in files untouched by this branch (`useE2EE.ts` ×2, `integrations/local/client.ts`, `lib/backend-types.ts`). Errors introduced by the transition: **0**. |
| `npm run build` (prebuild `sync:seo` + `vite build`) | **PASS** (PWA generated, 449 precached entries). Note: requires `NODE_OPTIONS=--max-old-space-size=3200` on 4 GB sandboxes due to app size. |
| Regenerated-asset verification | `public/` assets regenerated from patched sources; strict grep for stale plan/price claims returns only competitor references + marked historical docs. |
| Wiring tests | `wiringVerification.test.ts` updated to assert the NEW wiring (monetization components must stay unwired). `planAccess.test.ts` updated (free access expected). |

Functional regression coverage (per test suite): auth/session (`persistentAuth`, `useUsageTracking`), offline/desktop stacks (15 files), autonomy stack, SEO asset sync (AEO/founder/viral/Google), payment libs (dormant but tested), documents/presentations pipelines.

---

## 7. Known limitations

1. **Pre-existing test failures on `main`** (not caused by this branch): `persistentAuth.test.ts` and `shadowHealEngine.test.ts`. The latter expects `backend/functions/…` which was deleted in the last `main` commit ("Removed old backend traces").
2. **Firestore data**: `subscribers`, `daily_usage`, `missions`, `strategy_usage`, `shadow_credits` tables remain in place. No schema migration was needed — nothing reads plan state for gating anymore. A future cleanup can drop stale columns safely.
3. **Referral commissions** are dormant (nothing is sold); UI no longer promises payouts tied to plans.
4. **`/lifetime-deal` redirects to `/pricing`** (kept, harmless — now lands on the free-access page).
5. **Admin panel** still shows subscriber stat cards (they will read zero); left in place as admin tooling.
6. **Historical strategy download** retains pre-transition pricing content, behind a prominent SUPERSEDED banner, for record integrity.
7. **Guest caps** (`GUEST_LIMITS`: 10 chats / 3 images / 2 research per day for signed-out visitors) were deliberately **kept** as anti-abuse protection, consistent with the task requirement to preserve rate limiting and abuse protection. Signed-in users have no product-imposed caps.
8. **Dormant payment libs** remain in `src/lib/payments/*` and `src/lib/stripe.ts` by design (future optional monetization); they are inert and excluded from UI.
9. Sandbox note: production build needs `NODE_OPTIONS=--max-old-space-size=3200` in memory-constrained environments.

---

## 8. What did NOT change (explicit task invariants)

- Firebase authentication, session persistence, anonymous sessions, sign-out.
- User ownership/authorization boundaries and Firestore security rules.
- BYOK requirement for AI usage; provider/model selection; no shared-inference introduction; no silent provider fallback.
- API-key encryption & secure storage; Stealth Vault; E2EE chat.
- Rate limiting and abuse protection (backend + guest caps).
- All non-monetization features (chat, missions, research, IDE, video studio, docs, themes, notifications, desktop).

---

## 9. Integration update (2026-11-11): merged with the project's live main

After the original 8 commits were completed on a snapshot of the codebase, the
project's actual working repository was identified as
`shadowtalk424/ShadowTalk-AI` (private; the earlier `origin` pointed at a stale
public mirror). Its `main` was **568 commits ahead** of the transition base and
still carried the full pre-transition monetization surface. The branch was
therefore integrated with that main as merge commit `bec20751`:

- **Base merged:** `shadowtalk424/main` @ `28f77d4` (research-visualization
  batches, ProofLoop, Firestore persistence-incident fixes, E2EE cleanup,
  offline AI, repository restructuring).
- **Resolution strategy:** upstream's current product code was kept; the
  free-access semantics were re-applied on top (28 upstream deletions accepted,
  including the old quota-hook system and MonetizationPage; 41 conflict files
  resolved semantically).
- **Result:** one branch that carries both the upstream evolution and the
  complete free-access transition, mergeable into `main` without reverting
  upstream work.

### 9.1 Upstream systems reviewed during integration

| System | Decision |
|---|---|
| `useFeatureGating` plan logic | Our `FREE_ACCESS_FOR_EVERYONE` master unlock survived the merge and still governs every `canAccess`/quota call |
| `AIKeyContext` / `useDailyUsage` (new) | Instant Start ("NON_TECH") users share a platform key with a 100-message/day cap; BYOK ("TECH") users are unmetered. **Kept** — this is infrastructure abuse protection for the shared-key fallback, not a paid tier; no payment or upsell exists anywhere in the system (verified). The 402 error path in ChatbotPage now directs users to the free BYOK setup instead of an "upgrade" |
| Dormant payment libs (`src/lib/payments/*`, `stripe.ts`) | Preserved by design (future optional monetization), as in the original transition |
| Upstream-deleted monetization files (28) | Accepted: old quota hooks, `planAccess`, `MonetizationPage`, marketing corpora, historical strategy downloads |
| Legacy bugs absorbed by upstream history | Repaired: `BYOKnth`/`unlockso`/truncation remnants from an earlier buggy patch pass across 16 files (answerCorpus, comparisonPages, mcp/data, public AEO assets, learn/vs pages, llms.txt, stripe comment) |

### 9.2 Re-verification after the merge

| Gate | Result |
|---|---|
| `tsc --noEmit` | **PASS** (0 errors) |
| `eslint src --quiet` | **PASS** (0 errors) |
| `vitest --run` (79 test files) | **644 passed**, 2 failed, ~29 skipped — the 2 failures are `VisualizationCard` renderer tests whose code is **byte-identical to upstream main** (pre-existing, not caused by this branch). The two failures noted in §6 (`persistentAuth`, `shadowHealEngine`) no longer exist on the integrated tree |
| `vite build` (PWA) | **PASS** (263 precached entries) |
| Stale-claims audit | Clean: no paid-plan/checkout/upsell claims outside dormant payment libs, admin tooling, competitor comparisons, and marked historical narrative |

### 9.3 Known limitations (superseding §7 where different)

1. The `wiringVerification` / `planAccess` tests from §6 were removed upstream
   along with the systems they pinned; the free-access wiring is now pinned by
   the master unlock, the no-op nudge hook, and the audit in §9.2.
2. Guest caps (`GUEST_LIMITS`) no longer exist as such; the equivalent
   protection for signed-out/keyless visitors is the Instant Start daily cap
   plus backend rate limiting (kept intentionally).
3. `subscribers`-era Firestore data remains untouched (no schema migration
   needed — nothing reads plan state for gating).
4. Admin subscriber stat cards remain as admin tooling (they read zero).
5. `/lifetime-deal` still redirects to `/pricing` (now the free-access page).
