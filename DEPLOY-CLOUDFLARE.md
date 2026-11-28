# Deploy ShadowTalk to Cloudflare Pages — $0, full-feature runbook

> **Status 2026-11-29:** Firebase Hosting (`shadowtalk-ai-7a513.web.app` /
> `.firebaseapp.com`) returns **HTTP 509 — Bandwidth Quota Exceeded** on every
> path (Spark plan's 10 GB/month is used up). The deployment itself is intact;
> Firebase refuses to serve until the plan is upgraded (Blaze) or the monthly
> quota resets (start of the next month). This runbook moves the frontend to
> Cloudflare Pages so ShadowTalk runs again immediately, at $0, without
> touching anything else.

## 1. Why this works — what actually runs where

ShadowTalk is a static SPA + domain-independent backend. Every moving part was
audited on 2026-11-29:

| Component | Where it runs | Independent of Firebase Hosting? |
|---|---|---|
| Frontend (Vite SPA, PWA, prerendered SEO routes) | static `dist/` — now Cloudflare Pages | yes (this migration) |
| Chat backend (branded email endpoints) | Cloudflare Worker `shadowtalk-email.z67061935.workers.dev` (default since 2026-11-24 in `src/integrations/firebase/app.ts`) | yes — live-probed: reflects **any** Origin (`access-control-allow-origin: <echo>`, `vary: Origin`) |
| Email/password auth | Identity Toolkit REST (`identitytoolkit.googleapis.com`) | yes — live-probed: alive |
| Google sign-in popup / OAuth handler | `shadowtalk-ai-7a513.firebaseapp.com/__/auth/handler` | **yes — live-probed HTTP 200**: the quota block does not touch `__/auth/*` |
| Firestore + Storage | client SDKs → `googleapis.com`, access governed by `firestore.rules` / `storage.rules` | yes |
| On-device WebLLM weights + WASMs | HF CDN + orphan `weights` branch on raw.githubusercontent.com (`MODEL_MIRROR_SETUP.md`) | yes |
| Shared-mode server chat (`/chat`) | deliberate 404 contract on the Worker (`app.ts` header comment); chat today = on-device + BYOK | unchanged by this migration |
| Dead `cloudfunctions.net` endpoints | already 404 in production, already bypassed | irrelevant |
| Capacitor desktop/mobile | bundles `dist/` at build time | yes |

SEO/canonical URLs in `index.html` already point at `www.shadowtalk-ai.com`
(not `web.app`), so nothing breaks and the custom domain (section 4) makes
them true.

## 2. Deploy the frontend (exact clicks)

1. Cloudflare dashboard → **Workers & Pages → Create → Pages → Connect to Git**.
2. Authorize GitHub, pick **`h23059476-wq/shadowtalk_ai`**.
3. Build configuration:
   - **Framework preset:** `Vite` (or None — same result)
   - **Build command:** `npm run build`
   - **Build output directory:** `dist`
4. **Environment variables (Production)** — add both:
   - `NODE_VERSION` = `20`  (repo also ships `.nvmrc` = 20)
   - `PUPPETEER_SKIP_DOWNLOAD` = `true`
     (keeps `npm ci` from pulling ~170 MB of Chrome in the CF build sandbox;
     `prerender.cjs` is designed to skip gracefully — exit 0, build continues)
5. **Save and Deploy.** First build takes a few minutes. Every push to `main`
   now deploys automatically; PRs get preview URLs.

`npm run build` = `prebuild` (copies onnxruntime WASMs) → `vite build` →
sitemap → optional puppeteer prerender of `/blog/<slug>` routes. The
`public/_redirects` and `public/_headers` files ship into `dist/` and are
honored by Cloudflare Pages automatically.

## 3. Authorize the new domain in Firebase Auth (the #1 gotcha)

Without this step Google sign-in from the Pages origin throws
`auth/unauthorized-domain`.

1. Firebase console → project **shadowtalk-ai-7a513** → **Authentication →
   Settings → Authorized domains → Add domain**.
2. Add `<your-project>.pages.dev` (find the exact hostname on the Pages
   success screen).
3. After section 4, add `shadowtalk-ai.com` and `www.shadowtalk-ai.com` too.

Email/password auth does **not** need this (REST-based), but add the domain
anyway for popup flows.

## 4. Custom domain (restores `www.shadowtalk-ai.com`)

1. Cloudflare Pages project → **Custom domains → Set up a custom domain**.
2. Add `shadowtalk-ai.com` and `www.shadowtalk-ai.com`. If the domain's DNS is
   already on Cloudflare, records are suggested automatically; otherwise add
   the shown CNAME at the registrar.
3. SSL is issued automatically. `index.html`'s canonical/OG URLs become true
   again with zero code changes.

## 5. If your Firebase API key is referrer-restricted

The web API key (`AIzaSyAOKV…`, public by design) may have **HTTP referrer
restrictions** in Google Cloud Console → APIs & Services → Credentials. If so,
add `https://<project>.pages.dev/*` (and later the custom domains) to the
allowed referrers. If restrictions were never set, skip this.

## 6. Verify after the first deploy

Replace `SITE` with the Pages URL:

```bash
SITE=https://<project>.pages.dev
curl -sI $SITE/ | rg "HTTP|cross-origin"          # 200 + COOP/COEP present
curl -sI $SITE/pricing | rg "HTTP"                # deep link → 200 (SPA fallback)
curl -s $SITE/ | head -c 300                      # prerendered/HTML shell renders
curl -sI $SITE/sw.js | rg "HTTP|cache-control"    # 200 + no-cache
curl -sI $SITE/fonts/$(ls public/fonts | head -1) | rg "HTTP|cache-control"
```

Then in a browser on the new origin:

1. Sign up / sign in (email + Google).
2. Send a chat message with BYOK **and** with the on-device model (Offline AI).
3. Open Computer Mode (WebContainer needs COOP/COEP — check DevTools console).
4. Confirm Firestore persistence: go offline (DevTools → Network → Offline),
   send a message, reload, verify it flushed after reconnect.

## 7. Known notes (pre-audited, no action needed)

- **Clickjacking guard** (`SecurityProvider.tsx`): only activates when the app
  is *framed*; direct visits on `pages.dev` return early. If you ever iframe
  the app from a new host, add that host to `isAllowedHost()`.
- **Firebase Functions** (`functions/`) still carry a hardcoded origin list at
  `functions/src/index.ts:932`, but the functions are dead in production — the
  Worker replaced them. No change required.
- **`scripts/upload-weights-*.sh`** probe CORS with a `web.app` Origin header;
  the mirror serves `access-control-allow-origin: *`, so the scripts stay
  correct from any origin.
- **Bandwidth self-defense**: the heavy assets that could re-burn a quota do
  not live on Firebase Hosting (weights on HF/GitHub raw, ONNX package on Hugging
  Face). `dist/` is ~few MB per cold visitor; `/assets/*` is immutable-cached.

## 8. What happens to Firebase Hosting

Nothing needs it. Options, pick freely:

- **Leave it** — it starts serving again after the quota reset; it becomes a
  stale mirror. To avoid split-canonical confusion, keep `index.html`
  canonical on `shadowtalk-ai.com` (already true) and consider the Pages
  deployment primary.
- **Upgrade to Blaze** if you want it live immediately as a secondary domain.
- **Delete the Hosting site** once Pages + custom domain are verified.
