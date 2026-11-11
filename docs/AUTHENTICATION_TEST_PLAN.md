# Authentication test plan

Run `npm test` for the application suite. Adapter tests cover generic errors and same-origin callback URLs. `src/pages/__tests__/AuthActionPage.test.tsx` covers password reset and email verification actions.

Run Firestore rule tests with the Emulator available:

```powershell
firebase emulators:exec --only firestore --project demo-shadowtalk-auth-rules "npm test -- src/integrations/firebase/firestore.rules.test.ts"
```

These tests cover private profile reads, sanitized public profile writes, and role restrictions. They skip when `FIRESTORE_EMULATOR_HOST` is unset. This environment could not launch the Emulator because Java is unavailable; install/configure Java and rerun before relying on those assertions.

Run `npm run lint`, `npm run build`, and `npm --prefix functions run build` before release. Record warnings and failures separately from pass/fail.

In a non-production Firebase project, verify registration and non-blocking verification; resend and status refresh; neutral reset responses for known and unknown emails; valid, expired, reused, and malformed reset codes; verification completion; configured Google and Apple redirects; admin access; private profile isolation; and sanitized public profile access.

Attach output and the Firebase environment to release records. Demo-project rule tests do not prove production Console configuration. Do not exercise deletion with real accounts or production data until retention and recovery expectations are decided.
