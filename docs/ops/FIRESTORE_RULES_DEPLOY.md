# Ops — Firestore rules deployment (2026-11-09 signup-persistence incident)

## Symptom

New users could sign up and chat, but **every conversation vanished on
browser refresh**. The sidebar was empty after reload; nothing was stored.

## Root cause

Not an app bug in the save path — a **rules-deployment drift**:

1. The client correctly inserted `conversations/{id}` and `messages/{id}`
   with `user_id == auth.uid` (live repro: `remote conversation insert
   FAILED: permission-denied, userId 68krmFaMO4…`).
2. The **deployed** Firestore ruleset in the project predates the repo's
   per-user data whitelist — it allows `profiles` / `public_profiles` /
   `blog_posts` / `announcements` / `feedback` but has **no allow rule for
   `conversations`, `messages`, `user_sessions`, `user_settings`,
   `user_journeys`, `usage_analytics`** (verified by REST probes:
   `public_profiles` publicly readable while an authenticated user was
   denied on everything user-scoped).
3. `firestore.rules` in the repo is correct and CI-tested (emulator), but
   **nothing ever deployed it**: `firebase-hosting-merge.yml` used
   `action-hosting-deploy` (hosting only), and no other automation shipped
   rules.
4. The app's resilience fallback then kept chats in memory only
   ("Using local chat"), which by design does not survive a refresh — and
   the failure was easy to miss.

Evidence timeline (live reproduction, 2026-11-09):

| Probe | Result |
| --- | --- |
| Unauthenticated REST read `public_profiles` | 200 — documents returned |
| Unauthenticated REST read `conversations` | 403 PERMISSION_DENIED |
| Signed-up user (uid `68krmFaMO4…`, email unverified) | `profiles` + `public_profiles` writes succeeded; `conversations`/`messages`/`user_sessions`/`user_settings`/`user_journeys`/`usage_analytics` all 403 |
| Repo rules under Firestore emulator (22 tests incl. new signup-persistence regression) | all pass |

No committed version of `firestore.rules` behaves like the deployed one —
the live ruleset was hand-edited in the Firebase console at some point and
drifted from version control.

## Fix

1. **Code (this branch)** — regression test
   `signup persistence flow: unverified new user can save conversations and
   messages` in `firestore.rules.test.ts`; honest UI surfacing in
   `ChatbotPage.tsx` (persistent amber banner + accurate toast when
   persistence is denied; silent-drop message inserts now log and flag).
2. **Automation** — `firebase-hosting-merge.yml` now deploys
   `firestore:rules` + `firestore:indexes` on every merge to `main` using
   the existing `FIREBASE_SERVICE_ACCOUNT` secret, so the live rules can
   never drift from the tested repo rules again.
3. **One-time manual deploy (do this NOW — the incident is live until the
   rules ship):**

```bash
npx --yes firebase-tools@14 login
npx --yes firebase-tools@14 deploy --only firestore:rules,firestore:indexes --project shadowtalk-ai-7a513
```

(Or merge this branch to `main` — the new workflow step deploys the rules
with the existing service-account secret before the hosting deploy.)

## Verification after deploy

- Sign up a fresh user, send messages, refresh → conversations and messages
  survive; no `permission-denied` in the console; no amber
  "Chat history unavailable" banner.
- `npm test` under the emulator stays green (CI enforces this on every PR).

## Note on chats lost during the incident

Messages typed while the broken rules were live were only ever in memory —
they are gone and unrecoverable. Once rules are deployed, all NEW chats
persist normally.
