/* eslint-disable */
/**
 * Capture Appearance Studio screenshots for the feature report.
 * Usage: node scripts/capture-appearance-screenshots.cjs [baseUrl]
 * Screenshots are saved to /home/z/my-project/download/appearance-studio-screenshots/
 */
const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

const BASE = process.argv[2] || 'http://localhost:4173';
const OUT_DIR = '/home/z/my-project/download/appearance-studio-screenshots';

const VIEWPORT = { width: 1440, height: 900, deviceScaleFactor: 1 };
const MOBILE_VIEWPORT = { width: 390, height: 844, deviceScaleFactor: 2 };

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  });

  const page = await browser.newPage();
  await page.setViewport(VIEWPORT);
  // Skip the cinematic boot screen so the studio renders immediately.
  await page.evaluateOnNewDocument(() => {
    try { sessionStorage.setItem('shadowtalk-booted', 'true'); } catch (e) { /* noop */ }
  });

  const shot = async (name) => {
    await page.screenshot({ path: path.join(OUT_DIR, `${name}.png`) });
    console.log(`📸 ${name}.png`);
  };

  const waitForStudio = async () => {
    await page.waitForSelector('[data-testid="appearance-studio"]', { timeout: 45000 });
    await new Promise((r) => setTimeout(r, 1200)); // fonts + layout settle
  };

  // 1 — Landing page (desktop)
  await page.goto(`${BASE}/themes`, { waitUntil: 'networkidle2', timeout: 60000 });
  await waitForStudio();
  await shot('1-appearance-studio-landing');

  // 2 — Theme collections (scroll to Dark & Futuristic section)
  await page.evaluate(() => {
    document
      .querySelector('[data-testid="section-collection-dark-futuristic"]')
      ?.scrollIntoView({ behavior: 'instant', block: 'start' });
    window.scrollBy({ top: -60, behavior: 'instant' });
  });
  await new Promise((r) => setTimeout(r, 900));
  await shot('2-theme-collections');

  // 3 — Theme preview dialog
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForSelector('[data-testid="preview-obsidian-indigo"]', { timeout: 30000 });
  await page.click('[data-testid="preview-obsidian-indigo"]');
  await page.waitForSelector('[data-testid="theme-preview-dialog"]', { timeout: 15000 });
  await new Promise((r) => setTimeout(r, 700));
  await shot('3-theme-preview-dialog');
  await page.keyboard.press('Escape');
  await new Promise((r) => setTimeout(r, 400));

  // 4 — Custom theme designer
  await page.goto(`${BASE}/themes?design=new`, { waitUntil: 'networkidle2', timeout: 60000 });
  await page.waitForSelector('[data-testid="theme-designer"]', { timeout: 45000 });
  await new Promise((r) => setTimeout(r, 1000));
  await shot('4-custom-theme-designer');

  // 5 — Live preview while editing (change background + read contrast report)
  await page.evaluate(() => {
    const input = document.querySelector('[data-testid="triplet-background"]');
    if (input) {
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
      setter.call(input, '210 40% 90%');
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
      // React maps onBlur to the native focusout event — commit the value.
      input.dispatchEvent(new Event('focusout', { bubbles: true }));
    }
  });
  await new Promise((r) => setTimeout(r, 900));
  await shot('5-designer-live-preview-editing');

  // 6 — Mobile layout
  const mobilePage = await browser.newPage();
  await mobilePage.setViewport(MOBILE_VIEWPORT);
  await mobilePage.evaluateOnNewDocument(() => {
    try { sessionStorage.setItem('shadowtalk-booted', 'true'); } catch (e) { /* noop */ }
  });
  await mobilePage.goto(`${BASE}/themes`, { waitUntil: 'networkidle2', timeout: 60000 });
  await mobilePage.waitForSelector('[data-testid="appearance-studio"]', { timeout: 45000 });
  await new Promise((r) => setTimeout(r, 1200));
  await mobilePage.screenshot({ path: path.join(OUT_DIR, '6-mobile-layout.png') });
  console.log('📸 6-mobile-layout.png');

  await browser.close();
  console.log(`\nAll screenshots saved to ${OUT_DIR}`);
}

main().catch((err) => {
  console.error('Screenshot capture failed:', err);
  process.exit(1);
});
