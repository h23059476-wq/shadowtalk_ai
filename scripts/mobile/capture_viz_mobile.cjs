/**
 * Capture /dev/viz-demo (dev-mode only route) at mobile/tablet widths to
 * verify the visualization touch experience (pinch-zoom toolbar, canvas).
 * Run: node scripts/mobile/capture_viz_mobile.cjs
 */
const { spawn } = require("child_process");
const path = require("path");
const puppeteer = require("puppeteer");

const ROOT = path.resolve(__dirname, "..", "..");
const OUT_DIR = path.join(ROOT, "docs", "mobile", "screenshots");
const PORT = 5199;

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

function startDev() {
  const proc = spawn("npx", ["vite", "--port", String(PORT), "--strictPort"], { cwd: ROOT, stdio: ["ignore", "pipe", "pipe"] });
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("dev server timeout")), 90000);
    const onData = (d) => {
      if (String(d).includes("Local:")) {
        clearTimeout(timer);
        resolve(proc);
      }
    };
    proc.stdout.on("data", onData);
    proc.stderr.on("data", onData);
  });
}

(async () => {
  const server = await startDev();
  let browser;
  try {
    browser = await puppeteer.launch({ headless: "new", args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"] });
    for (const [w, h, name] of [[390, 844, "viz-demo-390m"], [768, 1024, "viz-demo-768m"]]) {
      const page = await browser.newPage();
      await page.setViewport({ width: w, height: h, isMobile: w < 1024, hasTouch: w < 1024, deviceScaleFactor: 2 });
      await page.goto(`http://127.0.0.1:${PORT}/dev/viz-demo`, { waitUntil: "networkidle2", timeout: 120000 });
      await wait(3500);
      // Scroll to the first conceptual diagram so the shot shows it.
      await page.evaluate(() => {
        const el = document.querySelector('[data-testid="conceptual-diagram"]');
        if (el) el.scrollIntoView({ block: "center" });
      });
      await wait(600);
      await page.screenshot({ path: path.join(OUT_DIR, `${name}.jpg`), type: "jpeg", quality: 70 });
      console.log("captured", name);
      await page.close();
    }
  } finally {
    if (browser) await browser.close();
    server.kill("SIGTERM");
  }
})().catch((e) => {
  console.error("FAILED:", e);
  process.exit(1);
});
