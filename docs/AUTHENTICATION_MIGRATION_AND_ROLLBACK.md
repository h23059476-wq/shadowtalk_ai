# Authentication migration and rollback

## Repository changes

The auth changes add a custom action route, non-blocking verification UI, generic sensitive auth errors, a sanitized `public_profiles/{uid}` collection, owner/admin restrictions on private profile reads, and admin UI role gating. No account migration job or production Firebase deployment is included.

Existing private documents remain at `profiles/{uid}`. Public documents are written lazily when a user's profile is synchronized. Existing users may be absent from public-profile-driven counts or lists until they sign in again. Monitor those surfaces and decide whether a controlled backfill is needed; never backfill private fields.

## Firebase Console rollout

Before using the custom handler, serve `/auth/action` and configure the Firebase email action templates to use that route on the environment's authorized host. Confirm reset and verification links return to `/auth`. Check Google and Apple providers and authorized domains independently. These settings are outside the repository and were not changed here.

Deploy Firestore rules only after emulator rule tests pass. Review clients and backend jobs that read `profiles` or depend on authenticated-wide profile reads before rollout.

## Rollback

If the custom action page fails, restore the previous email-template URL in Firebase Console to Firebase's hosted handler; keep the app auth route available for ordinary sign-in. If privacy rules block a legitimate access path, roll back rules through the versioned Firebase deployment process after identifying the caller. The public collection is additive; leaving its documents in place does not expose private data. Reverting app code alone does not revert deployed rules or Console settings.

Keep the last known-good rules and Console template values with the release record. Test rollback in a non-production project first. Do not run destructive migration or deletion scripts as rollback.

## Release gates

- Firestore emulator tests pass in an environment with Java available.
- Provider enablement, authorized domains, and custom email template URLs are confirmed in each Firebase project.
- Account-erasure policy is to erase all user-linked app records. The deletion Function covers an explicit inventory and must pass a disposable staging-account test (including nested collections, receipts, and retry after partial failure) before release. Processor/provider-held data, external logs, and browser-local data are outside this flow and need separate disclosure/handling.
- No production rules deployment, Console edit, migration, or deletion was performed in this change.
