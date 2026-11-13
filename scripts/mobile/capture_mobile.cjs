/**
 * Mobile responsiveness verification (Phase 6).
 *
 * Serves the production build (vite preview), then for every target width:
 *  - loads each key route,
 *  - checks for horizontal overflow (document scrollWidth vs viewport, plus
 *    the widest offending elements),
 *  - captures screenshots for the required viewport/route combinations.
 *
 * Results: docs/mobile/screenshots/*.jpg + /tmp/mobile-sweep.json
 * Run: node scripts/mobile/capture_mobile.cjs
 */
const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");
const puppeteer = require("puppeteer");

const ROOT = path.resolve(__dirname, "..", "..");
const OUT_DIR = path.join(ROOT, "docs", "mobile", "screenshots");
const PORT = 4173;
const BASE = `http://127.0.0.1:${PORT}`;

const PHONES = [320, 360, 375, 390, 414, 430];
const TABLETS = [768, 820];
const DESKTOPS = [1024, 1280, 1440];

const ROUTES = ["/chatbot", "/auth", "/home", "/pricing", "/docs", "/themes", "/profile", "/settings", "/faq", "/status"];
const SHOTS = [
  { route: "/chatbot", width: 320, height: 844, mobile: true },
  { route: "/chatbot", width: 390, height: 844, mobile: true },
  { route: "/chatbot", width: 430, height: 932, mobile: true },
  { route: "/chatbot", width: 768, height: 1024, mobile: true },
  { route: "/chatbot", width: 1024, height: 768, mobile: false },
  { route: "/chatbot", width: 1440, height: 900, mobile: false },
  { route: "/auth", width: 390, height: 844, mobile: true },
  { route: "/auth", width: 1440, height: 900, mobile: false },
  { route: "/home", width: 390, height: 844, mobile: true },
  { route: "/home", width: 1440, height: 900, mobile: false },
  { route: "/pricing", width: 390, height: 844, mobile: true },
  { route: "/docs", width: 390, height: 844, mobile: true },
  { route: "/themes", width: 390, height: 844, mobile: true },
  { route: "/profile", width: 390, height: 844, mobile: true },
];

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

function startPreview() {
  const proc = spawn("npx", ["vite", "preview", "--port", String(PORT), "--strictPort", "--host", "127.0.0.1"], {
    cwd: ROOT,
    stdio: ["ignore", "pipe", "pipe"],
  });
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("preview server timeout")), 60000);
    const onData = (d) => {
      if (String(d).includes(String(PORT))) {
        clearTimeout(timer);
        resolve(proc);
      }
    };
    proc.stdout.on("data", onData);
    proc.stderr.on("data", onData);
    proc.on("exit", (code) => reject(new Error(`preview exited early (${code})`)));
  });
}

async function measureAndMaybeShoot(browser, { route, width, height, mobile }, shoot) {
  const page = await browser.newPage();
  await page.setViewport({ width, height, isMobile: mobile, hasTouch: mobile, deviceScaleFactor: mobile ? 2 : 1 });
  const result = { route, width, overflow: false, docWidth: 0, offenders: [], error: null };
  try {
    await page.goto(BASE + route, { waitUntil: "networkidle2", timeout: 45000 });
    await wait(1800); // boot screen + entry animations
    const audit = await page.evaluate(() => {
      const vw = window.innerWidth;
      const doc = document.scrollingElement;
      const docW = doc ? doc.scrollWidth : 0;
      const offenders = [];
      if (docW > vw + 1) {
        const all = document.querySelectorAll("body *");
        for (const el of all) {
          const r = el.getBoundingClientRect();
          if (r.right > vw + 1 && r.width > 40 && offenders.length < 5) {
            offenders.push({
              tag: el.tagName.toLowerCase(),
              cls: String(el.className && el.className.baseVal !== undefined ? el.className.baseVal : el.className).slice(0, 90),
              right: Math.round(r.right),
              width: Math.round(r.width),
            });
          }
        }
      }
      return { vw, docW, offenders };
    });
    result.docWidth = audit.docW;
    result.viewportWidth = audit.vw;
    result.overflow = audit.docW > audit.vw + 1;
    result.offenders = audit.offenders;
    if (shoot) {
      const name = `${route.replace(/\//g, "_") || "_root"}-${width}${mobile ? "m" : ""}.jpg`;
      await page.screenshot({ path: path.join(OUT_DIR, name), type: "jpeg", quality: 70, fullPage: false });
      result.screenshot = name;
    }
  } catch (e) {
    result.error = String(e && e.message ? e.message : e).slice(0, 200);
  }
  await page.close();
  return result;
}

(async () => {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const server = await startPreview();
  let browser;
  const results = [];
  try {
    browser = await puppeteer.launch({
      headless: "new",
      args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
    });
    for (const route of ROUTES) {
      for (const w of [...PHONES, ...TABLETS, ...DESKTOPS]) {
        const mobile = w < 1024;
        results.push(await measureAndMaybeShoot(browser, { route, width: w, height: mobile ? 844 : 900, mobile }, false));
      }
    }
    for (const shot of SHOTS) {
      results.push(await measureAndMaybeShoot(browser, shot, true));
    }
  } finally {
    if (browser) await browser.close();
    server.kill("SIGTERM");
  }
  fs.writeFileSync("/tmp/mobile-sweep.json", JSON.stringify(results, null, 2));
  const overflows = results.filter((r) => r.overflow || r.error);
  console.log(`swept ${results.length} route/width combos; ${results.filter((r) => r.screenshot).length} screenshots`);
  console.log(overflows.length ? "OVERFLOW/ERRORS:" : "NO OVERFLOW DETECTED");
  for (const o of overflows) {
    console.log(JSON.stringify(o));
  }
})().catch((e) => {
  console.error("SWEEP FAILED:", e);
  process.exit(1);
});
