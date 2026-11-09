/**
 * Batch 2 — screenshot capture for the visualization demo.
 * Uses the repo's puppeteer against the local dev server.
 */
const puppeteer = require("puppeteer");

(async () => {
  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900, deviceScaleFactor: 1.5 });
  page.on("console", (msg) => {
    if (["error", "warning"].includes(msg.type())) console.log(`[console:${msg.type()}]`, msg.text().slice(0, 300));
  });
  page.on("pageerror", (err) => console.log("[pageerror]", String(err).slice(0, 300)));

  await page.goto("http://localhost:5199/dev/viz-demo", { waitUntil: "networkidle2", timeout: 90000 });
  // Wait for the lazy visualization chunk to render real content.
  await page.waitForFunction(
    () => document.body.textContent.includes("USDT market overview"),
    { timeout: 30000 },
  );
  await new Promise((r) => setTimeout(r, 2500));

  await page.screenshot({ path: "/home/z/my-project/ShadowTalk-AI/docs/architecture/research-visualization/screenshots/viz-demo-full.png", fullPage: true });

  // Focus shots: scroll to each artifact.
  const shot = async (text, name) => {
    const ok = await page.evaluate((needle) => {
      const el = [...document.querySelectorAll("*")].find(
        (n) => n.children.length === 0 && n.textContent && n.textContent.trim() === needle,
      );
      if (!el) return false;
      el.scrollIntoView({ block: "center" });
      return true;
    }, text);
    if (!ok) console.log(`[shot] "${text}" not found`);
    await new Promise((r) => setTimeout(r, 700));
    await page.screenshot({ path: `/home/z/my-project/ShadowTalk-AI/docs/architecture/research-visualization/screenshots/${name}` });
    console.log(`[shot] saved ${name} (${text})`);
  };

  await shot("USDT market overview", "viz-1-line-chart.png");
  await shot("Market cap USD", "viz-2-dashboard.png");
  await shot("USDT vs USDC — live market comparison", "viz-3-comparison.png");

  await browser.close();
  console.log("DONE");
})().catch((err) => {
  console.error("FAILED", err);
  process.exit(1);
});
