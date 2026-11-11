# Production readiness audit

**Audit date:** 2026-10-29 (Asia/Karachi)
**Worktree:** `C:\Users\Hacker\.codex\worktrees\auth-redesign\ShadowTalk-Production`
**Baseline commit:** `8470dbff695c7f87b836ceacf5c8cdf74c95d4c5`
**Git state:** detached HEAD in an isolated worktree; existing uncommitted auth-redesign work is present and is part of this audit's baseline. No changes from the original `D:\ShadowTalk-Production` checkout were copied here.

## Executive status

**Release recommendation: NO-GO.** No confirmed P0 finding so far. The P1 ownerless-document rule flaw has been fixed in this worktree, but emulator behavior remains unverified. A confirmed cross-account BYOK exposure in browser onboarding storage was fixed with UID scoping and regression checks pass. Account deletion now runs through an authenticated, recent-login Cloud Function and removes owner-matched records in the explicit app collection inventory and private receipt objects before deleting Auth. Full deletion remains unverified in an emulator or test project and cannot erase independent provider records or browser databases on other devices. Real provider/auth journeys, production configuration, CI deployment, and Hosting behavior remain unverified.

This is a repository audit, not a production penetration test. Firebase project identity is present in repository configuration, but no production database, deployed function, live account, DNS, or Firebase Console setting was accessed.

## Verified architecture

- Browser application: React 18, TypeScript, Vite, React Router, Vitest, Firebase Web SDK. Root package contains both `package-lock.json` and `bun.lock`; GitHub CI and Hosting workflows use npm. `package.json` has no explicit `packageManager` or typecheck/browser-test script.
- Hosting: Firebase Hosting publishes `dist`, applies COOP/COEP/CORP and long-lived immutable asset caching, and rewrites remaining paths to `/index.html`. `npm run build` runs Vite then `prerender.cjs` using Puppeteer.
- Identity/data: Firebase Auth client, Firestore rules, Firebase Storage rules, and a Firebase Functions codebase using Admin SDK. Firebase auth config in `firebase.json` declares email/password and Google; Apple availability is not established by the repo config.
- AI: the primary BYOK config is UID-scoped in browser storage and sent directly by provider integrations. Onboarding state and keys, ElevenLabs credentials, and business-memory caches are now also UID-scoped. Explicit shared-AI mode is separate from BYOK. Offline/local AI and file-processing journeys remain only partly verified.
- Public discovery: prerendered pages plus `robots.txt`, `sitemap.xml`, `aeo-sitemap.xml`, `llms.txt`, and `llms-full.txt`.
- External services and costs: Firebase, OpenRouter/OmniRoute and user-selected AI providers; Supabase is configured as a public/publishable client integration in a Hosting workflow; other integrations appear in app source and require per-feature configuration. No billing account or provider dashboard was inspected.

## Baseline evidence

The starting worktree already contained the authentication changes documented in `AUTHENTICATION_AUDIT.md` and other auth files; those were not introduced by this readiness audit. Recorded baseline commands/results from that worktree:

| Command | Result |
|---|---|
| `npm test` | Exit 0; 33 test files passed, 1 skipped; 165 tests passed, 6 skipped. Firestore rule tests skipped without emulator host. |
| `npm run lint` | Exit 0; 0 errors, 158 warnings. |
| `npm run build` | Exit 0; Vite bundle and Puppeteer prerender completed. Build emitted source maps into `dist` and large-chunk warnings. |
| `npm --prefix functions run build` | Failed. Initially dependencies were absent; after installing the Functions lockfile, TypeScript reported unresolved Firebase Admin declaration files and implicit-any errors. Runtime is Node 26.7.0; `functions/package.json` requires Node 20. |
| `firebase emulators:exec --only firestore ...` | Did not start: Java is not installed/available. Rule behavior has not been verified in the emulator. |
| `git diff --check` | No whitespace errors; Git printed line-ending conversion notices. |

Root dependency installation previously reported 43 advisories (10 low, 13 moderate, 19 high, 1 critical). The individual advisories and production reachability have not yet been assessed; no automatic audit fix was run.

## Findings

### P1 — Confirmed: ownerless legacy Firestore records can be claimed or deleted

`firestore.rules` uses `ownsExistingOrLegacy()` to authorize updates and deletes for whitelisted user-data collections. When a document lacks `user_id`, that helper returns true for any signed-in user. The update rule also lets that user write their own `user_id`, after which they can read/modify the record. The delete rule permits deleting it directly. The attacker must know the document path; lack of `user_id` is not proof of ownership. This contradicts the nearby comment and bypasses the intended cross-user boundary. Add regression cases and deny these operations unless ownership is established. Emulator execution is currently blocked by missing Java.

### P2 — Confirmed: production source maps are written to the public Hosting directory

Vite production config sets `build.sourcemap` to `'hidden'`. The baseline production build emitted `.map` files under `dist`, and Firebase Hosting serves that directory without excluding maps. Hidden removes source-map references from bundles but does not make the generated maps private. Disable production map generation or implement a verified private upload-and-exclusion flow; none is currently configured.

### P2 — Confirmed: authenticated Cloud Functions return fabricated audio/Drive results

`functions/src/index.ts` exports `audio` and `drive` endpoints which authenticate the caller but return a canned audio URL and mock Drive rows/content. No in-repository frontend call to these endpoints was found. They are not evidence of real audio generation or Drive access. Confirm whether external consumers depend on them before removing or changing those APIs; until then, treat their functionality as not production-verified and avoid claiming these features work.

### P2 — Confirmed: anonymous intake writes lack rate limiting/App Check

Firestore allows unauthenticated creates for feedback, newsletter, and contact collections with only a few size checks. The rules comment explicitly identifies App Check as roadmap work. No rate limit is present in the rules. Abuse protection and actual App Check deployment are not verified. Preserve intentional guest submissions while adding a trusted abuse-control mechanism in a separately testable change.

### P2 — Confirmed: deployment CI does not gate on typecheck, Functions build, or security-rule tests

The GitHub CI workflow runs lint, frontend build, unit tests, and `npm audit` with `continue-on-error: true`; it does not run a frontend typecheck, Functions build, or Firestore emulator suite. The Hosting merge workflow builds with Node's default runner version and uses Node 20 only in the separate CI workflow; it also provides public Supabase configuration to the frontend build. Hosting configuration targets the expected project in workflow YAML, but secrets, production access, and deploy behavior were not checked.

### P2 — Confirmed: account deletion is not a reliable full-data deletion flow

The existing profile UI deletes the Firebase Auth account before attempting partial Firestore cleanup, catches cleanup errors, and can report success despite remaining data. The rules deny owner deletion of private profile docs; Storage cleanup and the set of user-owned collections are incomplete. Payment and audit retention policy is unknown, so a safe replacement cannot be completed without an owner decision. No production deletion was performed.

### P2 — Unverified: Firebase project and identity-provider settings

The repository declares email/password and Google in `firebase.json`, but deployed provider enablement, authorized domains, Apple setup, email templates, MFA, App Check, and Firestore edition were not read from Firebase Console. The Firestore emulator could not launch locally.

### P2 — Unverified: real critical user journeys and browser/accessibility performance

Unit tests and prerender validate code paths and HTML generation, not production Firebase sign-up/login, account switching, provider outages, actual file upload/processing, offline asset availability, mobile keyboard/focus behavior, or deployed route/headers. No automated browser-test framework is configured. These checks require a non-production Firebase project and test accounts or recorded manual evidence.

### P3 — Confirmed: repository has two package-manager lockfiles

`package-lock.json` is used by CI and deploy workflows while `bun.lock` is also present, with no `packageManager` declaration. Define the supported install path and ensure lockfiles stay synchronized; avoid removing either without confirming how contributors use Bun.

### P3 — Confirmed: lint has a large warning backlog

Baseline lint succeeds with 158 warnings, mainly hook dependency and fast-refresh warnings. No errors were reported. Classify and reduce warnings that touch auth, data lifecycle, or expensive chat flows; do not bulk-fix unrelated warnings without tests.

## Unverified areas and evidence limits

- No Firebase Auth/Firestore/Storage production reads or writes, deploy, DNS change, credential rotation, or account deletion occurred.
- No real account or provider credentials were used.
- No public deployment URL/browser smoke test or Lighthouse run was performed.
- No live provider charge, rate-limit, outage, or file-transmission behavior was exercised.
- Dependencies report advisories, but their package identities, fixed versions, exploitability, and production inclusion still need a focused audit.
- User-facing retention policy for payment/audit data is pending.

## Next steps

See `docs/PRODUCTION_READINESS_PLAN.md` for ordered fixes and release gates. Do not issue a GO recommendation until the P1 rule flaw is corrected and tested, builds/typechecks work under the declared runtime, critical BYOK/auth/security checks pass, required browser journeys are evidenced, and unresolved retention or external-provider decisions are disclosed.

## Current-worktree implementation update (2026-10-29)

The following baseline findings now have code changes in this worktree; these are not production deployments and remain subject to final verification:

- Firestore's ownerless-record claim/delete path was removed. Generic updates require stored and incoming ownership; deletes require existing ownership or admin. Regression cases cover attempts to claim, read, and delete ownerless documents, plus owner access.
- Production Vite source maps are disabled. Final build output still needs a `.map` scan.
- AI onboarding cohort/key/quota data is namespaced by Firebase UID and hidden while an identity switch is loading. Legacy unscoped onboarding keys are not migrated because their owner cannot be established. The primary BYOK config was already UID-scoped. ElevenLabs keys and business-memory caches now use per-UID storage.
- `business_memories` was added to UID-owned Firestore rules and account cleanup, with a cross-user access test.
- Account deletion now invokes an authenticated Function, requires recent authentication, deletes owner-matched documents in the explicit Firestore collection set (including billing/audit rows and nested subcollections), removes `payment-receipts/{uid}/` objects, and deletes the Firebase Auth user last. Cleanup failure leaves Auth available for retry. No live account or production data was touched. External provider/payment records and browser databases on other devices are not erased by this Function.
- Mock audio and Drive Functions now return HTTP 501 after authentication. The Deep Research page no longer fabricates a completed report. The Status page now marks monitoring as unavailable and no longer displays synthetic uptime or incident history. Business simulation is labeled illustrative.
- The Privacy Policy was corrected where it asserted a fixed provider retention/training policy, universal TLS version, certification status, or Supabase as the active primary database. Processor agreements and optional integration inventory still require legal/operations verification.
- TypeScript fixes include a broken voice helper import, a missing chat conversation ID, a missing document detector import, WebGPU typing, auth-action save-state rendering, SEO field/copy, analytics event names, and other strict compiler failures.

The original baseline table above remains historical. Current verification: app typecheck passed; full test suite passed with 1 file and 8 tests skipped; lint passed with 0 errors and 160 warnings; production build and prerender passed with 0 public `.map` files; Functions build passed. Firestore emulator behavior, browser journeys, Node 20 Functions compilation, and production settings remain unverified. Exact outcomes and release gates are recorded in `PRODUCTION_READINESS_FINAL_REPORT.md` and `SECURITY_TEST_RESULTS.md`.
