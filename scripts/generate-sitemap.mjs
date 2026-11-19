#!/usr/bin/env node
/**
 * Generate sitemap.xml from the single source of truth: PAGE_SEO in src/lib/seo.ts.
 *
 * Why: the hand-maintained sitemap can drift from the actual route registry. This
 * script extracts every `canonical: \`${SITE_URL}...\`` line from seo.ts and emits
 * the URL set — so sitemap.xml and PAGE_SEO can never disagree for long, and
 * lastmod refreshes on every deploy.
 *
 * Usage:
 *   node scripts/generate-sitemap.mjs            # writes public/sitemap.xml (committed copy)
 *   node scripts/generate-sitemap.mjs --out dist # writes dist/sitemap.xml (fresh lastmod at build)
 *   node scripts/generate-sitemap.mjs --check    # exit 1 if the committed sitemap's URL set drifted
 *
 * The `build` script runs it with --out dist between `vite build` and `prerender.cjs`,
 * so every deploy ships a sitemap with today's lastmod. seoGrowth.test.ts runs --check.
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const SITE_URL = "https://www.shadowtalk-ai.com";

const seoSource = readFileSync(resolve(ROOT, "src/lib/seo.ts"), "utf-8");

/** Extract canonical paths from PAGE_SEO — the same regex the data itself guarantees */
const paths = [
  ...seoSource.matchAll(/canonical: `\$\{SITE_URL\}(\/[^`]*)`/g),
].map((m) => m[1]);

if (paths.length < 20) {
  console.error(`generate-sitemap: only ${paths.length} canonical URLs extracted — seo.ts format changed? Aborting.`);
  process.exit(1);
}

const today = new Date().toISOString().slice(0, 10);

/** Priority/changefreq policy — exact reproduction of the audited hand-maintained map */
const EXPLICIT_POLICY = {
  "/home": { priority: "1.0", changefreq: "weekly" },
  "/chatbot": { priority: "0.9", changefreq: "weekly" },
  "/pricing": { priority: "0.9", changefreq: "monthly" },
  "/docs": { priority: "0.8", changefreq: "weekly" },
  "/faq": { priority: "0.8", changefreq: "monthly" },
  "/proofloop": { priority: "0.8", changefreq: "monthly" },
  "/ide": { priority: "0.7", changefreq: "monthly" },
  "/themes": { priority: "0.7", changefreq: "monthly" },
  "/downloads": { priority: "0.7", changefreq: "monthly" },
  "/benchmarks": { priority: "0.7", changefreq: "weekly" },
  "/about": { priority: "0.6", changefreq: "monthly" },
  "/founder": { priority: "0.6", changefreq: "monthly" },
  "/security": { priority: "0.6", changefreq: "monthly" },
  "/status": { priority: "0.5", changefreq: "daily" },
  "/changelog": { priority: "0.5", changefreq: "weekly" },
  "/contact": { priority: "0.5", changefreq: "monthly" },
  "/privacy": { priority: "0.3", changefreq: "yearly" },
  "/terms": { priority: "0.3", changefreq: "yearly" },
  "/cookies": { priority: "0.3", changefreq: "yearly" },
  "/gdpr": { priority: "0.3", changefreq: "yearly" },
};

function policyFor(path) {
  if (EXPLICIT_POLICY[path]) return EXPLICIT_POLICY[path];
  if (path.startsWith("/vs/")) return { priority: "0.8", changefreq: "monthly" };
  // guide fleet + hubs (/guides, /compare, /offline-ai-chat, ...): 0.8 weekly
  return { priority: "0.8", changefreq: "weekly" };
}

const urls = [...new Set(paths)].sort().map((path) => {
  const { priority, changefreq } = policyFor(path);
  return `  <url>
    <loc>${SITE_URL}${path === "/" ? "/" : path}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`;
});

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join("\n")}
</urlset>
`;

const args = process.argv.slice(2);

if (args.includes("--check")) {
  const committed = readFileSync(resolve(ROOT, "public/sitemap.xml"), "utf-8");
  const committedLocs = new Set([...committed.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]));
  const expected = new Set([...new Set(paths)].map((p) => `${SITE_URL}${p}`));
  const missing = [...expected].filter((u) => !committedLocs.has(u));
  const orphan = [...committedLocs].filter((u) => !expected.has(u));
  if (missing.length || orphan.length) {
    console.error("generate-sitemap --check FAILED:");
    if (missing.length) console.error("  missing from public/sitemap.xml:", missing.join(", "));
    if (orphan.length) console.error("  stale URLs in public/sitemap.xml:", orphan.join(", "));
    console.error("  fix: node scripts/generate-sitemap.mjs  (then commit the regenerated file)");
    process.exit(1);
  }
  console.log(`generate-sitemap --check OK: ${expected.size} URLs in sync.`);
  process.exit(0);
}

// --out dist → write dist/sitemap.xml (fresh lastmod at deploy); default → public/ (committed copy)
const outDir = resolve(ROOT, args.includes("--out") && args[args.indexOf("--out") + 1] === "dist" ? "dist" : "public");
if (outDir.endsWith("dist") && !existsSync(outDir)) {
  console.error(`generate-sitemap: output directory ${outDir} does not exist (run vite build first for --out dist).`);
  process.exit(1);
}
if (!outDir.endsWith("dist") && !existsSync(outDir)) mkdirSync(outDir, { recursive: true });

writeFileSync(resolve(outDir, "sitemap.xml"), xml);
console.log(`generate-sitemap: wrote ${resolve(outDir, "sitemap.xml")} (${urls.length} URLs, lastmod ${today})`);
