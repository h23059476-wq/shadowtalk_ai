# ShadowTalk — Final Engineering Completion Report (Phase 2)

**Date:** 2026-11-06 · **Branch:** `main` · **Local HEAD:** `371c70f5`
**Remote origin/main:** `b3c747db` (11 local commits ahead — NOT pushed, awaiting Zain's authorization)

---

## 1. Implementation report

### Batch 3 (commit `453f508f`) — Firestore security, account isolation, auth lifecycle
- Profile field whitelist (create `hasOnly` + update `diff().affectedKeys()`), privilege-escalation prevention; analytics `event_name`/`session_id` snake_case fix; removed phantom nested rules block. 18 emulator rules tests.
- `e2eeStorage.ts`: UID-namespaced vault keys + passphrase-verified legacy recovery primitives. `signOutCleanup.ts`: ephemeral-only cleanup (preserves BYOK, memory, recovery material). `useE2EE.ts` rewritten for UID scoping.
- Auth: `lastSyncedUid` ref dedup replaced the dead `INITIAL_SESSION` guard; sign-out captures uid before Firebase sign-out and runs `clearUserLocalData` first.

### Batch 4 (folded into `453f508f`) — provider-source labeling, prefer-local wiring, engine state machine
- `CloudChatResult { source, modelUsed, provider }` captured from `X-Provider`/`X-Model` response headers on all return paths; MessageBubble renders honest per-message source labels ("via \<Provider\> (your key)" / "via ShadowTalk shared" / "via Local (\<model\>)").
- `LocalInferenceEngine` state machine: `idle|downloading|loading|ready|generating|error|offline` with subscribe/unsubscribe.
- `getPreferLocal/setPreferLocal` (UID-scoped localStorage) + "Prefer on-device AI" switch in ChatAIPreferencesCard; `AIProviderRouter.getBestProvider()` honors it.

### Batch 5 (commit `746aba20`) — PWA manifest, asset & installation reliability
- Removed 5 dead asset references from index.html; aligned `theme_color`; stable install id; maskable icons; honest standalone-detection in DownloadPage; fixed `appinstalled` listener leak; 14 PWA reliability tests.

### Final completion phase (this document, commits `d3438a44 → 371c70f5`)

| Commit | Workstream | Summary |
|---|---|---|
| `d3438a44` | A — Firestore rules | Enabled 7 client-verified collections: `strategy_reports`, `search_history`, `shadow_credits`, `credit_transactions` (per-user owner CRUD), `docs_pages` + `status_monitors` (public read / admin write), `daily_usage` (admin read, client write denied). 21 emulator tests. |
| `48e72026` | B — Offline AI + prefer-local | `/settings?section=offline` was implemented but unreachable (missing nav entry) — now reachable, so the local engine can actually be installed. ChatbotPage honors prefer-local in the main path: local only when engine is `ready`, local failure surfaced (no silent cloud retry), online-but-not-loaded falls through with a one-time explicit notice, offline-without-engine gives actionable guidance. web-llm is dynamically imported. Offline banner no longer claims on-device AI unless the engine is really ready. Removed orphaned `sw-downloader.js` (its byte-handling was a stub — downloaded bytes were discarded). |
| `2378dd0f` | C — E2EE | Removed the dead session-key persistence no-op (exportKey on a non-extractable key always threw; restore path could never fire) — keys are explicitly memory-only. Added consent-gated legacy vault recovery: when an account has no vault but device-global legacy material exists, the hook defers salt creation and `LegacyVaultRecoveryDialog` offers passphrase-verified restore (verify → consent → commit; never overwrites, never deletes legacy) or start-fresh. Stale private-mode flag is cleared on mount (flag lifetime = key lifetime). |
| `440d144a` | D — Auth | Remote session revocation (SIGNED_OUT without explicit sign-out; `revoked_at` heartbeat) now runs the same ephemeral cleanup as interactive sign-out, with double-clean protection. |
| `dd797e2a` | E — Memory isolation | ShadowMemory activity journal is now account-scoped: new records stamped with uid; reads/stats/exports filter by scope; `clearAll` only clears in-scope records (previously wiped the whole device store); legacy uid-less records preserved, visible only signed-out. |
| `aca87566` | F — Share-answer | Fixed the dead viral loop: publish invoked a nonexistent `share-answer` function and the /s/:slug read used an always-failing Postgres RPC. Both now use `shared_answers` directly (rules were designed for it): slug generation + collision check, owner-stamped insert, public read by slug, fake view-increment removed. |
| `de3f1145` | G — Cloud Functions | Implemented `send-contact-email`: validation mirroring intake rules, persists to `contact_messages` (admin-readable), anonymous-friendly with best-effort identity attachment. functions/ now typechecks clean against real deps. |
| `70026008` | ProofLoop | `docs/PROOFLOOP_SPEC.md` — full implementation spec grounded in existing systems (deliverable types, document pipeline, strategy_reports, agent_tasks, workspaces, memory). Zero prior references found in code/docs/history → no placeholder implemented; five exact product decisions (D1–D5) documented for Zain. |
| `371c70f5` | Tests | Private-mode security tests updated to the corrected flag semantics. |

## 2. Architecture summary (post-completion)

- **Auth:** Firebase Auth adapter (emits only SIGNED_IN/SIGNED_OUT) → AuthProvider with uid-dedup hydration; interactive sign-out AND remote revocation both run `clearUserLocalData(uid)` (ephemeral E2EE session keys + private-mode flags only). BYOK, memories, salts, fingerprints, prefer-local survive sign-out.
- **Firestore:** explicit rules; per-user catch-all whitelist now covers 34 collections; privileged collections (profiles/subscribers/roles/daily_usage) locked down; public CMS read-only; intake collections create-only. Emulator-verified (21 tests).
- **E2EE:** PBKDF2(100k)+AES-256-GCM; UID-namespaced salt/fingerprint (localStorage) + memory-only keys; per-engagement session encryption; passphrase-verified, consent-gated legacy recovery; private mode strictly per-session with honest UI state.
- **AI routing:** main chat = `streamCloudChat` (byok → user provider; shared → Firebase `chat` function) with optional local branch when prefer-local + engine ready; secondary paths use `AIProviderRouter`. Every message carries source provenance. No silent fallback anywhere.
- **Offline/PWA:** vite-plugin-pwa autoUpdate SW with navigateFallback; local engine (web-llm worker) installable via reachable Settings → Offline AI; model weights cached by web-llm itself.
- **Memory:** ai_memories/user_memories/business_memories Firestore owner-scoped; ShadowMemory journal account-scoped; legacy global IndexedDB stores preserved untouched, never auto-claimed.

## 3. Verification performed (honest ledger)

| Check | Result |
|---|---|
| Full Vitest suite (incl. Firestore emulator rules tests) | **471 passed / 3 skipped** (63 files). Skipped: rules tests auto-skip only when the emulator env var is absent (was present). |
| TypeScript (app + functions) | Clean (0 errors) |
| Production build + prerender | OK (all routes; manifest + sw verified in dist) |
| ESLint | 0 errors; 84 warnings — verified IDENTICAL to baseline (no new warnings) |
| Secret scan | Only benign hits: key-format examples in comments, public-by-design Firebase web config, key-format hints |
| `git diff --check` | Clean |
| Headless-browser smoke check (performed, production build) | App boots; Settings → Offline AI renders the install panel; /s/\<unknown\> renders the honest missing state; chatbot boots with Encrypt-chat control. Console shows expected permission-denied for guest reads of the live backend (rules correctly denying). |
| Recovery artifacts | `shadowtalk-work-v2.bundle` (clone+checkout verified) + `shadowtalk-worktree-backup.tar.gz` (extract verified), SHA-256s recorded in `/home/z/my-project/download/`, refreshed after every commit. |

**NOT performed (must not be assumed):** real-device testing (Android/iOS via Capacitor), real offline model download on consumer hardware (WebGPU variance), real push/install flows, multi-account testing on a real shared browser, production Firebase deployment of the new rules/function.

## 4. Remaining known limitations (unchanged by this phase)

1. **`signOutAllOthers` unimplemented** — requires an Admin-SDK `revokeRefreshTokens` endpoint plus a per-session token registry (custom claims / custom tokens) that does not exist in this architecture. The SessionsPage button remains honestly disabled.
2. **Global legacy IndexedDB stores** (`shadowtalk_memory_db`, `shadowtalk-memory` legacy rows, `shadow-knowledge-base`, `shadowtalk-sovereign-model`) remain device-global; legacy rows are hidden from signed-in accounts but never migrated or deleted (preservation policy).
3. **Client-reported credit balances** — rules enforce ownership, not honesty; no server ledger.
4. **View counts on shared answers** are server-managed and currently never incremented (no counter implementation; client-side fakes removed).
5. **Mission/step approval in ChatbotPage is stubbed** (`activeMission = null`, `approveChatMissionStep = async () => {}`) — this is exactly the surface ProofLoop (spec §7) would replace.
6. **E2EE session keys are memory-only** — reload always re-engages; legacy ciphertext decrypts only via the recovery flow with the original passphrase.
7. **Cloud Function deployment** (`send-contact-email`, rules) is a manual `firebase deploy` step requiring Zain's credentials.
8. **stripe-portal / create-payment-invoice / process-manual-payment / code-runner / file-manager / postgres-query / api-gateway / shadow-scale-orchestrator** remain unimplemented — each requires either external credentials (Stripe), a payment-verification product decision, or sandbox infrastructure (details in the backend audit).
9. **App Check** is not enforced on Cloud Functions (roadmap item; noted in rules comments).

## 5. Browser testing checklist (Zain — desktop)

1. Boot: open `/` → app loads with no red error overlay; console may show permission-denied for guest reads (expected).
2. Auth: sign in → `/chatbot`; sign out → confirm chat list clears, BYOK key retained after signing back in; switch between two accounts → conversations/memories do not leak across accounts.
3. BYOK: Settings → Connections → add an API key → send a message → MessageBubble shows "via \<Provider\> (your key)".
4. Shared AI (if enabled server-side): set access mode shared → send message → label "via ShadowTalk shared"; 101st request in a UTC day → limit error.
5. Remote revocation (optional): delete the user in Firebase console while signed in → app drops to signed-out state, no private-mode flags survive (re-enable private mode to confirm).
6. E2EE: Encrypt chat → toggle turns "Encrypted", messages saved as ciphertext (verify in Firestore console `messages.content` starts with `e2e:`); disable → "Private mode off"; reload mid-private-session → honest "Private mode ended" toast, no stuck encrypted state.
7. Legacy E2EE recovery (only if this browser has pre-upgrade vault keys): Encrypt chat → recovery dialog appears → wrong passphrase refused → correct passphrase restores and old ciphertext decrypts.
8. Settings → Offline AI: section visible in nav and in search ("Offline AI"); Install Local AI Engine → progress bar → ready (desktop Chrome/Edge with WebGPU).
9. Prefer-local: enable "Prefer on-device AI" with engine NOT loaded → send message → one-time "Local AI not loaded" notice + cloud reply labeled with the cloud provider; with engine loaded → reply labeled "via Local (Llama-3.2-1B-Instruct…)".
10. Share: chat → share → publish (signed-in) → returned /s/\<slug\> URL opens in a private window and renders the answer; unknown slug → "no longer available".
11. Contact/About forms: submit → success toast; row appears in `contact_messages` (after function deploy).
12. ShadowMemory page: activity journal shows only current account's entries; "clear all" keeps other accounts' rows (test with two accounts).
13. Strategy runner: generate a report → row appears in `strategy_reports` and loads on revisit (previously denied).

## 6. Android testing checklist (Capacitor build)

1. `npx cap sync android` with fresh web assets; build + install on a device.
2. PWA/TWA install: Chrome → install banner appears; installed app launches standalone with correct theme color (#050508) and icon (maskable).
3. Auth sign-in/up + Google sign-in (redirect flow on Android Chrome).
4. Chat streaming over mobile network + background/foreground transitions.
5. Local model install attempt (device WebGPU support varies — record result either way).
6. Keyboard: input focus/scroll behavior with the soft keyboard (useIosKeyboard is iOS; verify Android resize).
7. Back button behavior: exits app from chat root, navigates history elsewhere.
8. Offline airplane mode: app shell loads (SW), honest offline banner, chat fails with actionable message unless local engine ready.

## 7. iOS testing checklist

1. `npx cap sync ios`; Xcode build to device/simulator.
2. Safe areas: notch/home-indicator insets on chat input and sticky footer.
3. Keyboard: focus chat input → view scrolls correctly (useIosKeyboard), no clipped input.
4. Splash/API call timing: cold start → AuthProvider boot completes (no stuck loader).
5. PWA add-to-home-screen on Safari: standalone display, correct icon.
6. Share sheet: share dialog + copy-link flows.
7. Voice input: microphone permission + transcription path.
8. E2EE engage/lock cycle in Safari (CryptoKey APIs on WebKit).
9. Firestore rules denial paths on device (guest reads) log warnings, not crashes.

## 8. Offline testing checklist

1. With local engine installed + ready: airplane mode → offline banner says "on-device AI is active" → chat works, replies labeled "via Local".
2. Without the engine: airplane mode → banner states availability honestly; sending a message with prefer-local ON → "isn't loaded yet" guidance (not a generic network error).
3. App shell: hard reload while offline → SW serves cached shell (navigateFallback).
4. Model persistence: after install, verify weights survive browser restart (web-llm Cache Storage + persistent storage grant).
5. ErrorBoundary "clear cache & reload" intentionally wipes ALL caches including model weights — expect a full re-download after crash recovery (documented limitation).
6. Sign-out offline → ephemeral cleanup still runs; sign back in online → data intact.

## 9. ProofLoop testing checklist (once implemented per spec; today: verify the SPEC's grounding)

1. Confirm deliverable entry points exist: chat tool "Execute" → Mission Control goal box; document pipeline outputs render in DocumentArtifact.
2. Confirm `agent_tasks` step lifecycle persists (start an agent task; watch `agent_tasks` doc).
3. Confirm strategy reports persist and reload (now unblocked by rules).
4. Review `docs/PROOFLOOP_SPEC.md` §9 decisions D1–D5 and answer them before implementation begins.

## 10. Prioritized stabilization backlog

1. **[P0] Deploy** rules + `send-contact-email` (`firebase deploy --only firestore:rules,functions`) and re-run the browser checklist against production.
2. **[P0] Real-device matrix** (§6–§8) — automated tests do not cover Capacitor/WebGPU/keyboard/insert behavior.
3. **[P1] Shared-answer view counter** — decide server-side mechanism (scheduled function or count on read via admin); keep client read-only.
4. **[P1] SessionsPage "sign out all others"** — implement Admin-SDK `revokeRefreshTokens` + per-session registry, or remove the disabled button to avoid a dead affordance.
5. **[P1] Server-side credit ledger** — move balance mutations into a callable function (transactional) so `shadow_credits` cannot be self-inflated; rules stay ownership-only meanwhile.
6. **[P2] ShadowMemory legacy migration UX** — optional consent-based claim of uid-less journal rows (pattern already proven in E2EE recovery).
7. **[P2] ErrorBoundary cache exclusion list** — preserve web-llm model caches on crash-recovery.
8. **[P2] ProofLoop implementation** after D1–D5 decisions (spec §10).
9. **[P3] Missing functions needing external dependencies:** stripe-portal (Stripe credentials), create-payment-invoice/process-manual-payment (payment-verification decision), code-runner/file-manager/postgres-query/api-gateway (sandbox infra), shadow-scale-orchestrator (Genkit model key + action-scope decision).
10. **[P3] App Check enforcement** on callable/request functions + reCAPTCHA/Play Integrity providers.
11. **[P3] Re-enable reflection pipeline** (`reflectionEngine.shouldReflect`) or delete the dead memory-toggle UI, per product decision.

---

*Prepared for Zain's manual testing. Nothing has been pushed; 11 local commits await authorization. Recovery artifacts in `/home/z/my-project/download/` (bundle + tarball, checksums in the delivery message).*
