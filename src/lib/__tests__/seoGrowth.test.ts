import { describe, expect, it } from "vitest";
import { readFileSync, statSync, existsSync } from "fs";
import { resolve } from "path";
import { execSync } from "child_process";
import { PAGE_SEO, SITE_URL } from "../seo";
import { SEO_COMPARISONS, COMPARE_SLUGS, COMPARE_HUB_LINE } from "../../content/seoComparisons";
import { SEO_GUIDES } from "../../content/seoGuides";
import { extractAppRoutePaths, isRoutableHref, extractDynamicRoutePatterns } from "../siteLinkAudit";

/**
 * SEO/GEO/AEO growth contracts.
 *
 * These tests pin the machine-facing surfaces of the growth stack:
 *  - sitemap.xml <-> PAGE_SEO sync (no orphan URLs, no unlisted pages)
 *  - prerender.cjs covers every indexable route (AI crawlers don't run JS)
 *  - og-image must be PNG (social scrapers and LLM scrapers can't render SVG)
 *  - robots.txt explicitly welcomes answer-engine crawlers
 *
 * Content-page contracts are added alongside the pages they protect.
 */
const root = process.cwd(); // vitest runs from the repo root
const read = (rel: string) => readFileSync(resolve(root, rel), "utf-8");

const CANONICAL_HOST = `${SITE_URL}`;

/** All indexable canonical paths from PAGE_SEO, e.g. ["/home", "/pricing", …] */
const indexablePaths = Object.values(PAGE_SEO)
  .filter((meta) => !meta.noIndex)
  .map((meta) => {
    const url = meta.canonical || `${SITE_URL}/`;
    return url.replace(CANONICAL_HOST, "") || "/";
  });

function extractPrerenderRoutes(): string[] {
  const src = read("prerender.cjs");
  const block = src.match(/const ROUTES_TO_PRERENDER = \[([\s\S]*?)\];/);
  if (!block) return [];
  return [...block[1].matchAll(/'([^']+)'/g)].map((m) => m[1]);
}

describe("seo growth: sitemap <-> PAGE_SEO sync", () => {
  const sitemap = read("public/sitemap.xml");

  it("every indexable PAGE_SEO route appears in sitemap.xml", () => {
    const missing = indexablePaths.filter(
      (p) => !sitemap.includes(`<loc>${CANONICAL_HOST}${p === "/" ? "/" : p}</loc>`),
    );
    expect(missing, `routes missing from sitemap.xml: ${missing.join(", ")}`).toEqual([]);
  });

  it("sitemap.xml contains no orphan URLs outside PAGE_SEO", () => {
    const locs = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
    expect(locs.length).toBeGreaterThan(0);
    const orphans = locs.filter((loc) => {
      const path = loc.replace(CANONICAL_HOST, "") || "/";
      return !indexablePaths.includes(path);
    });
    expect(orphans, `sitemap URLs with no PAGE_SEO entry: ${orphans.join(", ")}`).toEqual([]);
  });
});

describe("seo growth: prerender coverage", () => {
  it("prerender.cjs covers every indexable PAGE_SEO route", () => {
    const prerendered = new Set(extractPrerenderRoutes());
    const missing = indexablePaths.filter((p) => !prerendered.has(p));
    expect(
      missing,
      `indexable routes not prerendered (AI crawlers don't run JS): ${missing.join(", ")}`,
    ).toEqual([]);
  });
});

describe("seo growth: og-image must be scrapable", () => {
  it("public/og-image.png exists and is a real rendered card, not a blank file", () => {
    const png = resolve(root, "public/og-image.png");
    expect(existsSync(png), "og-image.png is missing — run scripts/generate-og-image.mjs").toBe(true);
    const size = statSync(png).size;
    expect(size, "og-image.png suspiciously small — likely a blank render").toBeGreaterThan(50 * 1024);
    const magic = readFileSync(png).subarray(0, 8);
    expect([...magic.subarray(0, 4)]).toEqual([0x89, 0x50, 0x4e, 0x47]); // PNG magic
  });

  it("index.html references the PNG og-image for og: and twitter:, never the SVG", () => {
    const html = read("index.html");
    expect(html).toContain(`content="${CANONICAL_HOST}/og-image.png"`);
    expect(html).not.toContain("og-image.svg");
  });

  it("seo.ts default og image is the PNG", () => {
    const seo = read("src/lib/seo.ts");
    expect(seo).toContain('DEFAULT_OG_IMAGE = `${SITE_URL}/og-image.png`');
    expect(seo).not.toContain("og-image.svg");
  });
});

describe("seo growth: answer-engine crawler policy", () => {
  const robots = read("public/robots.txt");
  const welcomeBots = [
    "GPTBot",
    "OAI-SearchBot",
    "ChatGPT-User",
    "ClaudeBot",
    "PerplexityBot",
    "Google-Extended",
    "Applebot-Extended",
    "Bytespider",
    "cohere-ai",
  ];

  it("explicitly welcomes every major AI/answer-engine crawler", () => {
    const missing = welcomeBots.filter((bot) => !robots.includes(`User-agent: ${bot}`));
    expect(missing, `robots.txt missing AI crawler sections: ${missing.join(", ")}`).toEqual([]);
  });

  it("declares the sitemap and never blocks the SEO content routes", () => {
    expect(robots).toContain("Sitemap: https://www.shadowtalk-ai.com/sitemap.xml");
    for (const p of indexablePaths) {
      expect(robots).not.toMatch(new RegExp(`Disallow:\\s*${p.replace(/\//g, "\\/")}\\s*$`, "m"));
    }
  });
});

describe("seo growth: comparison engine", () => {
  const appSource = read("src/App.tsx");
  const routes = extractAppRoutePaths(appSource);
  const palette = read("src/components/CommandPalette.tsx");
  const footer = read("src/components/Footer.tsx");
  const llms = read("public/llms.txt");
  const compareHrefs = ["/compare", ...COMPARE_SLUGS.map((s) => `/vs/${s}`)];

  it("ships the ten head-to-heads plus hub, each wired to route + PAGE_SEO", () => {
    expect(COMPARE_SLUGS).toEqual([
      "chatgpt", "gemini", "claude", "lm-studio", "proton-lumo",
      "web-llm-chat", "ollama", "jan", "perplexity", "pocketpal",
    ]);
    for (const href of compareHrefs) {
      expect(routes.includes(href), `route missing: ${href}`).toBe(true);
    }
    expect(PAGE_SEO["compare"]).toBeDefined();
    for (const slug of COMPARE_SLUGS) {
      expect(PAGE_SEO[`vs-${slug}`], `PAGE_SEO missing vs-${slug}`).toBeDefined();
    }
  });

  it("every comparison is discoverable: sitemap, prerender, palette, footer, llms.txt", () => {
    const sitemap = read("public/sitemap.xml");
    const prerendered = new Set(extractPrerenderRoutes());
    for (const href of compareHrefs) {
      expect(sitemap).toContain(`<loc>${SITE_URL}${href}</loc>`);
      expect(prerendered.has(href), `not prerendered: ${href}`).toBe(true);
      expect(palette).toContain(`href: "${href}"`);
      expect(llms).toContain(`${SITE_URL}${href}`);
    }
    // hub + top comparisons linked from the global footer (crawl depth 1 from every page)
    expect(footer).toContain('href: "/compare"');
    for (const href of ["/vs/chatgpt", "/vs/gemini", "/vs/claude", "/vs/lm-studio", "/vs/proton-lumo", "/vs/perplexity"]) {
      expect(footer).toContain(`href: "${href}"`);
    }
  });

  it("every comparison is honest: where-they-win section, dated landscape, per-row edges", () => {
    for (const slug of COMPARE_SLUGS) {
      const c = SEO_COMPARISONS[slug];
      expect(c.whereTheyWin.length, `${slug} must credit the competitor`).toBeGreaterThanOrEqual(2);
      expect(c.whereTheyWinHeading).toMatch(/^Where .+ wins?$/);
      expect(c.rows.length, `${slug} table too thin`).toBeGreaterThanOrEqual(6);
      expect(c.faqs.length, `${slug} FAQ too thin`).toBeGreaterThanOrEqual(3);
      expect(COMPARE_HUB_LINE[slug]).toBeTruthy();
      // verdict carries the category claim
      expect(c.verdictParagraphs.join(" "), `${slug} verdict missing the claim`).toContain("works offline");
      // the honest-limits rows exist somewhere in the content (server-side default or transit)
      const blob = JSON.stringify(c);
      expect(blob).toMatch(/stored server-side|transit|sees your prompt|machine/i);
    }
  });

  it("every comparison definition is extractive: names both products and stays quotable", () => {
    for (const slug of COMPARE_SLUGS) {
      const c = SEO_COMPARISONS[slug];
      expect(c.definition).toContain("ShadowTalk");
      expect(c.definition).toContain(c.competitor);
      expect(c.definition.length).toBeGreaterThan(120);
      expect(c.definition.length).toBeLessThan(700);
    }
  });

  it("related links in guides and comparisons all resolve to real routes", () => {
    const dynamicPatterns = extractDynamicRoutePatterns(appSource);
    const broken: string[] = [];
    const check = (href: string) => {
      if (!isRoutableHref(href, routes, dynamicPatterns)) broken.push(href);
    };
    for (const g of Object.values(SEO_GUIDES)) g.related.forEach((r) => check(r.href));
    for (const c of Object.values(SEO_COMPARISONS)) c.related.forEach((r) => check(r.href));
    expect(broken, `broken internal links: ${broken.join(", ")}`).toEqual([]);
  });
});

describe("seo growth: guide fleet + llms-full.txt (GEO)", () => {
  const appSource = read("src/App.tsx");
  const routes = extractAppRoutePaths(appSource);
  const palette = read("src/components/CommandPalette.tsx");
  const footer = read("src/components/Footer.tsx");
  const llms = read("public/llms.txt");
  const llmsFull = read("public/llms-full.txt");
  const sitemap = read("public/sitemap.xml");
  const prerendered = new Set(extractPrerenderRoutes());

  const guideSlugs = Object.keys(SEO_GUIDES);
  const contentHrefs = [
    "/guides",
    ...guideSlugs.map((s) => `/${s}`),
    ...COMPARE_SLUGS.map((s) => `/vs/${s}`),
    "/compare",
  ];

  it("ships ten guides, each substantive and extractive", () => {
    expect(guideSlugs.sort()).toEqual([
      "ai-chat-without-account",
      "best-offline-ai-chat",
      "free-ai-chat",
      "local-vs-cloud-ai",
      "mobile-offline-ai",
      "offline-ai-chat",
      "private-ai-chat",
      "run-llm-in-browser",
      "webgpu-ai-chat",
      "what-is-on-device-ai",
    ]);
    for (const slug of guideSlugs) {
      const g = SEO_GUIDES[slug];
      expect(g.definition.length, `${slug} definition not extractive`).toBeGreaterThan(120);
      expect(g.faqs.length, `${slug} FAQ too thin`).toBeGreaterThanOrEqual(3);
      expect(g.sections.length, `${slug} too thin`).toBeGreaterThanOrEqual(2);
    }
  });

  it("every content page is wired: route, PAGE_SEO, sitemap, prerender, palette, footer, llms.txt", () => {
    for (const href of contentHrefs) {
      expect(routes.includes(href), `route missing: ${href}`).toBe(true);
      expect(PAGE_SEO[href.slice(1).replace(/\//g, "-")], `PAGE_SEO missing ${href}`).toBeDefined();
      expect(sitemap).toContain(`<loc>${SITE_URL}${href}</loc>`);
      expect(prerendered.has(href), `not prerendered: ${href}`).toBe(true);
      expect(palette).toContain(`href: "${href}"`);
      expect(llms).toContain(`${SITE_URL}${href}`);
      expect(footer).toContain(`href: "${href}"`);
    }
  });

  it("both hubs list every fleet page and cross-link each other", () => {
    const guidesPage = read("src/pages/GuidesIndexPage.tsx");
    const comparePage = read("src/pages/CompareIndexPage.tsx");
    // guides hub lists all ten guides via ItemList and links /compare
    for (const slug of Object.keys(SEO_GUIDES)) {
      expect(guidesPage).toContain(`"${slug}"`);
    }
    expect(guidesPage).toContain('"/compare"');
    // compare hub renders all ten comparisons via COMPARE_SLUGS and links onward
    expect(comparePage).toContain("COMPARE_SLUGS.map");
  });

  it("llms-full.txt is the complete GEO dump", () => {
    // the claim + its defensibility, dated
    expect(llmsFull).toContain("the first AI chat in a browser that works offline and syncs when you're back");
    expect(llmsFull).toContain("Landscape checked Nov 2026");
    expect(llmsFull).toContain("#2467");
    // entity facts
    expect(llmsFull).toContain("Zain Ahmed Fahad Patel");
    expect(llmsFull).toContain("https://www.shadowtalk-ai.com/founder");
    expect(llmsFull).toContain("Last updated: 2026-11-19");
    // privacy + honesty facts
    expect(llmsFull).toContain("AES-256-GCM");
    expect(llmsFull).toContain("stored server-side");
    expect(llmsFull).toContain("BYOK");
    // every content page referenced
    for (const href of contentHrefs) {
      expect(llmsFull).toContain(`${SITE_URL}${href}`);
    }
    // specs sheet
    expect(llmsFull).toContain("Llama-3.2-1B-Instruct 880MB/1.1GB");
    expect(llmsFull).toContain("Chrome or Edge 113+");
  });

  it("llms.txt links the full dump", () => {
    expect(llms).toContain("https://www.shadowtalk-ai.com/llms-full.txt");
  });
});

describe("seo growth: build-time sitemap generator + IndexNow pipeline", () => {
  const pkg = JSON.parse(read("package.json"));
  const generator = read("scripts/generate-sitemap.mjs");
  const submitter = read("scripts/submit-indexnow.mjs");
  const INDEXNOW_KEY = "d13c725ef8b8d4b4bc693b954d61c248";

  it("the build pipeline regenerates dist/sitemap.xml before prerendering", () => {
    expect(pkg.scripts.build).toContain("node scripts/generate-sitemap.mjs --out dist");
    expect(pkg.scripts.build).toContain("node prerender.cjs");
    expect(pkg.scripts.build.indexOf("generate-sitemap")).toBeLessThan(pkg.scripts.build.indexOf("prerender.cjs"));
  });

  it("the generator derives URLs from PAGE_SEO (single source of truth)", () => {
    // the script parses the same canonical lines the data tests pin — not a hand list
    expect(generator).toContain("matchAll(/canonical:");
    expect(generator).toContain("src/lib/seo.ts");
    expect(generator).toContain("--check");
  });

  it("the committed sitemap.xml is in sync with PAGE_SEO (generator --check passes)", () => {
    expect(() =>
      execSync("node scripts/generate-sitemap.mjs --check", { cwd: root, stdio: "pipe" }),
    ).not.toThrow();
  });

  it("IndexNow: key file deployed at the site root matches the submit script", () => {
    const keyFile = read(`public/${INDEXNOW_KEY}.txt`).trim();
    expect(keyFile).toBe(INDEXNOW_KEY);
    expect(submitter).toContain(`INDEXNOW_KEY = "${INDEXNOW_KEY}"`);
    expect(submitter).toContain("api.indexnow.org/indexnow");
    expect(submitter).toContain("--dry");
  });

  it("IndexNow submits every sitemap URL, never invents URLs", () => {
    // the submitter reads public/sitemap.xml — no separate URL list to drift
    expect(submitter).toContain('readFileSync(resolve(ROOT, "public/sitemap.xml")');
    expect(submitter).toContain('matchAll(/<loc>([^<]+)<\\/loc>/g)');
  });
});
