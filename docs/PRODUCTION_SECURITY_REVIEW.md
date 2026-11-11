# Production security review

**Review date:** 2026-10-29 (Asia/Karachi)
**Scope:** Current isolated repository worktree. No production Firebase project, deployed endpoint, DNS, or user account was accessed.

## Architecture and trust boundaries

- The browser app uses Firebase Authentication, Firestore, Firebase Storage, and Firebase Hosting. A compatibility adapter in `src/integrations/firebase` provides the `.from()`, `.auth`, `.storage`, and `.functions` shape used by legacy call sites.
- Cloud Functions use Firebase Admin SDK. `chat` and `generateImage` authenticate Firebase ID tokens and require the account's explicit shared-AI mode. BYOK requests are intended to go directly to the user's selected provider.
- Firestore rules are the client data boundary. A UID allowlist grants access to per-user data only when the stored and incoming record owners match. Privileged collections have explicit role/admin rules. Storage private paths are `<logicalBucket>/<uid>/<file>`; public asset folders are read-only.
- Client route checks and role UI improve usability but are not trusted authorization. Admin writes must remain protected by rules or server checks.

## Review findings and current treatment

| ID | Severity | Evidence | Current treatment / remaining work |
|---|---|---|---|
| SEC-01 | P1 | Ownerless Firestore documents could be claimed or deleted through a legacy ownership helper. | Helper removed; updates require stored and resulting ownership, deletes require existing ownership/admin. Emulator regression tests added; Java is unavailable locally, so execution is pending. |
| SEC-02 | P1 | `AIKeyContext` stored a BYOK key/cohort in browser-wide localStorage while the provider survived auth switches. | Onboarding state is UID-scoped and consumer values are hidden during identity loading. Primary BYOK, ElevenLabs, business memories, and settings cache are scoped by UID. Regression tests added; browser account-switch check remains pending. Legacy unscoped onboarding keys are not automatically attributed to any account. |
| SEC-03 | P1 | Account deletion removed Auth first and ignored failures from partial client cleanup. | UI invokes `deleteAccount`; Function verifies the caller token and `auth_time` age (maximum five minutes), deletes matching configured Firestore documents and nested subcollections, removes private receipt files, then deletes Auth. Partial cleanup is retryable. Function/emulator/test-project verification and deployment are pending. |
| SEC-04 | P2 | Production source maps were emitted into Firebase Hosting's public `dist`. | Vite production source maps disabled. Inspect the final `dist` tree after build. |
| SEC-05 | P2 | Authenticated `audio` and `drive` functions returned canned/mock success. | They now return explicit HTTP 501 after authentication. No in-repository caller was found; external consumers are unknown. |
| SEC-06 | P2 | Research and Status screens presented synthetic results/uptime/incidents as live. | Research reports provider-backed execution unavailable; Status reports monitoring unavailable and removes synthetic metrics/incidents. |
| SEC-07 | P2 | Anonymous feedback/newsletter/contact writes have size checks but no verified rate-limit/App Check enforcement. | Not changed; maintain guest intake while adding a trusted abuse-control solution. Verify Firebase App Check and abuse settings before release. |
| SEC-08 | P2 | Privacy Policy contained unsupported provider retention/training, TLS-version, certification, and active-Supabase-database assertions. | Text corrected to describe known Firebase and variable provider behavior. Legal review and complete optional-processor inventory are still required. |
| SEC-09 | P2 | `business_memories` was accessed by the app but absent from the Firestore user-data collection allowlist. | Added to UID-owned rules and account cleanup; owner-vs-other-user emulator test added. Emulator run pending. |

## BYOK security invariants

- Never send a BYOK key in a URL, analytics event, error message, support message, or log.
- Route the request to the configured provider and model. Do not silently substitute a server-funded provider or change model.
- Keep provider credentials in the current UID namespace. The primary key store (`shadowtalk.byok.v2.<uid>`) remains unchanged. AI onboarding, ElevenLabs, and business-memory local state now use UID-specific keys.
- Old global onboarding values are not migrated into a newly active account because their owner is unknowable. The old entries may still exist locally; no code path added in this worktree reads them.
- Shared AI is a separate, explicit access mode, enforced in Cloud Functions through the user's Firestore `ai_access_mode`. It must not be a silent BYOK fallback.
- Provider failure, invalid-key, cancellation, quota, and file-transmission behavior still needs real isolated-provider verification. No provider keys were used in this review.

## Account deletion coverage and boundary

The endpoint's explicit collection set covers user-data collections referenced by current Firestore rules and app call sites, plus legacy workspace, AI, security, community, analytics, and billing collections. For each listed collection, it queries owner fields including `user_id`, `uid`, `userId`, `owner_id`, `owner_uid`, `created_by`, `created_by_uid`, `author_id`, `user_uid`, `actor_id`, `target_user_id`, and `subject_user_id`; billing collections also match the account email fields. UID-keyed profile, role, API key, integration, and OAuth documents are included directly. Each matching document is recursively removed. `payment-receipts/<uid>/` files are removed. Auth deletion is last. This remains an explicit inventory rather than a proof that every historical schema is covered; staging fixture coverage is a release gate.

This does not delete independent records held by a payment processor or model provider, remote provider logs, an unlinked ownerless legacy document, local browser databases on other devices, or an external dataset not represented by the configured collection/field list. Billing cancellation/processor erasure is not established by the repository. The user asked to erase all user-linked records; this endpoint implements the app-controlled Firebase portion and the product message/policy must not promise more than that.

## Security configuration and operations not verified

- Firebase project edition, deployed rules, enabled providers, authorized domains, App Check enforcement, email enumeration protection, MFA, storage bucket permissions, and Function service-account permissions.
- Secret values or runtime availability for `OPENROUTER_API_KEY`; only secret *names* and code references were inspected.
- Whether `firebase.json` headers are present on the deployed Hosting site and whether COEP/COOP breaks any third-party integrations.
- Root dependency advisories: 43 were reported by the baseline install (10 low, 13 moderate, 19 high, one critical); package identity and production reachability require a separate advisory triage.
- Account deletion, Firebase Auth, provider, file-upload, and BYOK journeys against a non-production Firebase project.

## Release recommendation

**NO-GO until** the final frontend typecheck/build/test suite is clean, Functions compilation and the delete endpoint pass in the declared Node 20 environment, Firestore rule tests run in an emulator, a non-production test account validates auth/BYOK/account switching/deletion, and legal/operations owners verify project settings, provider terms, billing impacts, and deployment rollback.
