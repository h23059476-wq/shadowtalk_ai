/**
 * Prompt library data tests — run with `npm run test`.
 *
 * The corpus is verified at generation time by
 * scripts/prompt_library/verify.py; these tests re-check the invariants that
 * matter to the UI so a bad data file cannot ship silently.
 */

import { describe, expect, it } from "vitest";
import {
  PROMPT_LIBRARY_CATEGORIES,
  PROMPT_LIBRARY_MANIFEST,
  PROMPT_LIBRARY_PACKS,
  PROMPT_LIBRARY_TOTALS,
  loadPromptPack,
} from "../index";

describe("prompt library manifest", () => {
  it("has at least 100 packs across 12 categories", () => {
    expect(PROMPT_LIBRARY_CATEGORIES).toHaveLength(12);
    expect(PROMPT_LIBRARY_PACKS.length).toBeGreaterThanOrEqual(100);
    expect(PROMPT_LIBRARY_TOTALS.packs).toBe(PROMPT_LIBRARY_PACKS.length);
    expect(PROMPT_LIBRARY_TOTALS.prompts).toBeGreaterThanOrEqual(10000);
  });

  it("has unique pack slugs and truthful prompt counts", () => {
    const slugs = new Set(PROMPT_LIBRARY_PACKS.map((p) => p.slug));
    expect(slugs.size).toBe(PROMPT_LIBRARY_PACKS.length);
    for (const pack of PROMPT_LIBRARY_PACKS) {
      expect(pack.promptCount).toBeGreaterThanOrEqual(100);
      expect(pack.description.length).toBeGreaterThan(10);
    }
  });
});

describe("sampled pack bodies", () => {
  // Spot-check a spread of packs across categories (one per category) rather
  // than importing all 108 bodies into the test bundle.
  const sampled = PROMPT_LIBRARY_CATEGORIES.map(
    (c) => c.packs[Math.floor(c.packs.length / 2)],
  );

  it.each(sampled.map((p) => [p.slug, p] as const))(
    "pack %s: >=100 unique, clean prompts",
    async (_slug, meta) => {
      const pack = await loadPromptPack(meta.slug);
      expect(pack).not.toBeNull();
      expect(pack!.prompts.length).toBe(meta.promptCount);
      expect(pack!.prompts.length).toBeGreaterThanOrEqual(100);

      const texts = pack!.prompts.map((p) => p.text);
      expect(new Set(texts).size).toBe(texts.length);
      for (const text of texts) {
        expect(text.length).toBeGreaterThanOrEqual(30);
        expect(text.length).toBeLessThanOrEqual(300);
        expect(text).not.toMatch(/TODO|FIXME|XXX|lorem|\{|\}/i);
        expect(text[0]).toBe(text[0].toUpperCase());
      }
    },
    20000,
  );
});

describe("manifest totals consistency", () => {
  it("category pack counts add up", () => {
    const sum = PROMPT_LIBRARY_CATEGORIES.reduce(
      (acc, c) => acc + c.packs.length,
      0,
    );
    expect(sum).toBe(PROMPT_LIBRARY_MANIFEST.totals.packs);
  });
});
