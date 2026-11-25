# ShadowTalk video generator (Remotion)

The original ShadowTalk brand video engine — the same Remotion project and
brand system that produced the channel trailer and the landing-page hero
loop — vendored here as the marketing pipeline's short-form generator.

- **Composition**: `CampaignShort` — 1080×1920 @30fps, 30s, H.264 + AAC.
  Five animated typographic scenes driven by the campaign's
  `video_script_lines` (hook first, CTA last): typewriter hook → three
  numbered insight cards → gradient CTA → end card (logo, wordmark, URL).
  Colors, fonts (Sora / Hanken Grotesk / JetBrains Mono) and the logo mark
  are the site's exact tokens.
- **Audio**: `public/music-bed.mp3` — committed 30s synth bed (pad, sub,
  ticks, arp, riser into the 18.0s impact) from the same generator family
  as the trailer. No TTS, no microphone, no ffmpeg post-mux.

## One-time setup

```bash
cd marketing-agent/video
npm ci
npx remotion browser ensure   # pins headless Chromium into node_modules/.remotion/
```

## Render (what the n8n "Render Short Video" node runs)

```bash
node marketing-agent/video/render_short.mjs \
  --slug my-post-slug \
  --lines '["hook line","point one","point two","point three","call to action"]'
```

Output: `../output/<slug>.mp4`. Optional env `CAMPAIGN_KEYWORD` shows the
source keyword as a small chip on the hook scene.

## Preview / develop

```bash
npm run still    # poster frame at 4s
npm run render   # renders out/test.mp4 with the default props
```

All scenes are deterministic (seeded PRNG, no wall-clock) — every render of
the same props is frame-identical.
