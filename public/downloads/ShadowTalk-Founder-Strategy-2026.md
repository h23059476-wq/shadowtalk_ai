# ShadowTalk AI — Founder Strategy Brief

> **SUPERSEDED — Free Access Transition (November 2026).** ShadowTalk AI is now
> completely free to use: no subscriptions, no paid tiers, no checkout. This
> document is preserved as a historical record of the pre-transition monetization
> strategy. Current access model: free access with BYOK — bring your own AI
> provider API key; your provider may charge separately for API usage.

**Confidential — Founder Strategy Brief**

**From zero revenue to first paying customers — a practical playbook for Zain Ahmed**

| | |
|---|---|
| **Prepared by** | AI co-founder / strategy partner (Cursor Cloud Agent) |
| **Founder** | Zain Ahmed — Founder & Lead Architect, Karachi, Pakistan |
| **Date** | June 5, 2026 |
| **Live site** | https://www.shadowtalk-ai.com |
| **LinkedIn** | linkedin.com/in/zain-ahmed-917b6b3a6 |
| **Repo** | zain836/shadowtalk-ai-903ca615 |

---

## 1. Executive Summary

ShadowTalk AI is a privacy-first AI chat platform built by a 17-year-old founder in Pakistan. The product has real traction — roughly **1,100 visitors** and **3,100 page views** over 90 days, with strong engagement (11+ minute average session) — but **$0 revenue** because payments were never fully unblocked.

| Metric | Value |
|--------|-------|
| Traffic from United States | ~48% |
| Traffic from Pakistan | ~20% |
| Bounce rate | 63% (room to improve) |
| Pricing page views | 36 (under-visited) |

> **Core insight:** You do not need Stripe from Pakistan to make money today. JazzCash, Easypaisa, bank transfer, and USDT are live paths. Card checkout via Lemon Squeezy is optional for US users.

---

## 2. Founder Context

| Factor | Reality | Implication |
|--------|---------|-------------|
| Age & location | 17, Pakistan | Stripe/card merchant accounts are difficult or unavailable |
| Audience split | US 48%, PK 20% | Need two payment rails: local wallets + international |
| Product maturity | Large codebase, many features shipped | Problem is conversion & deploy, not building more features |
| LinkedIn | 480 connections, verified company | Trust channel for first PK customers + B2B leads |
| Revenue | $0 to date | Every hour on new features < every hour on checkout + outreach |

---

## 3. Product & Platform (What Exists)

### Core product

- Private AI chat with stealth mode, offline/local AI options, multi-provider support
- Mission Control, agent tools, templates, themes, video studio (Pro+)
- Full admin panel, growth analytics, referral system
- PWA + desktop paths; professional UI on Lovable deployment

### Growth engine — ShadowScale (built)

- Database migration + orchestrator/worker edge functions
- Admin Growth Command panel at `/admin`
- Referral notifications, share signals, video studio promo, cron automation

### Content & viral assets (built)

- Remotion package: 60s 9:16 viral short compositions with TTS voiceover
- In-app Shadow Video Studio at `/video-studio` (Pro+ gated)

---

## 4. The Payment Problem (and the Fix)

### Why revenue was $0

1. Stripe does not work for a 17-year-old founder in Pakistan
2. Pricing page sent users to checkout, but receipt flow was WhatsApp-only
3. Admin "verify" updated payment status but did **not** activate user plans
4. Migrations and edge functions were not deployed to production Supabase
5. Frontend changes sat on branches without Lovable redeploy

### Payment unblock — implemented (PR #105)

| Channel | Details | Price (Pro example) |
|---------|---------|---------------------|
| JazzCash | 03211798561 | Rs 1,499/mo |
| Easypaisa | 03211798561 | Rs 1,499/mo |
| Meezan Bank | IBAN PK08 MEZN 0099 1701 1274 9131 | Rs 1,499/mo |
| USDT (TRC20) | TKfKJ7ESFcnMTd2F1DkrvZ4buCWneAmHqz | ~$5/mo USD |
| Card (optional) | Lemon Squeezy when configured | $5–20/mo |

### End-to-end flow (now)

1. User visits `/pricing` or `/founder-access?plan=pro`
2. Sees payment details (bank, wallet, crypto) + PKR prices
3. Signs in → uploads receipt in-app via Payment Receipt Form
4. Admin verifies at `/admin` → Manual Payments
5. `verify-manual-payment` edge function activates `subscribers` plan + sends notification

### Deploy checklist (you must do on production)

1. Merge PR #105 and redeploy on Lovable
2. Run migration `20260611120000_payment_receipts_unblock.sql` in Supabase SQL editor
3. Deploy edge function: `supabase functions deploy verify-manual-payment`
4. Optional US cards: set Lemon Squeezy secrets + `VITE_LEMONSQUEEZY_VARIANT_*` env vars

---

## 5. Pricing Strategy

| Plan | USD | PKR (wallets) | Target buyer |
|------|-----|---------------|--------------|
| Pro | $5/mo | Rs 1,499 | Students, daily builders |
| Premium | $15/mo | Rs 3,999 | Power users, Mission Control |
| Elite | $20/mo | Rs 5,999 | Founders, agencies, teams |

**Default push:** Premium ($15) — best balance of value and revenue per customer. Pakistan: lead with Rs 3,999 and "unlimited + privacy." US: lead with privacy angle + optional card checkout.

---

## 6. Go-to-Market Playbook

### Week 1 — First 10 paying users

1. Deploy payment unblock (checklist above)
2. Post on LinkedIn (480 connections) — problem → product → JazzCash price → link
3. DM 20 people who engaged with your posts; offer Pro at Rs 1,499
4. WhatsApp status: screenshot of checkout + "DM for Pro"
5. Verify every receipt within 2 hours — speed builds trust

### LinkedIn post template

> Most AI tools remember everything you type. ShadowTalk doesn't.
>
> I built ShadowTalk AI — private AI chat for students and builders in Pakistan (and globally).
>
> Pro is Rs 1,499/month via JazzCash or Easypaisa. No Stripe needed.
>
> Try it: shadowtalk-ai.com/founder-access?plan=pro
>
> #AI #Pakistan #Startup #Privacy

### US traffic (48%)

- USDT and Wise/SWIFT already on checkout page
- Configure Lemon Squeezy for instant card activation (no manual verify)
- Content angle: privacy, local-first AI, "not another ChatGPT wrapper"

### Pakistan traffic (20%)

- JazzCash/Easypaisa is the conversion path — put number in every post
- WhatsApp follow-up after receipt submit
- University/college angle (Meritorious network) for student Pro tier

---

## 7. What NOT to Do Right Now

- **Don't build more features** before first payment — you have enough product
- **Don't chase Stripe** from Pakistan — use wallets + Lemon Squeezy for cards
- **Don't add heavy images/animations** to landing — hurts load time and SEO
- **Don't merge 50 PRs at once** — deploy payment PR, test, then iterate
- **Don't ignore /pricing** — only 36 views; every post should link to checkout

---

## 8. Technical Debt & Production Blockers

| Blocker | Impact | Fix |
|---------|--------|-----|
| Migrations not applied on live Supabase | Features break silently | Run SQL migrations in dashboard |
| Edge functions not deployed | Verify/receipt flow fails | Deploy via Supabase CLI or GitHub workflow |
| Lovable not redeployed | Users see old UI | Merge + trigger redeploy on gemini branch |
| SUPABASE_ACCESS_TOKEN missing | CI skips edge deploy | Add secret to GitHub Actions |
| Resend domain unverified | Feedback emails fail | Verify domain in Resend (lower priority) |

---

## 9. Key URLs & Admin Paths

| Purpose | URL |
|---------|-----|
| Checkout (Pro) | /founder-access?plan=pro |
| Checkout (Premium) | /founder-access?plan=premium |
| Pricing page | /pricing |
| Admin payments | /admin → Manual Payments |
| Growth Command | /admin → Growth Command |
| Video Studio | /video-studio (Pro+) |

---

## 10. 30-Day Revenue Targets

| Milestone | Target | How |
|-----------|--------|-----|
| Day 1–3 | Deploy + 1 test payment | You pay Rs 1,499 yourself, verify in admin |
| Week 1 | 3 paying users | LinkedIn + WhatsApp + college network |
| Week 2 | 10 paying users | ~Rs 15k–40k MRR depending on plan mix |
| Month 1 | 25 paying users | Referral loop + 1 viral short posted |

> **North star:** First Rs 1,499 hitting your JazzCash account from a stranger — not another feature shipped. Everything in this document exists to get you to that moment.

---

## 11. Conversation Log — Major Decisions

1. Accepted Pakistan-first payment rails (JazzCash, Easypaisa, bank, USDT) instead of waiting for Stripe
2. Built in-app receipt upload + admin verify → auto plan activation
3. Shipped ShadowScale growth engine for autonomous referrals and share signals
4. Built Remotion viral video pipeline + in-app Video Studio for content marketing
5. Identified deploy gap as root cause of "changes not showing" — merge + Lovable redeploy required
6. LinkedIn profile reviewed: verify badge, highlight ShadowTalk skills, point website to checkout
7. PR #105 opened: payment gateway unblock ready to merge

---

## 12. Next Actions (Priority Order)

- [ ] Merge PR #105 → redeploy Lovable
- [ ] Run payment migration on production Supabase
- [ ] Deploy `verify-manual-payment` edge function
- [ ] Test full flow: pay → submit receipt → admin verify → Pro active
- [ ] Post LinkedIn announcement with checkout link
- [ ] Set Lemon Squeezy variants for US card checkout (optional)
- [ ] Record + post 1 viral short from Video Studio / Remotion

---

*ShadowTalk AI — Founder Strategy Brief · June 2026 · Prepared for Zain Ahmed*

*This document reflects strategy discussions between founder and AI co-founder. Not financial or legal advice.*
