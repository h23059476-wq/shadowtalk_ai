/** Quick overflow check for /dev/viz-demo (dev-only route, not in main sweep). */
const { spawn } = require("child_process");
const path = require("path");
const puppeteer = require("puppeteer");
const ROOT = path.resolve(__dirname, "..", "..");
const PORT = 5199;
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

function startDev() {
  const proc = spawn("npx", ["vite", "--port", String(PORT), "--strictPort"], { cwd: ROOT, stdio: ["ignore", "pipe", "pipe"] });
  return new Promise((resolve) => {
    const onData = (d) => { if (String(d).includes("Local:")) resolve(proc); };
    proc.stdout.on("data", onData);
    proc.stderr.on("data", onData);
  });
}

(async () => {
  const server = await startDev();
  let browser;
  try {
    await wait(2000);
    browser = await puppeteer.launch({ headless: "new", args: ["--no-sandbox", "--disable-dev-shm-usage"] });
    for (const w of [320, 390, 768]) {
      const page = await browser.newPage();
      await page.setViewport({ width: w, height: 844, isMobile: true, hasTouch: true });
      await page.goto(`http://127.0.0.1:${PORT}/dev/viz-demo`, { waitUntil: "networkidle2", timeout: 120000 });
      await wait(2500);
      const r = await page.evaluate(() => {
        const vw = window.innerWidth;
        const doc = document.scrollingElement;
        const offenders = [];
        if (doc.scrollWidth > vw + 1) {
          for (const el of document.querySelectorAll("body *")) {
            const rect = el.getBoundingClientRect();
            if (rect.right > vw + 1 && rect.width > 40 && offenders.length < 4) {
              offenders.push(`${el.tagName}.${String(el.className).slice(0, 60)} right=${Math.round(rect.right)}`);
            }
          }
        }
        return { vw, docW: doc.scrollWidth, offenders };
      });
      console.log(`${w}px: viewport=${r.vw} docWidth=${r.docW} ${r.docW > r.vw + 1 ? "OVERFLOW " + JSON.stringify(r.offenders) : "OK"}`);
      await page.close();
    }
  } finally {
    if (browser) await browser.close();
    server.kill("SIGTERM");
  }
})().catch((e) => { console.error("FAILED:", e); process.exit(1); });
