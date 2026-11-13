/**
 * E2E persistence reproduction — REAL browser against the production build
 * with the LIVE Firebase project:
 *   1. sign up a throwaway account through the actual UI
 *   2. send a chat message on /chatbot
 *   3. RELOAD and check whether the conversation + user message survive
 * Captures every console error (esp. "[chat] loadConversations FAILED" /
 * "insert FAILED") and screenshots evidence. Cleans up the account after.
 */
import puppeteer from "puppeteer";
import { spawn } from "node:child_process";
import { readFileSync } from "node:fs";

const PORT = 4199;
const BASE = process.env.E2E_BASE || `http://127.0.0.1:${PORT}`;
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const stamp = Date.now();
const EMAIL = `e2e-persist-${stamp}@example.invalid`;
const PASSWORD = "E2ePersist!2026x";

const app = readFileSync("/home/z/my-project/src/integrations/firebase/app.ts", "utf8");
const apiKey = (app.match(/VITE_FIREBASE_API_KEY \|\|\s*'([^']+)'/) ?? [])[1];
const projectId = (app.match(/VITE_FIREBASE_PROJECT_ID \|\|\s*'([^']+)'/) ?? [])[1] ?? "shadowtalk-ai-7a513";

async function cleanup() {
  try {
    const res = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: EMAIL, password: PASSWORD, returnSecureToken: true }),
    });
    const { idToken } = await res.json();
    if (!idToken) return console.log("cleanup: could not sign in probe account");
    // delete conversation + messages docs owned by this account
    const FS = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents`;
    const uid = JSON.parse(Buffer.from(idToken.split(".")[1], "base64url").toString()).user_id;
    for (const col of ["conversations", "messages"]) {
      const q = await fetch(`${FS}:runQuery?key=${apiKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
        body: JSON.stringify({
          structuredQuery: { from: [{ collectionId: col }], where: { fieldFilter: { field: { fieldPath: "user_id" }, op: "EQUAL", value: { stringValue: uid } } }, limit: 20 },
        }),
      });
      const rows = await q.json().catch(() => []);
      for (const row of rows) {
        const name = row?.document?.name;
        if (name) await fetch(`https://firestore.googleapis.com/v1/${name}?key=${apiKey}`, { method: "DELETE", headers: { Authorization: `Bearer ${idToken}` } });
      }
    }
    await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:delete?key=${apiKey}`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken }),
    });
    console.log(`cleanup: account ${EMAIL} + its chat docs deleted`);
  } catch (e) {
    console.log("cleanup error:", e.message);
  }
}

async function main() {
  let preview = null;
  if (!process.env.E2E_BASE) {
    preview = spawn("npx", ["vite", "preview", "--port", String(PORT), "--strictPort", "--host", "127.0.0.1"], { cwd: "/home/z/my-project", stdio: "ignore" });
    await wait(4000);
  }
  const browser = await puppeteer.launch({ headless: "new", args: ["--no-sandbox", "--disable-setuid-sandbox"] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  const consoleErrors = [];
  page.on("console", (m) => {
    if (m.type() === "error" || m.type() === "warn") {
      const t = m.text();
      if (/\[chat\]|persist|permission|denied|failed|insert|conversations/i.test(t)) consoleErrors.push(`${m.type()}: ${t.slice(0, 220)}`);
    }
  });
  page.on("pageerror", (e) => consoleErrors.push(`pageerror: ${String(e?.message ?? e).slice(0, 220)}`));

  try {
    // 1. Create the account via REST (identical to createUserWithEmailAndPassword),
    //    then sign in through the REAL UI (default Sign In mode).
    const su = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${apiKey}`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: EMAIL, password: PASSWORD, returnSecureToken: true }),
    });
    console.log(`REST signup: HTTP ${su.status} ${su.status === 200 ? "OK" : JSON.stringify((await su.json()).error ?? {}).slice(0, 120)}`);
    if (su.status !== 200) { console.log("cannot proceed without an account"); await cleanup(); return; }

    await page.goto(`${BASE}/auth`, { waitUntil: "networkidle2", timeout: 45000 });
    await wait(2500);
    await page.evaluate((email, pass) => {
      const setVal = (el, v) => {
        Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set.call(el, v);
        el.dispatchEvent(new Event("input", { bubbles: true }));
        el.dispatchEvent(new Event("change", { bubbles: true }));
      };
      const inputs = [...document.querySelectorAll("input")];
      const mail = inputs.find((i) => i.type === "email");
      const pw = inputs.find((i) => i.type === "password");
      if (mail) setVal(mail, email);
      if (pw) setVal(pw, pass);
    }, EMAIL, PASSWORD);
    await page.evaluate(() => {
      const b = [...document.querySelectorAll('button[type="submit"]')].find((e) => /sign in/i.test(e.textContent ?? "")) ?? document.querySelector('button[type="submit"]');
      b?.click();
    });
    console.log("signin: submitted");
    await wait(7000);
    const authed = await page.evaluate(() => ({ path: location.pathname, body: document.body.innerText.slice(0, 160).replace(/\s+/g, " ") }));
    console.log("after signin:", JSON.stringify(authed));
    await page.screenshot({ path: "/tmp/render/e2e-1-after-signup.png" }).catch(() => {});
    if (authed.path === "/auth") console.log("WARNING: still on /auth after sign-in — check visible errors above");

    // 2. Chat: go to /chatbot and send one message
    await page.goto(`${BASE}/chatbot`, { waitUntil: "networkidle2", timeout: 45000 }).catch(() => {});
    await wait(3000);
    await page.evaluate(() => {
      const ta = document.querySelector("textarea") ?? document.querySelector("[contenteditable]");
      if (ta) { ta.focus(); }
    });
    await page.keyboard.type("persistence probe message please remember this", { delay: 15 });
    await page.keyboard.press("Enter");
    console.log("chat: message sent");
    await wait(9000); // let conversation insert + user-message save settle (AI may fail — fine)
    await page.screenshot({ path: "/tmp/render/e2e-2-chat-sent.png" }).catch(() => {});

    // 3. RELOAD — the moment of truth
    await page.reload({ waitUntil: "networkidle2", timeout: 45000 }).catch(() => {});
    await wait(6000);
    const after = await page.evaluate(() => {
      const text = document.body.innerText;
      return {
        path: location.pathname,
        sidebarHasProbe: /persistence probe|persistence-probe/i.test(text),
        sidebarTitles: [...document.querySelectorAll("[class*='sidebar'] *, aside *")]
          .map((e) => (e.textContent ?? "").trim()).filter((t) => t.length > 3 && t.length < 80).slice(0, 8),
        welcomeVisible: /welcome|new chat|private chat/i.test(text),
        signedOut: /log ?in|sign ?in/i.test((document.querySelector("nav, header, [class*='header']")?.innerText ?? "")),
      };
    });
    console.log("after reload:", JSON.stringify(after, null, 1));
    await page.screenshot({ path: "/tmp/render/e2e-3-after-reload.png" }).catch(() => {});

    console.log("--- persistence-relevant console/warn messages ---");
    console.log(consoleErrors.length ? consoleErrors.slice(0, 12).join("\n") : "(none captured)");
    console.log("VERDICT:", after.sidebarHasProbe ? "PASS — conversation survived reload" : "FAIL — conversation NOT visible after reload");
  } finally {
    await browser.close();
    if (preview) preview.kill("SIGTERM");
  }
  await cleanup();
}

main().catch((e) => { console.error("E2E crashed:", e); process.exitCode = 1; });
