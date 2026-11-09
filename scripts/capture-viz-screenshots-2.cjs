/**
 * Batch 2 — screenshot capture (round 2): dashboard + expand dialog.
 */
const puppeteer = require("puppeteer");

(async () => {
  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900, deviceScaleFactor: 1.5 });
  await page.goto("http://localhost:5199/dev/viz-demo", { waitUntil: "networkidle2", timeout: 90000 });
  await page.waitForFunction(() => document.body.textContent.includes("USDT market overview"), { timeout: 30000 });
  await new Promise((r) => setTimeout(r, 2500));

  const scrollTo = async (needle) => {
    const ok = await page.evaluate((text) => {
      const el = [...document.querySelectorAll("*")].find(
        (n) => n.children.length === 0 && n.textContent && n.textContent.trim() === text,
      );
      if (!el) return false;
      el.scrollIntoView({ block: "center" });
      return true;
    }, needle);
    if (!ok) console.log(`[shot] "${needle}" not found`);
    await new Promise((r) => setTimeout(r, 700));
    return ok;
  };

  // Dashboard card (KPI labels are humanized keys: "Price Usd", "Market Cap Usd")
  if (await scrollTo("Price Usd")) {
    await page.screenshot({ path: "/home/z/my-project/ShadowTalk-AI/docs/architecture/research-visualization/screenshots/viz-2-dashboard.png" });
    console.log("[shot] saved viz-2-dashboard.png (KPI dashboard)");
  }

  // Expanded dialog: click the FIRST Expand button (line chart) and capture.
  const clicked = await page.evaluate(() => {
    const btn = [...document.querySelectorAll("button")].find((b) => b.textContent.trim() === "Expand");
    if (!btn) return false;
    btn.click();
    return true;
  });
  if (clicked) {
    await page.waitForFunction(() => document.body.textContent.includes("Underlying data"), { timeout: 15000 });
    await new Promise((r) => setTimeout(r, 1200));
    await page.screenshot({ path: "/home/z/my-project/ShadowTalk-AI/docs/architecture/research-visualization/screenshots/viz-4-expanded-dialog.png" });
    console.log("[shot] saved viz-4-expanded-dialog.png");
    // Scroll inside the dialog to the data table
    await page.evaluate(() => {
      const heading = [...document.querySelectorAll("h4")].find((h) => h.textContent.includes("Underlying data"));
      heading?.scrollIntoView({ block: "start" });
    });
    await new Promise((r) => setTimeout(r, 500));
    await page.screenshot({ path: "/home/z/my-project/ShadowTalk-AI/docs/architecture/research-visualization/screenshots/viz-5-data-inspector.png" });
    console.log("[shot] saved viz-5-data-inspector.png");
    // Close the dialog
    await page.keyboard.press("Escape");
    await new Promise((r) => setTimeout(r, 600));
  }

  // Full page (final state, all artifacts)
  await page.screenshot({ path: "/home/z/my-project/ShadowTalk-AI/docs/architecture/research-visualization/screenshots/viz-demo-full.png", fullPage: true });
  console.log("[shot] saved viz-demo-full.png");

  await browser.close();
  console.log("DONE");
})().catch((err) => {
  console.error("FAILED", err);
  process.exit(1);
});
