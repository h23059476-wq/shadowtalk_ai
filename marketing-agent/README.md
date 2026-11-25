# ShadowTalk Autonomous Product Marketing Agent

A self-hosted, $0–10/month content pipeline: one keyword in a Google Sheet →
an SEO blog post committed to this repo (auto-deployed), a 25-second vertical
short rendered with free TTS + ffmpeg, and social copy queued via webhook.
No SaaS subscriptions anywhere in the chain.

```
Content_Queue (Sheets) ──▶ gemini-2.5-flash ──▶ ┬─ content/blog/<slug>.md  → GitHub → CI deploy → /blog
                                                ├─ generate_short.py      → output/<slug>.mp4 (vertical short)
                                                └─ Postiz webhook         → LinkedIn + X posts
```

## Components

| File | What it does |
|---|---|
| `n8n-marketing-workflow.json` | Importable n8n workflow: daily 09:00 trigger → Google Sheets queue → Gemini (structured JSON output) → parse/validate → blog commit + video render + social distribution → mark row Published |
| `generate_short.py` | Python: edge-tts voiceover → exact per-line timestamps → libass captions on dark box → ffmpeg loop/trim/scale of `assets/app_demo.mp4` → `output/<slug>.mp4` (1080×1920, H.264/AAC, faststart) |
| `requirements.txt` | `edge-tts` (ffmpeg is a system package, see below) |
| `assets/app_demo.mp4` | Your vertical screen recording. If missing, the script auto-generates a placeholder gradient so the pipeline never dead-ends — replace it with real footage for production |
| `output/` | Rendered shorts land here |
| `.env.example` | The three secrets the pipeline needs |

## 1. One-time setup checklist

- [ ] **ffmpeg** installed on the n8n host and on your PATH (`ffmpeg -version`):
      Linux `sudo apt install ffmpeg` · macOS `brew install ffmpeg` · Windows `winget install Gyan.FFmpeg`
- [ ] **Python 3.9+** on the n8n host, then `pip install -r marketing-agent/requirements.txt`
- [ ] **Repo mounted where n8n runs it**: the Execute Command node runs from the
      n8n process working directory. Mount the repo at `/data/shadowtalk_ai`
      (docker-compose: `- ./:/data/shadowtalk_ai`) and either set n8n's working
      dir there or adjust the `marketing-agent/generate_short.py` prefix in the
      "Render Short Video" node command.
- [ ] **Gemini API key**: create at [aistudio.google.com](https://aistudio.google.com) → API key (free tier is enough for one article/day).
- [ ] **GitHub token**: fine-grained PAT with **Contents: Read & Write** on
      `shadowtalk_ai` only (stored as an n8n credential, never in env).
- [ ] **Postiz** (self-hosted): add a **Webhook** channel integration and copy
      its URL. Buffer/Zapier/Make webhooks work too — the payload is plain JSON.

## 2. Google Sheet — exact headers

Create a spreadsheet, name the **first sheet/tab** `Content_Queue`, and put
these headers in row 1 (spelling matters — the workflow matches them):

| Keyword | Target_Audience | Status | Blog_Slug | Published_Date |
|---|---|---|---|---|

Add one row per idea, e.g.:

| Keyword | Target_Audience | Status | Blog_Slug | Published_Date |
|---|---|---|---|---|
| how to keep AI chats private | Privacy-conscious professionals | Pending | | |
| offline AI chat for travel | Frequent flyers, students | Pending | | |

Copy the sheet ID from the URL (`docs.google.com/spreadsheets/d/<THIS_ID>/edit`)
— you'll paste it into both Google Sheets nodes after import.

## 3. Import + credential mapping (n8n)

1. n8n → Workflows → **Import from File** → select `n8n-marketing-workflow.json`.
2. Open **Get Next Keyword** and **Mark Published** (both Google Sheets nodes):
   - Create/select a **Google Sheets OAuth2** credential;
   - Replace `PASTE_YOUR_GOOGLE_SHEET_ID_HERE` in *Document ID* with your sheet ID (By URL also works).
3. Open **Commit Blog Post** (GitHub node): create a **GitHub API** credential
   (`GITHUB_TOKEN`) and select it. Owner/repo are pre-filled — adjust if you fork.
4. Open **Gemini Content Engine**: nothing to map — it reads `GEMINI_API_KEY`
   from the n8n process environment (`$env`). Set it where n8n runs
   (docker-compose `environment:` / your `.env`), or swap the header value for a
   Header Auth credential if you prefer secrets in the credential store.
5. Open **Postiz Social Post**: `POSTIZ_WEBHOOK_URL` is also read from `$env`.
   Alternative: paste your webhook URL literally.
6. The two grey nodes — **X / Twitter API (placeholder)** and
   **LinkedIn API (placeholder)** — are intentionally disabled. Prefer native
   APIs over Postiz? Toggle a node active, attach its credential, and wire its
   output (drag from the output dot) to wherever you want execution to continue.
7. Save, then **Test Workflow** (or wait for the 09:00 daily trigger).

> **Why the 6-minute Wait?** Branch C (social) waits ~6 minutes after the blog
> commit so GitHub Actions can finish deploying the new post to
> shadowtalk-ai.com/blog before the social copy points at it.

## 4. End-to-end test with one sample keyword

1. Add this row to `Content_Queue`:
   `how to keep AI chats private` / `Privacy-conscious professionals` / `Pending`
2. In n8n, open the workflow → **Execute Workflow**.
3. Expected result per stage:
   - **Parse Gemini JSON** output shows `slug`, `seo_title`, `meta_description`,
     `markdown_article` (1,000+ words), `linkedin_post`, `x_thread_hook`,
     `video_script_lines` (5 strings).
   - **Commit Blog Post** creates `content/blog/<slug>.md` on `main`
     → the repo's CI builds and deploys → the post appears on
     `https://www.shadowtalk-ai.com/blog/<slug>` within ~3–5 minutes
     (sitemap + prerender pick it up automatically).
   - **Render Short Video** produces `marketing-agent/output/<slug>.mp4`
     (1080×1920). Local test without n8n:
     ```bash
     pip install -r marketing-agent/requirements.txt
     python marketing-agent/generate_short.py \
       --slug test-short \
       --lines '["Your AI chats are not as private as you think.","Here is the fix in four steps.","Step one: skip the account.","Step two: bring your own API key.","ShadowTalk does all four — free."]'
     ```
   - **Postiz Social Post** delivers the JSON payload (content, link, platforms,
     x_thread) to your webhook → posts appear on LinkedIn/X.
   - **Mark Published** sets the row to `Status=Published`, `Blog_Slug=<slug>`,
     `Published_Date=<today>` — so tomorrow's run picks the *next* Pending row.
4. Roll back the test row if you don't want it published (or keep it — it's the
   sample post already committed in `content/blog/`).

## 5. How the blog integration works (no server needed)

The site is a Vite SPA on Firebase Hosting, so posts are bundled at build time:

- `src/lib/blog.ts` reads every `content/blog/*.md` via `import.meta.glob`
  (frontmatter parsed in-code — the frontmatter keys the pipeline writes are
  `slug`, `title`, `description`, `date`, `keyword`, `audience`).
- `/blog` (index) and `/blog/:slug` (reader) are real routes with per-post
  `<title>`, meta description, canonical and **BlogPosting** JSON-LD.
- `scripts/generate-sitemap.mjs` scans `content/blog/` → every post lands in
  `sitemap.xml` on the next build; `prerender.cjs` prerenders each post so
  crawlers and link-preview scrapers see full HTML.
- Contract tests in `src/lib/__tests__/seoGrowth.test.ts` keep sitemap,
  prerender, routes and footer in sync — a broken pipeline commit fails CI
  instead of shipping a broken page.

So: the GitHub commit **is** the publish button. Deploy happens on merge to
`main` via the existing Firebase Hosting workflow.

## 6. Cost breakdown ($0–10/month)

| Component | Cost |
|---|---|
| n8n (self-hosted, Docker) | $0 |
| Google Sheets | $0 (consumer account) |
| Gemini 2.5 Flash | $0 free tier (≈1 article/day); ~$0.15–0.40/article if you exceed it |
| edge-tts (Microsoft neural voices) | $0 |
| ffmpeg | $0 |
| GitHub repo + Actions deploy | $0 (public repo / free minutes) |
| Postiz (self-hosted) | $0 |
| **Worst case** | **< $10/month** even with paid Gemini usage |

## 7. Troubleshooting

| Symptom | Fix |
|---|---|
| `Gemini returned no text` | Check `GEMINI_API_KEY` is set in the n8n process env and the key has quota; check the node's `finishReason` detail |
| Video node fails with `ffmpeg/ffprobe not found` | Install ffmpeg on the n8n host; on Docker also mount the repo path used by the command |
| Video renders but no captions | Your ffmpeg build lacks libass — use the `ffmpeg` full build (Debian `ffmpeg`, Gyan Windows build) |
| TTS error `edge-tts failed` | edge-tts needs one-time network access to `speech.platform.bing.com`; check firewall/egress |
| Post published but 404 on the blog link | CI deploy still running — check the Actions run; the Wait node can be raised from 6 to 10 minutes |
| Google Sheets node can't find the tab | The first sheet must be named exactly `Content_Queue` (mode: By Name) |
