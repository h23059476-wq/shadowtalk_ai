# On-device model mirror — $0 resilience setup

> **Status: the built-in mirror is LIVE.** The two 0.5B starter twins are
> mirrored on the orphan **`weights` branch of this repo**
> (`models/<slug>/resolve/main/…`), served by raw.githubusercontent.com with
> CORS (`Access-Control-Allow-Origin: *`, verified in-browser) and
> byte-identical to the Hugging Face originals. `modelMirror.ts` falls back to
> it by default; `VITE_MODEL_MIRROR_URL_TEMPLATE` overrides it, and an invalid
> template (no `{slug}`) disables mirroring entirely. 1B/3B shards exceed
> raw.github's 100 MB/file cap, so those optional tiers stay HF-only. The
> branch is orphaned on purpose: `main` never carries the weights, so normal
> clones/pulls stay small. Re-upload/refresh with
> `scripts/upload-weights-branch.sh` (needs a PAT with contents:write here).

ShadowTalk's private-by-default chat downloads WebLLM weights (default starter:
Qwen2.5-0.5B-Instruct-q4f16_1-MLC, ~600MB) from the Hugging Face CDN and caches
them per-shard in the browser. If that CDN has a hiccup, the engine now retries
once from **your own mirror** — configured with one env var, costing $0.

## How it works

- `src/offline/modelMirror.ts` clones web-llm's `prebuiltAppConfig` and rewrites
  the `model` URL of every ShadowTalk registry model to your mirror. The WASM
  `model_lib` URLs are untouched (they live on raw.githubusercontent.com, not the
  HF CDN).
- `src/offline/LocalInferenceEngine.ts` retries from the mirror **once**, and
  only when the primary failure looks network-shaped (fetch/DNS/timeout…).
  GPU errors (device-lost etc.) are never retried — a different CDN cannot fix
  a broken device.
- Enable it by setting `VITE_MODEL_MIRROR_URL_TEMPLATE` (see `env.example`).
  Unset = mirror disabled, behavior unchanged.

The template **must contain `{slug}`**, replaced with the model repo slug
(e.g. `Qwen2.5-0.5B-Instruct-q4f16_1-MLC`).

## The URL rule (verified against web-llm 0.2.84 `cleanModelUrl`)

web-llm appends every file name flat against the model URL —
`<model-url>mlc-chat-config.json`, `<model-url>params_shard_N.bin`, … — after
one normalization:

- If the URL does **not** already contain `/resolve/`, it appends
  `resolve/main/` (the Hugging Face layout).
- If it **does** contain `/resolve/`, it is used verbatim.

Your mirror URL just has to serve the model's files at whatever prefix results.
Two recipes satisfy it:

## Recipe A — Cloudflare R2 public bucket (fits EVERY model, incl. the 3B tier)

R2 has no per-object size limit that matters here (shards are ≤1GB), the free
tier includes 10GB storage, and egress is free. A public bucket exposes an
`r2.dev` subdomain (rate-limited — acceptable for a fallback mirror; add a
custom domain to lift it).

1. Download the model's files from HF (config + tokenizer files + weight
   shards, no `.git`):
   ```
   mlc-chat-config.json  tokenizer.json  tokenizer_config.json  params_shard_*.bin
   ```
   For the starter model:
   `huggingface.co/mlc-ai/Qwen2.5-0.5B-Instruct-q4f16_1-MLC/resolve/main/`
2. Upload them preserving this directory shape:
   ```
   <bucket-root>/Qwen2.5-0.5B-Instruct-q4f16_1-MLC/resolve/main/mlc-chat-config.json
   <bucket-root>/Qwen2.5-0.5B-Instruct-q4f16_1-MLC/resolve/main/params_shard_1.bin
   ...
   ```
3. Template:
   ```
   VITE_MODEL_MIRROR_URL_TEMPLATE=https://pub-<id>.r2.dev/{slug}/resolve/main/
   ```

## Recipe B — GitHub Pages (free, directory-preserving, ≤1GB per repo)

GitHub Pages serves whatever directory structure you push — but a repo is
capped at 1GB, so this fits the starter (~600MB) and 1B (~880MB) tiers. For
the 3B tier use Recipe A. One repo per model keeps each under the limit.

> Why not GitHub **Releases**? Release assets are flat (asset names cannot
> contain `/`), and web-llm's URL normalization requires the
> `/resolve/<rev>/` infix (it appends `resolve/main/` itself when missing).
> A `…/releases/download/<tag>/` base can never satisfy that path shape.
> Pages (or any directory-preserving host) is the GitHub-sanctioned way.

1. Create a repo named `model-<slug>` (e.g. `model-Qwen2.5-0.5B-Instruct-q4f16_1-MLC`)
   and push the model files under `resolve/main/`:
   ```
   /resolve/main/mlc-chat-config.json
   /resolve/main/params_shard_*.bin
   ...
   ```
2. Enable Pages (Settings → Pages → deploy from branch) and verify:
   `curl -I https://<owner>.github.io/model-<slug>/resolve/main/mlc-chat-config.json`
3. Template:
   ```
   VITE_MODEL_MIRROR_URL_TEMPLATE=https://<owner>.github.io/model-{slug}/resolve/main/
   ```

## Checklist before relying on it

- [ ] `curl -I <mirror-url>mlc-chat-config.json` returns 200 on every model you
      mirror (including the q4f32 twins if you want full f32 fallback coverage).
- [ ] CORS: the response includes `access-control-allow-origin` usable from the
      ShadowTalk origin (Cloudflare Pages/R2 and GitHub release asset downloads
      both serve permissive CORS by default — verify once).
- [ ] Byte-identical files: mirror exactly what the HF repo publishes — the
      engine never verifies hashes across sources, so a corrupted mirror shard
      would surface as a load failure (and fall back to the primary behavior on
      the next attempt).
- [ ] `.env` / hosting env config sets `VITE_MODEL_MIRROR_URL_TEMPLATE` for the
      builds you want protected (Vite embeds it at build time; it is not a
      runtime secret and contains no credentials).
