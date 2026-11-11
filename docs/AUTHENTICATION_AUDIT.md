# Authentication audit and implementation plan

**Audit date:** 2026-10-29
**Scope:** Repository source/configuration in the authentication worktree. No Firebase Console, production account, or deployed rules inspection was performed. Source-backed findings below are not a production security certification.

## 1. Current architecture

- Firebase Authentication is the active identity provider. The web dependency is `firebase` `^12.18.0` (`package.json`). `src/integrations/firebase/app.ts` initializes Firebase Auth and requests `browserLocalPersistence`.
- `src/integrations/firebase/auth.ts` wraps Firebase methods in a Supabase-shaped compatibility interface. `src/integrations/local/client.ts` selects the Firebase adapter; there is no active Supabase auth client in this path.
- `src/components/AuthProvider.tsx` bootstraps the Firebase session, subscribes to auth changes, syncs a Firestore profile, checks subscription status, and exposes auth state. It fetches an initial session before subscribing and suppresses the duplicate initial callback.
- `src/pages/AuthPage.tsx` provides email/password login and signup plus Google and Apple redirect sign-in. Signup sends a verification email best-effort and signs the new user into the app immediately.
- Firebase's SDK owns persisted credentials. `saveLocalUser` separately stores email and UID in localStorage; it is not a Firebase credential. `src/lib/persistentAuth.ts` also retains unused local-session helpers that synthesize fake `local-token`/`local-refresh` values; repository search found no runtime caller of `restoreOrCreateSession` or `buildLocalSession`.
- Authenticated backend access is primarily enforced by Firestore and Storage rules. The React router has no global protected-route wrapper. Settings redirects anonymous users; the admin page currently sets `accessGranted` to `true`, so its UI is not gated. Client UI checks are not authorization boundaries.

## 2. Existing behavior

| Flow | Observed behavior |
| --- | --- |
| Email/password sign-in | Calls Firebase `signInWithEmailAndPassword`; successful login hard-navigates to `/chatbot` (preserving an optional `q` prompt). |
| Signup | Calls Firebase `createUserWithEmailAndPassword`; optional display name is applied; verification email send failure is nonfatal; user is immediately signed in and redirected to chat. |
| Google/Apple | Uses Firebase `signInWithRedirect`; redirect result is handled by the auth adapter. UI exposes Google and Apple, but only Google appears in checked-in `firebase.json`; actual provider enablement must be confirmed in Firebase Console. |
| Password reset | UI accepts an email and calls the adapter. Adapter ignores `redirectTo` and invokes `sendPasswordResetEmail` without action-code settings. No in-app reset-code handler or reset completion form was found. Firebase-hosted action handling may still work, but the app flow is not verified. |
| Email verification | Verification is sent at signup and adapter methods exist for checking/resending. No current UI caller for resend/check and no verified-email gate were found. The product's intended verification policy is not stated in source. |
| Session restore | Firebase local persistence is requested. AuthProvider asks the adapter for the session, then listens for Firebase auth-state changes. Firebase should synchronize SDK-managed persistence across tabs, but no app-level multi-tab tests exist. |
| Sign-out | Sets an explicit-sign-out localStorage flag, removes the saved local email/UID, calls Firebase `signOut`, then clears React auth state. Firebase sign-out is for this client session; no all-device revocation flow was found. |
| Account deletion | Profile UI deletes the Firebase Auth user first, then best-effort deletes only a profile, user settings, and conversations. Errors from Firestore cleanup are swallowed and success is still shown. Rules allow profile deletion only to admins; messages and other user-owned collections are not cleaned here. A Functions `onDeleteUser` trigger is mentioned in a comment but is absent from `functions/src/index.ts`. |
| Authorization | Firestore rules use UID ownership for whitelisted user data and separate admin-only writes for privileged collections. Storage scopes user files by UID. No route wrapper exists; server/rules must remain authoritative. |

## 3. Findings and severity

Severity is a repository-level triage, not an exploitability determination against the deployed project.

### P1 — Account deletion can leave user data behind while claiming it was removed

`src/pages/ProfilePage.tsx` deletes the Auth user before attempting client-side cleanup. It catches and ignores cleanup errors, then tells the user their account and data are removed. `firestore.rules` denies ordinary users deleting their profile, and the client only attempts a small subset of collections. The referenced cleanup trigger is not present in the Functions source. This creates orphaned data and a misleading deletion confirmation. Do not test by deleting production accounts.

### P1 — Authenticated users can read all profile documents

`firestore.rules` allows `read: if signedIn()` on `/profiles/{uid}`. Profile documents contain email and other account fields according to `src/lib/authProfile.ts`. Any authenticated user can therefore read other users' profile documents through Firestore, subject to query access. The rules themselves call out a future split between public and private profile data. Before tightening this rule, trace all public-profile consumers and move intended public fields to an explicitly limited public document/collection.

### P2 — Admin UI is rendered without an auth/role gate

`src/pages/AdminPage.tsx` initializes `accessGranted` to `true` (“hook ready for future auth gating”). This exposes the admin surface to every visitor. Firestore rules still restrict protected data, so this is not by itself proof of privileged data access, but every admin action and endpoint needs server/rule enforcement and the UI should not imply access control it does not perform.

### P2 — Password reset has no application-managed completion flow

The adapter discards the requested redirect URL, and no `verifyPasswordResetCode`/`confirmPasswordReset` action handler was found. Users may land on Firebase-hosted action handling rather than a consistent, branded app recovery experience. The reset action must be tested with an isolated account before changing it.

### P2 — Email verification is advisory only

Signup copy says users should verify, but verification delivery failure is ignored, users proceed to chat, and no resend/verified-state UI exists. Decide whether verification is required for any specific operation. Until then, a non-blocking verification prompt is safer for existing users than an unannounced access gate.

### P2 — Authentication errors can disclose account existence

`friendlyError` maps `auth/user-not-found` and `auth/email-already-in-use` to distinct messages. `AuthPage` shows these messages directly. Password-reset success copy also echoes the submitted address. Use generic externally visible responses where Firebase/provider behavior permits, while retaining useful non-sensitive validation errors.

### P2 — Client-side rate limit is not a security control

`useRateLimiter` in `AuthPage.tsx` keeps a five-attempt/minute counter in a component ref. Refreshing the page or using another tab resets it. Firebase has provider-side abuse protections, but no app-owned server rate limiter was found; do not represent this component counter as enforcement.

### P2 — Identity linking is presented by compatibility types but unsupported

`src/lib/authIdentities.ts` calls `linkIdentity`/`unlinkIdentity`; the Firebase adapter returns “not available” errors for both. Account collision/linking behavior for email/password and OAuth is consequently incomplete and needs a safe Firebase linking flow before presenting linked-account controls as functional.

### P2 — Local fake-session helpers are misleading latent code

`src/lib/persistentAuth.ts` can construct synthetic non-Firebase tokens, but repository search found no runtime caller in the current auth provider. Remove or quarantine these only after checking all consumers and tests; they must never become a fallback for Firebase authentication.

### P3 — Adapter session expiry metadata is synthetic

`toAdapterSession` reports a fixed one-hour lifetime based on the time it is called rather than the actual Firebase ID-token expiration. Firebase SDK token refresh remains the source of truth, but compatibility consumers could misread this metadata. Prefer obtaining actual token claims or stop exposing fabricated expiry values.

### P3 — Auth behavior is under-tested

The only dedicated auth-named test found is `src/lib/persistentAuth.test.ts`, which covers local sign-out flags and preserved keys. No Firebase auth adapter tests, auth page flow tests, Firestore rules tests, emulator configuration, or account deletion tests were found. Other component tests mock AuthProvider and do not validate Firebase lifecycle behavior.

## 4. UX and accessibility review

`AuthPage` has login/signup toggling, password visibility controls, basic password-strength feedback, loading states, toasts, password reset initiation, and OAuth buttons. The audit did not confirm a complete verification or password-reset completion state. A component-level five-attempt limit is presented as a rate limit but is bypassable by reload. Current auth errors include provider/account detail. The design uses the existing dark ShadowTalk styling, Lucide icons, and Framer Motion; final accessibility review should verify labels, keyboard operation, focus order, reduced-motion support, and live announcements in the rendered page.

## 5. Data migration and BYOK risk

No identity-provider migration is recommended. Keep Firebase UIDs as ownership keys so existing Firestore and Storage data remains associated with the same accounts. Do not change provider linking rules or delete/move user data during UI work. Account deletion is the only identified lifecycle change that needs a backend cleanup workflow; design it as an explicit, auditable server-side process with retries and a truthful completion state. BYOK keys are UID-scoped in browser storage (`src/lib/byok.ts`); preserve that isolation and explicitly clear the current UID's key before deleting that account, since after Firebase Auth deletion the current UID may no longer be available to the existing cleanup helper.

## 6. Recommended target architecture

1. Keep Firebase Authentication and the existing Firebase UID model.
2. Keep the current SDK-managed persistent session and one central AuthProvider subscription. Remove synthetic local-session concepts only after verifying remaining callers.
3. Keep React route guards as UX, while Firestore rules and authenticated, authorized Functions remain the actual access boundary.
4. Add Firebase action-code handling for password reset and email verification, using fixed same-origin continuation routes and no untrusted redirect target.
5. Return generic login, signup-collision, and password-reset outcomes that do not reveal account existence. Keep actionable network/provider errors without exposing tokens or raw sensitive provider payloads.
6. Make email verification state/resend visible. Do not block existing users until product policy and recovery behavior are explicitly defined.
7. Tighten profile privacy only after documenting public profile requirements and migrating public display fields to a minimum-field public surface; keep private profile reads owner/admin-only.
8. Replace client-only account cleanup with an authenticated, recent-login-aware deletion request and trusted backend cleanup process. Report completion only when the workflow confirms it; retain audit/status metadata as required by applicable policy.
9. Gate admin screens for usability and separately verify every admin data operation at rules/Function boundaries.
10. Add isolated Firebase Auth and Firestore emulator tests for lifecycle, rules, and deletion behavior. Never use production identities for destructive tests.

## 7. Screen and flow proposal for review before UI implementation

### Screen structure

- **Sign in:** email, password, reveal control, submit, forgot-password link, create-account switch, and only configured OAuth providers.
- **Create account:** email, password, confirmation, clear password requirements, and a concise verification expectation. Do not claim verification succeeded if sending failed.
- **Recovery request:** email input and neutral confirmation (“If an account can be recovered with that address, instructions will be sent”).
- **Recovery completion:** Firebase action-code validation, new password/confirmation, expired/invalid-link state, and success link back to sign-in.
- **Verification state:** signed-in notice with verified status and resend action; allow refresh/recheck. Preserve access unless the product explicitly adopts a verified-email requirement.
- **Account security settings:** change password with recent-auth handling, email verification state, sign-out, and deletion status. Do not show linked-provider controls until linking is implemented.
- **OAuth return/error:** one predictable route with loading, cancellation, provider failure, and safe internal return navigation.

### Proposed user journeys

1. Sign in/signup → Firebase result → AuthProvider update → safe internal return path (default `/chatbot`).
2. Password recovery request → neutral confirmation → Firebase email → app action-code completion → sign in.
3. Signup → verification email attempt → clear pending state and resend/recheck; no unverified access policy change without product approval.
4. OAuth redirect → Firebase callback/result → AuthProvider session → validated internal destination; cancellation returns to the form.
5. Sensitive account action → recent authentication if Firebase requires it → operation result; no optimistic success.
6. Account deletion → explicit confirmation and recent-auth proof → trusted cleanup job/status → sign out and confirmation only after completion.

## 8. Staged implementation plan

**Stage A — Complete audit and approve flow design.** Validate external Firebase project settings with an authorized project owner; decide email-verification policy and account-deletion retention requirements. No production changes.

**Stage B — Tests first.** Add unit tests for adapter mappings and return-path validation; set up Firebase Auth/Firestore emulators or isolated test project; cover cross-user rules and auth lifecycle. Run only against emulator/isolated accounts.

**Stage C — Backend and adapter correctness.** Implement action-code handling, generic auth outcomes, actual token metadata, safe identity linking only if supported/required, profile privacy separation, and server-side deletion orchestration. Preserve Firebase UIDs and BYOK namespacing.

**Stage D — Auth UX.** Implement the reviewed screen structure, accessible form semantics/states, verification and recovery screens, safe navigation, mobile behavior, and account-security controls.

**Stage E — Verification and docs.** Run app build, TypeScript checks, lint, focused and full tests, emulator rules tests, and manual desktop/mobile flows. Create the architecture, test-plan, and migration/rollback documents requested in the brief. Review the final diff; do not deploy or change Firebase Console settings without separate authorization.

## 9. External checks still required

The repository cannot establish which providers are enabled in the deployed Firebase project, its authorized domains, password policy, email enumeration protection, action URL templates, MFA configuration, or whether any external Functions deployments exist. Confirm these in the intended Firebase project before release. No production deployment or account was accessed during this audit.

## 10. Implementation status (2026-10-29)

The accepted policies are that email verification remains non-blocking and account deletion erases user-linked records in ShadowTalk's Firebase-controlled data. Implemented in the isolated worktree: Firebase action-code reset/verification UI, neutral recovery messaging, resend/recheck notice, generic sensitive auth errors, token-derived session expiry, removal of active local-user cache usage, sanitized public profile documents with stricter private-profile reads, admin UI role gating, and recent-login Cloud Function account deletion. Deletion covers an explicit current/legacy Firestore collection inventory and matching owner fields, recursively removes nested documents, removes UID-scoped payment receipt objects, and deletes Firebase Auth last. The public-profile migration remains lazy; existing profiles are not backfilled.

Validation in the current worktree: `npm run typecheck` passed; `npm test` passed (34 files passed, 1 skipped; 169 tests passed, 8 skipped); `npm run lint` passed with 0 errors and 160 warnings; `npm run build` passed with prerender and no public `.map` files; `npm --prefix functions run build` passed locally. The Firestore emulator could not launch because Java is unavailable, and Functions compilation must be repeated under the declared Node 20 runtime. Auth, deletion, and provider journeys still require a disposable staging project. No production deployment or Firebase Console configuration was changed and no account was deleted.

The erasure endpoint cannot erase independent processor/provider records, external logs, browser databases on other devices, or data outside its enumerated schema. Firebase Console email templates must be configured for `/auth/action` before custom action links are used. See `AUTHENTICATION_ARCHITECTURE.md`, `AUTHENTICATION_TEST_PLAN.md`, `AUTHENTICATION_MIGRATION_AND_ROLLBACK.md`, and `PRODUCTION_READINESS_FINAL_REPORT.md` for current architecture and release gates.
