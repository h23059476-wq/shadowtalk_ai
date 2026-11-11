# ShadowTalk-AI Deployment Runbook

## Pre-Deployment

1. `git pull origin main`
2. `npm install` (or `bun install`)
3. `npm run build` — verify pass
4. `npx tsc --noEmit` — verify zero errors
5. `npx vitest run` — verify 169+ tests pass

## Deployment

```bash
firebase deploy --only hosting
```

If Firestore rules changed:
```bash
firebase deploy --only firestore:rules
```

If Cloud Functions changed:
```bash
firebase deploy --only functions
```

## Post-Deployment Smoke Tests

1. Visit `https://www.shadowtalk-ai.com` — home page loads
2. Click "Sign Up" — onboarding wizard appears
3. Complete BYOK setup with a test key — success state appears
4. Send a chat message — response streams
5. Type `/` — slash command menu appears
6. Upload a PDF — text extracted, question answered
7. Visit `/pricing` — shows BYOK-only (no Pro/Premium/Elite tiers)
8. Visit `/robots.txt` — shows OAI-SearchBot rules
9. Visit `/llms.txt` — shows BYOK pricing
10. Visit `/sitemap.xml` — valid XML

## Rollback

```bash
git revert HEAD
npm run build
firebase deploy --only hosting
```

## Known Issues

- Sitemap lastmod dates are stale (all 2026-08-13) — not a blocker
- Google-Extended allows AI training — owner decision needed
- Prerendering requires Puppeteer/Chrome on the build machine
