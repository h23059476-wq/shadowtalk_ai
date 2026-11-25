#!/usr/bin/env node
/**
 * ShadowTalk marketing-agent — render one vertical short per campaign package
 * with the original Remotion brand engine (composition "CampaignShort").
 *
 * This replaces the retired edge-tts/ffmpeg generate_short.py as Branch B of
 * the n8n workflow. The n8n "Render Short Video" Execute Command node calls:
 *
 *   node marketing-agent/video/render_short.mjs \
 *     --slug my-post-slug \
 *     --lines '["hook","point","point","point","cta"]'
 *
 * Requirements on the n8n host: Node 18+, `npm ci` inside this folder once
 * (and `npx remotion browser ensure` once for the headless Chromium).
 * Output: marketing-agent/output/<slug>.mp4 (1080x1920, H.264 + AAC music bed).
 */
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const VIDEO_DIR = dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = resolve(VIDEO_DIR, "..", "output");
const MAX_LINE_CHARS = 110;

// ------------------------------------------------------------------ args --
function parseArgs(argv) {
  const args = { slug: "", lines: null };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--slug") args.slug = argv[++i] ?? "";
    else if (argv[i] === "--lines") args.lines = argv[++i] ?? null;
  }
  return args;
}

function die(msg, code = 1) {
  console.error(`ERROR: ${msg}`);
  process.exit(code);
}

const { slug, lines: linesRaw } = parseArgs(process.argv.slice(2));
if (!slug || /[\\/]/.test(slug) || slug.includes("..")) {
  die(`invalid --slug: ${JSON.stringify(slug)}`);
}
if (linesRaw == null) die("--lines is required (JSON array of spoken lines)");

let parsed;
try {
  parsed = JSON.parse(linesRaw);
} catch (e) {
  die(`--lines is not valid JSON: ${e.message}`);
}
if (typeof parsed === "string") parsed = parsed.split("\n").map((s) => s.trim()).filter(Boolean);
if (!Array.isArray(parsed)) die("--lines must be a JSON array of strings");
let lines = parsed.map((s) => String(s).trim()).filter(Boolean).slice(0, 5);
lines = lines.map((s) => (s.length > MAX_LINE_CHARS ? s.slice(0, MAX_LINE_CHARS - 1) + "\u2026" : s));
if (lines.length < 3) die("need at least 3 non-empty spoken lines (campaign contract is 5)");
while (lines.length < 5) lines.push(lines[lines.length - 1]);

console.log(`[render_short] slug=${slug} lines=${lines.length}`);
console.log("[render_short] 1/2 preparing props…");

const props = {
  lines,
  url: "shadowtalk-ai.com",
  keyword: process.env.CAMPAIGN_KEYWORD || "",
};

const tmp = mkdtempSync(join(tmpdir(), "st_short_"));
const propsPath = join(tmp, "props.json");
writeFileSync(propsPath, JSON.stringify(props));

const outPath = join(OUTPUT_DIR, `${slug}.mp4`);
mkdirSync(OUTPUT_DIR, { recursive: true });

const npx = process.platform === "win32" ? "npx.cmd" : "npx";
console.log("[render_short] 2/2 rendering CampaignShort via Remotion (Chromium)…");
const result = spawnSync(
  npx,
  ["remotion", "render", "CampaignShort", outPath, "--props", propsPath, "--log", "error"],
  { cwd: VIDEO_DIR, stdio: "inherit", timeout: 15 * 60 * 1000 },
);

rmSync(tmp, { recursive: true, force: true });

if (result.error) die(`failed to spawn npx: ${result.error.message}`);
if (result.status !== 0) die(`remotion render exited with code ${result.status}`);
if (!existsSync(outPath) || statSize(outPath) === 0) die("render produced no output file");

const mb = (statSize(outPath) / (1024 * 1024)).toFixed(1);
console.log(`[render_short] DONE: ${outPath} (${mb} MB, 1080x1920, 30s)`);

function statSize(p) {
  try {
    return statSync(p).size;
  } catch {
    return 0;
  }
}
