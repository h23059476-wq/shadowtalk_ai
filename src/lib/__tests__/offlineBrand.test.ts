/**
 * Offline category-claim parity — "the first AI chat in a browser that works
 * offline — and syncs when you're back."
 *
 * The claim lives ONCE in BRAND.offlineLine and must be present on every
 * user-facing surface it promises. If a surface drops the line (or the SSOT
 * text drifts), the claim stops being one voice and this test fails.
 *
 * Pinned surfaces: hero eyebrow, the landing offline band, the market-gap
 * differentiators band (three camps + names), home SEO description,
 * index.html meta + JSON-LD, FAQ answer, product docs, chat hooks.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { BRAND } from "@/lib/brand";

const read = (rel: string) => readFileSync(resolve(process.cwd(), rel), "utf8");

const CLAIM = "The first AI chat in a browser that works offline — and syncs when you're back";

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

describe("offline category-claim parity", () => {
  it("BRAND.offlineLine is the exact claim (SSOT)", () => {
    expect(BRAND.offlineLine).toBe(`${CLAIM}.`);
  });

  it("hero eyebrow carries the claim", () => {
    expect(read("src/components/HeroSection.tsx")).toContain(CLAIM);
  });

  it("the landing offline band is titled with the claim", () => {
    const band = read("src/components/landing/OfflineFirstBand.tsx");
    expect(band).toContain(CLAIM);
    // and the band is actually mounted on the home page
    expect(read("src/pages/Index.tsx")).toContain("OfflineFirstBand");
  });

  it("the market-gap band pins the three camps and is mounted", () => {
    const band = read("src/components/landing/MarketGapBand.tsx");
    // camp names — the differentiators the claim rests on
    expect(band).toContain("LM Studio");
    expect(band).toContain("Secret Llama");
    expect(band).toContain("Proton Lumo");
    expect(band).toContain("Confer");
    expect(band).toContain("LocalMind");
    // and the band is actually mounted on the home page
    expect(read("src/pages/Index.tsx")).toContain("MarketGapBand");
  });

  it("home SEO description leads with the claim", () => {
    const seo = read("src/lib/seo.ts");
    const m = seo.match(/home:\s*{[\s\S]*?description:\s*"([^"]+)"/);
    expect(m).not.toBeNull();
    expect(m![1].startsWith(CLAIM)).toBe(true);
  });

  it("index.html meta description and JSON-LD featureList carry the claim", () => {
    const html = read("index.html");
    expect(html).toMatch(new RegExp(`content="[^"]*${escapeRe(CLAIM)}`));
    expect(html).toContain(`${CLAIM} — on-device WebGPU AI`);
  });

  it("FAQ and product docs state the claim (case-insensitive: mid-sentence usage)", () => {
    const re = new RegExp(escapeRe(CLAIM), "i");
    expect(re.test(read("src/pages/FAQPage.tsx"))).toBe(true);
    expect(re.test(read("src/content/productDocs.ts"))).toBe(true);
  });

  it("brand hooks rotate the claim too", () => {
    expect(read("src/lib/brand.ts")).toContain(`"${CLAIM}.",`);
  });
});
