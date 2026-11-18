import { describe, expect, it } from "vitest";
import { readFileSync, statSync, existsSync } from "fs";
import { resolve } from "path";
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

  it("ships the six head-to-heads plus hub, each wired to route + PAGE_SEO", () => {
    expect(COMPARE_SLUGS).toEqual(["chatgpt", "lm-studio", "proton-lumo", "web-llm-chat", "ollama", "perplexity"]);
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
    for (const href of ["/vs/chatgpt", "/vs/lm-studio", "/vs/proton-lumo", "/vs/perplexity"]) {
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
