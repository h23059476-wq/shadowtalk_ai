# Production readiness plan

## Working boundary

Work only in the isolated worktree at `C:\Users\Hacker\.codex\worktrees\auth-redesign\ShadowTalk-Production`. Preserve the existing authentication changes and user data. Do not deploy, push, edit production Firebase Console settings, use real user accounts, rotate secrets, or run destructive cleanup.

## Ordered work

### 1. Fix confirmed authorization flaws

- Remove ownership assumptions for Firestore records with no `user_id`; allow updates/deletes only when the caller is the stored owner or an admin.
- Add emulator regression tests proving a second user cannot read, claim/update, or delete an ownerless record, and retain positive tests for owner and admin behavior.
- Keep the emulator test tagged as skipped when the emulator is absent, but do not count skipped tests as a pass. Run with Java/Firestore Emulator when available.

### 2. Prevent public source-map exposure

- Disable source-map generation for the production build because there is no private error-monitor upload step.
- Rebuild and inspect `dist`; confirm production `.map` files are absent while prerendered routes and normal development maps still behave as configured.

### 3. Establish build and CI gates

- Run root app typecheck and node config typecheck using the existing TypeScript configuration; add a reproducible `typecheck` script and CI step only if they pass or after fixing verified defects.
- Investigate the Functions TypeScript failure with the exact locked dependencies under Node 20. Fix only verified package/type/source issues; document any unavailable runtime limitation.
- Make CI explicitly use Node 20 for every job, keep dependency installation lockfile-based, add typecheck and Functions checks, and run Firestore emulator tests where the CI runner can provide Java.
- Review npm advisories with package-level details. Apply only compatible, tested patch-level updates; do not run automatic major upgrades.

### 4. Preserve BYOK and security invariants

- Trace each current chat/image/audio/file route from UI choice through provider selection and error/cancellation paths.
- Confirm BYOK keys remain per-UID, are never put into URLs/telemetry/logs/client bundles as server credentials, and provider/model selection does not silently switch.
- Replace no behavior based on comments alone. Do not make a server-key or paid-provider fallback change without explicit mode consent.
- Clarify whether exported mock-only audio and Drive Functions are used externally before changing their API behavior.

### 5. Data, privacy, and abuse checks

- Audit file validation and cleanup across upload, document parsing, and Storage rules. Preserve private-by-UID access.
- Determine which public profile fields are intentionally public and check source/SEO outputs for private routes or data.
- Add or document abuse protection for unauthenticated intake without removing guest feedback functionality.
- Account-erasure policy is set to erase all user-linked app records. The Function queries the explicit collection inventory by owner fields, removes matched documents recursively and private payment receipt files, then deletes Firebase Auth. Validate the full behavior with a disposable staging account before release. It cannot erase processor/provider-held records or browser databases on other devices. No destructive deletion tests on production data.

### 6. Release integrity and critical journeys

- Validate prerendered output, canonical/meta tags, JSON-LD, sitemap URLs, robots directives, and public discovery assets using generated files.
- Run a local preview/browser pass for available anonymous routes and responsive behavior; mark Firebase/provider-dependent journeys unverified without test project credentials.
- Verify Hosting rewrite/header/cache configuration from source and preview where possible. Do not infer deployed behavior from `firebase.json` alone.
- Document manual production smoke steps, rollback, the exact project selection check, and release evidence requirements.

### 7. Final verification and report

- Re-run lint, typecheck(s), root tests, Functions build, security-rule tests (including emulator if possible), and production build after fixes.
- Inspect final diff for unintended changes, secrets, weakened rules, and generated artifacts.
- Produce `PRODUCTION_READINESS_FINAL_REPORT.md`, `DEPLOYMENT_RUNBOOK.md`, and `POST_DEPLOYMENT_SMOKE_TESTS.md` with PASS/FAIL/NOT VERIFIED and exact command outcomes.
- Current disposition is NO-GO: local app typecheck, test suite, lint, production build/prerender, and Functions build pass, but Firestore emulator tests and staging browser/auth/deletion journeys have not been evidenced. See `PRODUCTION_READINESS_FINAL_REPORT.md`.

## Exit criteria

1. No unresolved P0 or unaccepted critical P1 findings.
2. Authorization boundary tests pass in an emulator.
3. Frontend build and typecheck pass; Functions build passes under Node 20.
4. Root tests pass with skips disclosed; lint has no errors.
5. Production output contains no public source maps or secrets and serves required prerendered routes.
6. BYOK/provider behavior is tested without unauthorized fallback.
7. Critical browser journeys have evidence or are explicitly NOT VERIFIED because external setup is unavailable.
8. Deployment/rollback and post-deployment smoke runbooks are complete.
9. No production changes or destructive data operations occurred.
