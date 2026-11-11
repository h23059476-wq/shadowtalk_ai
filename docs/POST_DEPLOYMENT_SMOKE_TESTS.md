# Post-Deployment Smoke Tests

| # | Test | Expected Result | Status |
|---|---|---|---|
| 1 | Home page loads | Landing page with hero + nav | ☐ |
| 2 | Sign Up button works | Redirects to /auth | ☐ |
| 3 | BYOK onboarding wizard | 6-step wizard appears | ☐ |
| 4 | Chat message sends | Response streams from BYOK provider | ☐ |
| 5 | Slash commands | Type `/` → menu appears | ☐ |
| 6 | PDF upload | Text extracted, question answered | ☐ |
| 7 | Image generation | `/image` command generates image | ☐ |
| 8 | Pricing page | Shows BYOK-only (no tiers) | ☐ |
| 9 | robots.txt | Contains OAI-SearchBot rules | ☐ |
| 10 | llms.txt | Shows BYOK pricing | ☐ |
| 11 | sitemap.xml | Valid XML, no errors | ☐ |
| 12 | /chatbot requires auth | Redirects to /auth if not logged in | ☐ |
| 13 | /admin requires admin role | Shows "Access denied" for non-admins | ☐ |
| 14 | Settings → BYOK | Shows 16 providers, model auto-suggest | ☐ |
| 15 | Mobile layout | Responsive, no horizontal scroll | ☐ |
