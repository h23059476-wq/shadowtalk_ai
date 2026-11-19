#!/usr/bin/env node
/**
 * IndexNow submission — instant indexing for Bing, Seznam, Yandex and Brave.
 *
 * IndexNow (https://www.indexnow.org) lets search engines that don't crawl on
 * Google's schedule discover updated URLs the moment they ship. The key file
 * public/<KEY>.txt proves site ownership; this script submits every URL in
 * sitemap.xml in one request.
 *
 * Usage (after deploying):
 *   node scripts/submit-indexnow.mjs          # submit all sitemap URLs
 *   node scripts/submit-indexnow.mjs --dry    # print the payload, POST nothing
 *
 * Key: d13c725ef8b8d4b4bc693b954d61c248 (also lives at /d13c725ef8b8d4b4bc693b954d61c248.txt)
 * seoGrowth.test.ts pins key file <-> script consistency.
 */
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");

export const INDEXNOW_KEY = "d13c725ef8b8d4b4bc693b954d61c248";
const HOST = "www.shadowtalk-ai.com";
const ENDPOINT = "https://api.indexnow.org/indexnow";

const dry = process.argv.includes("--dry");

const sitemap = readFileSync(resolve(ROOT, "public/sitemap.xml"), "utf-8");
const urls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);

if (!urls.length) {
  console.error("submit-indexnow: no URLs found in public/sitemap.xml");
  process.exit(1);
}

// Ownership proof file must exist and match the key (deployed at the site root)
const keyFile = resolve(ROOT, "public", `${INDEXNOW_KEY}.txt`);
try {
  const content = readFileSync(keyFile, "utf-8").trim();
  if (content !== INDEXNOW_KEY) {
    console.error(`submit-indexnow: key file content mismatch — ${keyFile} must contain exactly the key.`);
    process.exit(1);
  }
} catch {
  console.error(`submit-indexnow: missing key file ${keyFile} — create it with the key as content.`);
  process.exit(1);
}

const payload = {
  host: HOST,
  key: INDEXNOW_KEY,
  keyLocation: `https://${HOST}/${INDEXNOW_KEY}.txt`,
  urlList: urls,
};

if (dry) {
  console.log(`submit-indexnow --dry: would POST ${urls.length} URLs to ${ENDPOINT}`);
  console.log(JSON.stringify({ ...payload, urlList: [`...${urls.length} urls...`] }, null, 2));
  process.exit(0);
}

const res = await fetch(ENDPOINT, {
  method: "POST",
  headers: { "Content-Type": "application/json; charset=utf-8" },
  body: JSON.stringify(payload),
});

if (res.ok || res.status === 202) {
  console.log(`submit-indexnow: accepted ${urls.length} URLs (HTTP ${res.status}).`);
} else if (res.status === 400 || res.status === 403) {
  console.error(`submit-indexnow: rejected (HTTP ${res.status}) — check key file is deployed at https://${HOST}/${INDEXNOW_KEY}.txt`);
  process.exit(1);
} else {
  console.error(`submit-indexnow: HTTP ${res.status} — ${await res.text().catch(() => "no body")}`);
  process.exit(1);
}
