# Reliability & Growth-Readiness Pass — 2026-11-14

Scope: reliability-and-growth-readiness review of `main` as checked out from GitHub (not local working copies). Reported findings came from a separate local checkout; each was independently verified here before acting.

## 1. Environment (as inspected)

| Item | Value |
| --- | --- |
| Default branch | `main` @ `df91d1c0` (Merge PR #7, docs/architecture-update) |
| Working tree | clean at checkout |
| Package manager | **npm** (`npm ci` + `package-lock.json` in CI). `bun.lock` is present but vestigial — CI and scripts use npm. |
| CI (`.github/workflows/ci.yml`) | `lint-and-build`: npm ci → typecheck → lint → build → functions build. `test`: npm ci → Firestore emulator → `npm test`. `security`: npm audit (continue-on-error). |
| Test runner | Vitest (`vitest.config.ts`: happy-dom, setup `src/test/setup.ts`, include `src/**/*.{test,spec}.*`) |

## 2. Reported failures vs. this revision — none reproduced

| Reported (other checkout) | Reproduced here? | Evidence |
| --- | --- | --- |
| `npm run typecheck` fails: `fake-indexeddb` unresolved in `src/lib/rag/__tests__/pipeline.test.ts` | **No** | `fake-indexeddb@^6.2.8` is declared in `package.json` devDependencies (line 106) and installed by `npm ci`; `node -e "require.resolve('fake-indexeddb/auto')"` resolves; `npm run typecheck` exits 0. |
| `companion.integration.test.ts` SyntaxError: Invalid or unexpected token | **No** | File is valid TS (14,661 bytes); focused run: 21/21 tests pass in 285 ms. |
| `AppearanceStudioPage.test.tsx` + `vizDemoPage.test.tsx` timeouts (5 s) | **No** | Both files pass in the focused run (no retries, no timeouts). |
| `chatReliability.contract.test.ts` source-text assertion mismatch | **No** | 7/7 tests pass. |
| Suite totals reported: 98 files passed / 5 failed; 902 tests / 7 failed | **No** | Full suite below. |

**Conclusion: the reported failures were artifacts of the other (stale/local) checkout, not of this GitHub revision.** No code changes were made for findings A–D; changing dependencies or tests to "fix" non-reproducing failures would have been speculative.

## 3. Commands and outcomes (exact)

| Command | Result |
| --- | --- |
| `npm ci --no-audit --no-fund` | success (install-script warnings only, pre-existing) |
| `npm run typecheck` | **exit 0**, no output |
| `npx vitest --run --reporter=dot` | **103 test files passed, 2 skipped (105); 948 tests passed, 29 skipped (977); 0 failed** (~72 s) |
| `npx vitest --run <5 reported files>` | **5 files passed, 57/57 tests pass** (companion 21, rag pipeline 18, chatReliability 7, plus AppearanceStudio/vizDemo) |
| `npm run lint` | exit 0 (see PR body for post-change run) |
| `npm run build` | success incl. prerender (see PR body for post-change run) |

## 4. Route audit (finding E) — `src/App.tsx` @ this revision

**Routes that redirect to `/chatbot` (29):** `/shadow-memory`, `/private-ai`, `/founder-access`, `/knowledge-graph`, `/agentic-ai-workspace`, `/missioncontrol`, `/workspace`, `/marketplace`, `/analytics`, `/computer`, `/personal-llm`, `/templates`, `/research`, `/developers`, `/enterprise`, `/referral`, `/sessions`, `/ai-strategy-consultant`, `/anonymous-ai`, `/answers`, `/deep-research`, `/discover`, `/partnerships`, `/privacy-score`, `/security-audit`, `/studio`, `/transparency`, `/trust`, `/video-studio` (other redirects: `/` → `/home`; several legacy aliases → `/about`, `/proofloop`, `/docs`, `/home`).

**Dead page components (lazy-imported in `App.tsx` but never rendered — 21):** AuthDesignGalleryPage, AuthDesignPreviewPage, PrivateAiHubPage, FatimaPage, ShadowMemoryPage, KnowledgeGraphPage, AgenticAIWorkspacePage, FounderAccessPage, HelpCenterPage, CaseStudiesPage, ComingSoonPage, AnalyticsPage, ComputerPage, MissionControlPage, PersonalLlmPage, TemplatesPage, ResearchPage, DevelopersPage, EnterprisePage, ReferralPage, SessionsPage. (`lazy()` chunks are never fetched, so there is no runtime cost — this is maintenance noise, listed for a future cleanup PR.)

**Features linked in the UI but without a page implementation in this repo:** the marketing navigation (`LandingNavigation.tsx`, desktop + mobile drawer) and `LandingSectionHub.tsx` link "Deep Research Engine" → `/deep-research`, "Agentic Workspace" → `/workspace`, and "Private AI" → `/private-ai`; all three silently redirect to the generic chat. External deployments may implement these elsewhere (not inferred); **in this repository they are redirects.** Recommendation: either ship these pages or re-point the nav links to an implemented surface (e.g., `/chatbot?mode=deep-research` if such a mode exists) so the click target matches the promise.

**Claimed integrations that ARE implemented here:** BYOK multi-model (`src/lib/byok.ts`), local vector RAG (`src/lib/rag/` incl. WebGPU embeddings in `embeddings.ts`), MCP bridge (`src/lib/mcpBridge/`), Proof Loop pages (`ProofLoopPage`, `PublicProofCardPage`), Shadow Twin (`ShadowTwinSettingsPage`, `PublicShadowTwinChat`), Appearance Studio (`/themes`), live voice mode (`LiveVoiceMode` + `LiveAvatar`, merged via PR #6).

## 5. Landing-to-first-use friction (finding F)

Verified in code (no analytics data assumed):

1. **Hero funnel is healthy.** `HeroSection.tsx` CTAs are explicit and instrumented: "Try Demo — No Signup" → `/chatbot?demo=true` (`cta_name: try_demo_no_signup`), "Connect Your API Key" → `/chatbot?byok=true&view=settings`. `ChatbotPage.tsx:2921` consumes `?demo=true` (`isDemo` prop) — the CTA promise is honored. No copy changes made: evidence for better marketing wording does not exist in-repo, and inventing it was out of scope.
2. **Stale comments fixed (this PR).** `RootRoute.tsx` claimed "anyone who has chatted before go straight to `/chatbot`" and an inline comment claimed "Anonymous users go straight to chat" — both false: `shouldSkipLandingForReturnVisitor()` (`src/lib/growth/firstVisit.ts`) always returns `false`, so **every** anonymous visitor sees the landing. Comments now match behavior. The function name is legacy but its docstring is accurate; no behavior change was made (disabling/enabling the skip is a product decision, not a reliability fix).
3. **Nav → dead-redirect click-through** (from §4): the strongest remaining friction. Clicking a named feature ("Deep Research Engine") lands on a generic chat with no context. Recommendation only — needs a product decision.

## 6. Explicitly not done (with reasons)

- **A–D code fixes:** nothing to fix at this revision (see §2). The dependency is already correctly declared; the tests already pass.
- **No dependency changes** beyond what `package-lock.json` already pins; no production files, secrets, deploy or hosting settings touched.
- **No marketing copy edits** — in-repo evidence is insufficient (§5.1).
- **No removal of the 21 dead page imports** — safe cleanup but unrelated refactoring beyond this pass's scope; documented instead.
