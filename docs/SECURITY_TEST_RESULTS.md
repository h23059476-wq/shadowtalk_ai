# Security test results

**Updated:** 2026-10-29 (Asia/Karachi)
**Environment:** Isolated local worktree; no production credentials or data.

## Baseline evidence before this readiness pass

| Check | Result | Scope and limit |
|---|---|---|
| `npm test` | Exit 0; 33 files passed, 1 skipped; 165 tests passed, 6 skipped. | Firestore rules test suite skipped without an emulator host. |
| `npm run lint` | Exit 0; zero errors and 158 warnings. | Warnings remain, including hook dependency/fast-refresh warnings. |
| `npm run build` | Exit 0; Vite and Puppeteer prerender completed. | Baseline output included public `.map` files and large-chunk warnings. |
| `npx tsc --noEmit -p tsconfig.app.json` | Failed with 12 diagnostics across app code. | Initial defects are listed in `PRODUCTION_READINESS_AUDIT.md`; post-fix result pending. |
| `npm --prefix functions run build` | Failed. | Node 26.7.0 was active while `functions/package.json` declares Node 20; Admin declarations and implicit-any errors were reported. |
| Firestore emulator | Not started. | Java was not installed/available. New rule tests are not yet executed. |

## Added security regressions

- `src/integrations/firebase/firestore.rules.test.ts`: an authenticated user cannot read, claim, update, or delete an ownerless legacy record; an owner can update/delete their own row; another user's row is denied.
- The same suite now checks `business_memories`: owner create/delete succeeds while a different user cannot read/delete.
- `src/lib/__tests__/aiKeyStorage.test.ts`: AI onboarding credential storage keys differ between Firebase users.
- `src/lib/__tests__/byok-regression.test.ts`: primary BYOK lookup and ElevenLabs key lookup do not expose one user's key after switching the mocked Firebase UID.
- `src/pages/__tests__/AuthActionPage.test.tsx` and `src/integrations/firebase/auth.test.ts` were present from the preceding auth-redesign task.

## Results after implementation

Fill this table only from command output after the final code changes; do not interpret skipped emulator tests as passes.

| Check | Exact command | Exit/result | Notes |
|---|---|---|---|
| Frontend TypeScript | `npm run typecheck` | PASS (exit 0) | Uses `tsc --noEmit -p tsconfig.app.json`. |
| Unit tests | `npm test` | PASS (exit 0): 34 files passed, 1 skipped; 169 tests passed, 8 skipped. | The emulator-dependent rules test file and tests were skipped; not counted as verified rules behavior. |
| Lint | `npm run lint` | PASS (exit 0): 0 errors, 160 warnings. | Warnings remain, including hook-dependency and fast-refresh warnings. |
| Production build | `npm run build` | PASS (exit 0); prerender completed. | `dist` contains 0 `.map` files. Vite reports large chunk and mixed static/dynamic import warnings. |
| Cloud Functions | `npm --prefix functions run build` | PASS (exit 0). | Local Node is 26.7.0 while declared Functions runtime is Node 20; run again under Node 20 in CI/release environment. |
| Firestore rules | Emulator suite | NOT VERIFIED | Java is unavailable locally, so the emulator suite could not run. |
| Browser journeys | Manual/browser evidence | Not verified | No test Firebase project/account was configured. |

## Security outcomes and limits

- No production account deletion or production data mutation occurred.
- Security-rule tests are source additions only until the emulator suite completes.
- The account deletion Function has no emulator/integration test yet. It must be tested against a disposable Firebase project and disposable account before release; never use a real user's account as the test fixture. Cleanup queries the explicit app collection inventory using owner fields and removes payment receipt objects; external records and client-local databases are outside its scope.
- No production provider credentials, rate-limit behavior, App Check enforcement, or Firebase Console settings were exercised.
