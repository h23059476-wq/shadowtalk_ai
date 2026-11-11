# Authentication architecture

## Runtime and ownership

Firebase Authentication is the identity provider. `src/integrations/firebase/auth.ts` maps provider operations to the application's compatibility session shape. `AuthProvider` observes Firebase's auth-state stream and is the source of truth for the current user; local storage is not an authentication authority. Firestore stores profiles and authorization metadata. Firebase Security Rules and server-side checks enforce access; client role checks only control presentation.

The UI supports email/password, Google, and Apple redirect sign-in. Provider enablement, authorized domains, and email templates are configured in Firebase Console and must be checked per environment. The client uses browser-local persistence. Compatibility session expiry comes from the Firebase ID token result.

## Sign-up, sign-in, and recovery

Email/password sign-up creates a Firebase identity and attempts to send a verification email. Verification is non-blocking: users can continue using ShadowTalk while unverified. A signed-in notice offers resend and a refresh check. Sensitive sign-in errors do not distinguish account existence. Google and Apple use redirect flows and return through the app's auth route.

Password-reset requests return a neutral response whether or not an account exists. Firebase sends a reset email with a same-origin continuation. `/auth/action` handles `mode=resetPassword` and `mode=verifyEmail` links when Firebase Console templates are configured for the custom handler. It validates reset codes before accepting a new password and does not trust arbitrary continuation URLs. Without that Console setting, Firebase's hosted handler remains in use.

## Profile data and authorization

Private documents live at `profiles/{uid}` and are readable by their owner or an administrator. Public counts, leaderboards, and widgets read `public_profiles/{uid}`, containing only `user_id`, `display_name`, `avatar_url`, and `updated_at`. Public documents synchronize with profile updates. This migration is lazy: existing accounts may not get a public document until signing in again. Never copy private fields to the public collection.

`useAdminCheck` checks the user's role document for the admin UI. Firestore rules continue to enforce admin data access and role changes. Client page gating does not grant backend authorization.

## Local data and lifecycle

Firebase remains authoritative for identity and token refresh. The previous active local-user cache is removed during Firebase hydration and sign-out and must not restore signed-in state. Legacy local-auth helpers may remain for isolated preview code but are not on the live provider path. BYOK credentials remain under a UID-scoped browser storage key and are not sent to Firebase by this auth flow.

## Account deletion status

The account owner selected erasure of all user-linked app records. The profile UI calls an authenticated Cloud Function; the Function requires recent authentication, deletes matching records from an explicit collection/owner-field inventory including nested subcollections, removes `payment-receipts/{uid}/` objects, then deletes Firebase Auth. The UI reports completion only after the Function confirms success. This flow has not yet been integration-tested in a disposable Firebase project. It does not erase independent payment processor/provider records, provider logs, browser databases on other devices, or user-linked data outside the enumerated schema. No production account was deleted.

## Environment operations

For each Firebase environment, verify enabled providers, authorized domains, password and verification templates, and the action-handler URL. Exercise rules in the Firebase Emulator before deployment. No production Firebase setting or deployment was changed here.
