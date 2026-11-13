/** Diagnose /dev/viz-demo error: capture console + error text. */
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
    await wait(3000);
    browser = await puppeteer.launch({ headless: "new", args: ["--no-sandbox", "--disable-dev-shm-usage"] });
    const page = await browser.newPage();
    const logs = [];
    page.on("console", (m) => { if (["error", "warning"].includes(m.type())) logs.push(`[${m.type()}] ${m.text().slice(0, 300)}`); });
    page.on("pageerror", (e) => logs.push(`[pageerror] ${String(e && e.stack ? e.stack : e).slice(0, 600)}`));
    await page.goto(`http://127.0.0.1:${PORT}/dev/viz-demo`, { waitUntil: "networkidle2", timeout: 120000 });
    await wait(4000);
    const details = await page.evaluate(() => {
      const el = document.body.innerText || "";
      const i = el.indexOf("Technical Details");
      return el.slice(i, i + 700);
    });
    console.log("=== PAGE TEXT (technical details) ===\n", details);
    console.log("=== CONSOLE ===\n" + logs.slice(0, 12).join("\n"));
  } finally {
    if (browser) await browser.close();
    server.kill("SIGTERM");
  }
})().catch((e) => { console.error("FAILED:", e); process.exit(1); });
