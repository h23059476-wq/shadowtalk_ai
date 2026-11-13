/**
 * Production smoke test — REAL headless Chromium against the built dist/
 * served by `vite preview`. Verifies "nothing is broken" at runtime:
 *  - every critical route renders (no blank page),
 *  - zero uncaught exceptions (pageerror),
 *  - PWA manifest is valid JSON with required fields,
 *  - service worker registers,
 *  - mobile viewport renders without horizontal overflow,
 *  - no references to test-mock internals in the served bundle.
 *
 * Console noise from external-network artifacts (Firebase/CDN reachability
 * inside the sandbox) is REPORTED separately from app defects — the exit
 * code fails only on app-caused failures.
 */
import puppeteer from "puppeteer";
import { spawn } from "node:child_process";
import { mkdirSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const PORT = 4199;
const BASE = `http://127.0.0.1:${PORT}`;
const ROUTES = ["/", "/chatbot", "/benchmarks", "/settings", "/help", "/security", "/docs"];

function wait(ms) { return new Promise((r) => setTimeout(r, ms)); }

async function startPreview() {
  const child = spawn("npx", ["vite", "preview", "--port", String(PORT), "--strictPort", "--host", "127.0.0.1"], {
    cwd: "/home/z/my-project",
    stdio: ["ignore", "pipe", "pipe"],
  });
  const ready = new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("vite preview did not start in 30s")), 30_000);
    child.stdout.on("data", (chunk) => {
      if (String(chunk).includes(String(PORT))) { clearTimeout(timer); resolve(); }
    });
    child.on("exit", (code) => reject(new Error(`vite preview exited early (${code})`)));
  });
  await ready;
  // Give the server a beat to accept connections.
  for (let i = 0; i < 20; i++) {
    try { await fetch(`${BASE}/manifest.webmanifest`); break; } catch { await wait(250); }
  }
  return child;
}

function scanBundleForMockImports() {
  // The built bundle must not contain test-mock internals.
  const dist = "/home/z/my-project/dist";
  const offenders = [];
  const walk = (dir) => {
    for (const name of readdirSync(dir)) {
      const full = join(dir, name);
      const st = statSync(full);
      if (st.isDirectory()) { walk(full); continue; }
      if (!name.endsWith(".js") || st.size > 4_000_000) continue;
      const content = readFileSync(full, "utf8");
      if (/createMockBackend|__tests__\/mocks/.test(content)) offenders.push(full);
    }
  };
  walk(dist);
  return offenders;
}

async function main() {
  console.log("── Production smoke test ──");
  const mockOffenders = scanBundleForMockImports();
  console.log(`bundle mock-import scan: ${mockOffenders.length === 0 ? "CLEAN" : `OFFENDERS: ${mockOffenders.join(", ")}`}`);

  const preview = await startPreview();
  const manifestRaw = await fetch(`${BASE}/manifest.webmanifest`).then((r) => r.text());
  const manifest = JSON.parse(manifestRaw);
  const manifestOk = Boolean(manifest.name && manifest.start_url !== undefined && Array.isArray(manifest.icons) && manifest.icons.length > 0);
  console.log(`PWA manifest: ${manifestOk ? "VALID" : "INVALID"} — name="${manifest.name}", display=${manifest.display}, icons=${manifest.icons?.length}`);

  const browser = await puppeteer.launch({ headless: "new", args: ["--no-sandbox", "--disable-setuid-sandbox"] });

  const appDefects = [];
  let swRegistered = false;

  try {
    for (const route of ROUTES) {
      const isMobile = route === "/chatbot"; // check the chat surface at mobile width too
      const page = await browser.newPage();
      await page.setViewport(isMobile ? { width: 390, height: 844, isMobile: true, hasTouch: true } : { width: 1440, height: 900 });
      const pageErrors = [];
      const consoleErrors = [];
      page.on("pageerror", (err) => pageErrors.push(String(err?.message ?? err)));
      page.on("console", (msg) => { if (msg.type() === "error") consoleErrors.push(msg.text()); });
      const response = await page.goto(`${BASE}${route}`, { waitUntil: "networkidle2", timeout: 30_000 }).catch((e) => null);
      await wait(1200); // let async effects settle

      const status = response?.status() ?? 0;
      const rootHasContent = await page.evaluate(() => {
        const root = document.getElementById("root") ?? document.body;
        return (root.innerText ?? "").trim().length > 40;
      });
      let overflow = false;
      if (isMobile) {
        overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 2);
      }
      if (route === "/" ) {
        swRegistered = await page.evaluate(async () => {
          if (!("serviceWorker" in navigator)) return false;
          const regs = await navigator.serviceWorker.getRegistrations();
          return regs.length > 0;
        }).catch(() => false);
      }

      const realConsoleErrors = consoleErrors.filter(
        (t) => !/net::|Failed to fetch|Firebase|firestore|ERR_|Load failed|network/i.test(t)
      );
      const defectLines = [];
      if (status === 0 || status >= 400) defectLines.push(`HTTP ${status}`);
      if (!rootHasContent) defectLines.push("blank page");
      if (pageErrors.length > 0) defectLines.push(`pageerror: ${pageErrors[0].slice(0, 120)}`);
      if (realConsoleErrors.length > 0) defectLines.push(`console.error: ${realConsoleErrors[0].slice(0, 120)}`);
      if (isMobile && overflow) defectLines.push("horizontal overflow at 390px");

      const verdict = defectLines.length === 0 ? "OK" : `DEFECT — ${defectLines.join(" | ")}`;
      console.log(`${route.padEnd(12)} ${isMobile ? "(390px) " : "        "}${verdict}${consoleErrors.length !== realConsoleErrors.length ? ` [${consoleErrors.length - realConsoleErrors.length} external-net console msg(s) ignored]` : ""}`);
      if (defectLines.length > 0) appDefects.push({ route, defectLines });
      await page.close();
    }
  } finally {
    await browser.close();
    preview.kill("SIGTERM");
  }

  console.log(`service worker registration on /: ${swRegistered ? "YES" : "NO"}`);
  const bundleClean = mockOffenders.length === 0;
  const pass = appDefects.length === 0 && bundleClean && manifestOk && swRegistered;
  console.log(`RESULT: ${pass ? "PASS — production smoke clean" : "FAIL"}`);
  process.exit(pass ? 0 : 1);
}

main().catch((err) => { console.error("smoke test crashed:", err); process.exit(1); });
