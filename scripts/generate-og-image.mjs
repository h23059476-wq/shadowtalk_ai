/**
 * Generates public/og-image.png (1200x630) — the social/AI-scraper preview card.
 *
 * Why this exists: SVG og:image (the previous default) is not rendered by
 * LinkedIn, X, Facebook, Slack, ChatGPT, Perplexity or any other scraper —
 * they require PNG/JPEG. This script renders a branded card with puppeteer
 * and saves it as PNG. Run manually: `node scripts/generate-og-image.mjs`
 *
 * The card text mirrors the SSOT brand claim in src/lib/brand.ts — if the
 * claim changes, regenerate.
 */
import puppeteer from "puppeteer";
import { fileURLToPath } from "url";
import path from "path";
import fs from "fs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(root, "public", "og-image.png");

const CLAIM_1 = "The first AI chat in a browser that";
const CLAIM_2 = "works offline — and syncs";
const CLAIM_3 = "when you're back.";

const html = `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body { width: 1200px; height: 630px; overflow: hidden; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    background: linear-gradient(135deg, #050508 0%, #0f172a 55%, #0b1220 100%);
    color: #f8fafc;
    position: relative;
  }
  /* ambient glows, matching the landing bands */
  .orb { position: absolute; border-radius: 9999px; filter: blur(90px); }
  .orb-a { width: 560px; height: 560px; left: -160px; top: -220px; background: rgba(99,102,241,0.28); }
  .orb-b { width: 520px; height: 520px; right: -180px; bottom: -260px; background: rgba(6,182,212,0.22); }
  .grid-line { position: absolute; inset: 0;
    background-image: linear-gradient(rgba(148,163,184,0.05) 1px, transparent 1px),
                      linear-gradient(90deg, rgba(148,163,184,0.05) 1px, transparent 1px);
    background-size: 64px 64px; }
  .wrap { position: relative; z-index: 2; height: 100%; padding: 64px 72px; display: flex; flex-direction: column; }
  .brandrow { display: flex; align-items: center; gap: 18px; }
  .mark { width: 56px; height: 56px; border-radius: 16px;
    background: linear-gradient(135deg, #6366f1, #06b6d4);
    display: flex; align-items: center; justify-content: center; }
  .mark svg { width: 34px; height: 34px; }
  .brandname { font-size: 40px; font-weight: 800; letter-spacing: -0.5px; }
  .badge { margin-left: auto; font-size: 20px; font-weight: 600; color: #a5b4fc;
    border: 1px solid rgba(129,140,248,0.45); border-radius: 9999px; padding: 10px 22px;
    background: rgba(99,102,241,0.12); white-space: nowrap; }
  h1 { margin-top: 58px; font-size: 66px; line-height: 1.14; font-weight: 800; letter-spacing: -1.5px; max-width: 1020px; }
  .grad { background: linear-gradient(90deg, #818cf8, #22d3ee);
    -webkit-background-clip: text; background-clip: text; color: transparent; }
  .chips { margin-top: 44px; display: flex; gap: 14px; flex-wrap: wrap; }
  .chip { font-size: 22px; font-weight: 600; color: #cbd5e1;
    border: 1px solid rgba(148,163,184,0.28); background: rgba(15,23,42,0.6);
    border-radius: 9999px; padding: 12px 24px; }
  .chip b { color: #7dd3fc; font-weight: 700; }
  .url { margin-top: auto; font-size: 24px; color: #94a3b8; letter-spacing: 0.2px; }
  .url b { color: #e2e8f0; }
</style>
</head>
<body>
  <div class="orb orb-a"></div>
  <div class="orb orb-b"></div>
  <div class="grid-line"></div>
  <div class="wrap">
    <div class="brandrow">
      <div class="mark">
        <svg viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M12 8V4H8"/><rect width="16" height="12" x="4" y="8" rx="2"/><path d="M2 14h2"/><path d="M20 14h2"/><path d="M15 13v2"/><path d="M9 13v2"/>
        </svg>
      </div>
      <div class="brandname">ShadowTalk AI</div>
      <div class="badge">Free to use · No card</div>
    </div>
    <h1>${CLAIM_1} <span class="grad">${CLAIM_2}<br>${CLAIM_3}</span></h1>
    <div class="chips">
      <div class="chip"><b>Offline</b> on-device WebGPU AI</div>
      <div class="chip"><b>Syncs</b> when you're back</div>
      <div class="chip"><b>E2EE</b> Private Mode</div>
      <div class="chip"><b>BYOK</b> 16+ providers</div>
    </div>
    <div class="url">shadowtalk-ai.com — <b>think AI, think ShadowTalk</b></div>
  </div>
</body>
</html>`;

const browser = await puppeteer.launch({
  headless: "new",
  args: ["--no-sandbox", "--disable-setuid-sandbox"],
});
try {
  const page = await browser.newPage();
  await page.setViewport({ width: 1200, height: 630, deviceScaleFactor: 1 });
  await page.setContent(html, { waitUntil: "networkidle0" });
  await page.screenshot({ path: OUT, type: "png", clip: { x: 0, y: 0, width: 1200, height: 630 } });
  const size = fs.statSync(OUT).size;
  console.log(`og-image.png written: ${(size / 1024).toFixed(1)} KB`);
  if (size < 10 * 1024) {
    console.error("ERROR: og-image.png suspiciously small — refusing to ship a blank card");
    process.exit(1);
  }
} finally {
  await browser.close();
}
