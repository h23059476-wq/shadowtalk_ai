/**
 * PHYSICAL TEST E — full UI E2E of Tier 3 image generation producing a REAL
 * image in the REAL UI. This sandbox's datacenter IP has the anonymous
 * ZeroGPU quota exhausted, so the app is pointed (via the provider's
 * VITE_ZERO_GPU_SPACE_ID seam) at a free non-ZeroGPU Space
 * (Collov-Labs/Monetico) that accepts anonymous jobs. Everything else is the
 * exact production path: sign-in → /image → imageGen router →
 * zeroGpuSpaceProvider (@gradio/client) → watermark → encrypted IndexedDB
 * asset → rendered in the chat card.
 *
 * One-shot (the sandbox kills background processes between calls). Progress
 * is appended to /tmp/e2e-monetico-progress.log so evidence survives a kill.
 */
import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { chromium } from "playwright";

const REPO = "/home/z/my-project/shadowtalk_ai";
const BASE = "http://localhost:8080";
const SHOTS = "/home/z/my-project/download/zerogpu-ui-e2e-monetico";
const PROG = "/tmp/e2e-monetico-progress.log";
const SPACE = process.env.E2E_SPACE || "Collov-Labs/Monetico";
fs.mkdirSync(SHOTS, { recursive: true });
fs.writeFileSync(PROG, `=== run @ ${new Date().toISOString()} ===\n`);

const t0 = Date.now();
const log = (...a) => {
  const line = `[${((Date.now() - t0) / 1000).toFixed(1)}s] ${a.join(" ")}`;
  console.log(line);
  fs.appendFileSync(PROG, line + "\n");
};

// ── 1. dev server with the Space override ──────────────────────────────
log(`starting vite dev server (VITE_ZERO_GPU_SPACE_ID=${SPACE})…`);
const dev = spawn("npm", ["run", "dev"], {
  cwd: REPO,
  env: { ...process.env, VITE_ZERO_GPU_SPACE_ID: SPACE },
  stdio: ["ignore", "pipe", "pipe"],
});
let devLog = "";
dev.stdout.on("data", (d) => (devLog += d));
dev.stderr.on("data", (d) => (devLog += d));

let ready = false;
for (let i = 0; i < 40 && !ready; i++) {
  await new Promise((r) => setTimeout(r, 1000));
  try {
    const res = await fetch(BASE, { signal: AbortSignal.timeout(2000) });
    if (res.ok) ready = true;
  } catch {}
}
if (!ready) {
  fs.appendFileSync(PROG, "DEV LOG:\n" + devLog.slice(-2000));
  dev.kill("SIGKILL");
  throw new Error("vite dev server not ready in 40s");
}
log("dev server ready");

const browser = await chromium.launch({ headless: true, args: ["--no-sandbox"] });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.addInitScript(() => {
  try { sessionStorage.setItem("shadowtalk_onboarding_dismissed", "1"); } catch {}
});
const consoleLines = [];
page.on("console", (m) => consoleLines.push(`[${m.type()}] ${m.text()}`.slice(0, 400)));
page.on("pageerror", (e) => consoleLines.push(`[pageerror] ${String(e.message).slice(0, 400)}`));

const shot = (name) => page.screenshot({ path: path.join(SHOTS, `${name}.png`), fullPage: false }).catch(() => {});
const bodyText = async () => (await page.locator("body").innerText().catch(() => "")).slice(0, 8000);

try {
  // ── 2. sign in via the real form ──────────────────────────────────────
  const qa = JSON.parse(fs.readFileSync("/tmp/qa-session.json", "utf8"));
  log("goto /auth (form sign-in)…");
  await page.goto(`${BASE}/auth`, { waitUntil: "commit", timeout: 60_000 });
  const emailField = page.locator("#auth-email").first();
  await emailField.waitFor({ state: "visible", timeout: 90_000 });
  await page.fill("#auth-email", qa.email);
  await page.fill("#auth-password", qa.password);
  await page.waitForTimeout(400);
  await page.getByRole("button", { name: /sign in & enter workspace/i }).first().click({ timeout: 10_000 }).catch(() => {});
  let signedIn = false;
  for (let i = 0; i < 20; i++) {
    await page.waitForTimeout(2000);
    if (!(await page.locator("#auth-email").count().catch(() => 0))) { signedIn = true; break; }
  }
  if (!signedIn) {
    await shot("00-auth-failed");
    throw new Error("sign-in did not complete");
  }
  log("signed in as", qa.email.slice(0, 18) + "…");
  await page.waitForTimeout(4000);
  await shot("01-signed-in");

  // ── 3. chatbot page + /image command ─────────────────────────────────
  await page.goto(`${BASE}/chatbot`, { waitUntil: "commit", timeout: 60_000 });
  log("navigation committed — waiting for composer…");
  const composer = page.locator("textarea").first();
  await composer.waitFor({ state: "visible", timeout: 150_000 });
  await page.waitForTimeout(3000);
  await shot("02-chatbot");

  for (const re of [/^(Skip|Not now|Maybe later|Later|Continue|Get started|Got it)$/i]) {
    const btn = page.getByRole("button", { name: re }).first();
    if ((await btn.count().catch(() => 0)) > 0) {
      await btn.click({ timeout: 3000 }).catch(() => {});
      await page.waitForTimeout(1200);
      log("dismissed an overlay");
    }
  }

  await composer.fill("/image a photorealistic red fox sitting in a snowy pine forest at golden hour, shallow depth of field");
  await shot("03-prompt-typed");
  const sendBtn = page.getByRole("button", { name: "Send message" }).first();
  await sendBtn.click({ timeout: 10_000 });
  log("/image sent — watching the tool card for the live ZeroGPU lifecycle…");

  // ── 4. watch the full lifecycle (bounded ~10.5 min) ───────────────────
  const targets = [
    { re: /Connecting to the ZeroGPU/i, key: "connecting", seen: false, at: 0 },
    { re: /waiting for a free .* slot|Queued on|queue/i, key: "queued", seen: false, at: 0 },
    { re: /Generating image/i, key: "generating", seen: false, at: 0 },
    { re: /Fetching your image|Image ready/i, key: "fetching", seen: false, at: 0 },
    { re: /Generated on a free Hugging Face ZeroGPU Space|stored encrypted on this device/i, key: "card-final-zerogpu", seen: false, at: 0 },
    { re: /quota resets daily|exceeded your|switching to ShadowTalk's shared/i, key: "quota-or-fallback", seen: false, at: 0 },
    { re: /took too long|stopped responding|unavailable right now|failed/i, key: "error", seen: false, at: 0 },
  ];
  const events = [];
  let imageRendered = false;
  let renderedImageInfo = null;

  for (let i = 0; i < 320; i++) {
    await page.waitForTimeout(2000);
    const text = await bodyText();
    for (const t of targets) {
      if (!t.seen && t.re.test(text)) {
        t.seen = true;
        t.at = Math.round((Date.now() - t0) / 1000);
        events.push({ at: t.at, key: t.key });
        log(`CARD STATE: ${t.key}`);
        await shot(`04-${t.key}`);
      }
    }
    // Terminal check — a real rendered image in the DOM.
    const imgs = await page.evaluate(() =>
      Array.from(document.querySelectorAll("img"))
        .map((im) => ({ src: (im.src || "").slice(0, 100), w: im.naturalWidth, h: im.naturalHeight }))
        .filter((im) => im.w > 64 && im.h > 64 && /^(blob:|data:image)/.test(im.src)));
    if (imgs.length > 0) {
      imageRendered = true;
      renderedImageInfo = imgs[0];
      log(`RENDERED IMAGE in DOM: ${JSON.stringify(imgs[0])}`);
      await shot("05-image-rendered");
      break;
    }
    if (targets[6].seen && i > 30) { log("error state persisted — stopping watch"); break; }
    if (i % 20 === 0) { const tail = text.slice(-300).replace(/\n+/g, " | "); log(`tick ${i}: …${tail}`); await shot(`tick-${String(i).padStart(3, "0")}`); }
  }
  await page.waitForTimeout(2500);
  await shot("06-final");

  // ── 5. encrypted asset store evidence ────────────────────────────────
  const dbs = await page.evaluate(async () => {
    try { return (await indexedDB.databases()).map((d) => d.name); } catch { return []; }
  });
  const assetScan = await page.evaluate(async () => {
    try {
      const db = await new Promise((resolve, reject) => {
        const req = indexedDB.open("shadowtalk-image-assets");
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      });
      const stores = Array.from(db.objectStoreNames);
      const out = { exists: true, stores, counts: {}, sample: null };
      for (const s of stores) {
        out.counts[s] = await new Promise((resolve) => {
          const tx = db.transaction(s, "readonly");
          const r = tx.objectStore(s).count();
          r.onsuccess = () => resolve(r.result);
          r.onerror = () => resolve(-1);
        });
      }
      const first = stores[0];
      if (first) {
        out.sample = await new Promise((resolve) => {
          const tx = db.transaction(first, "readonly");
          const req2 = tx.objectStore(first).getAll();
          req2.onsuccess = () => {
            const rec = req2.result?.[0];
            if (!rec) return resolve(null);
            const meta = { ...rec };
            const buf = rec.blob ?? rec.data ?? rec.value;
            let bytes = null;
            if (buf instanceof ArrayBuffer) bytes = new Uint8Array(buf.slice(0, 4));
            else if (buf && typeof buf.byteLength === "number") bytes = null;
            delete meta.blob; delete meta.data; delete meta.value;
            resolve({
              fields: Object.keys(rec),
              meta,
              byteLength: buf && (buf.size ?? buf.byteLength ?? null),
              magic: bytes ? Array.from(bytes) : null,
            });
          };
          req2.onerror = () => resolve(null);
        });
      }
      db.close();
      return out;
    } catch (e) {
      return { exists: false, error: String(e).slice(0, 160) };
    }
  });

  const summary = {
    space: SPACE,
    url: page.url(),
    cardStates: events,
    imageRendered,
    renderedImageInfo,
    assetStore: assetScan,
    indexedDbDatabases: dbs,
    finalTextExcerpt: (await bodyText()).slice(-1800),
  };
  fs.writeFileSync(path.join(SHOTS, "evidence.json"), JSON.stringify(summary, null, 2));
  fs.writeFileSync(path.join(SHOTS, "console.log"), consoleLines.join("\n"));
  log("SUMMARY:", JSON.stringify({ ...summary, finalTextExcerpt: summary.finalTextExcerpt.slice(0, 700) }, null, 1));
  log(imageRendered && assetScan.exists && Object.values(assetScan.counts || {}).some((c) => c > 0)
    ? "PHYSICAL TEST E: PASS — real image rendered in the UI AND encrypted asset persisted"
    : "PHYSICAL TEST E: PARTIAL/FAIL — see evidence.json");
  process.exit(0);
} finally {
  await browser.close().catch(() => {});
  dev.kill("SIGKILL");
}
