/**
 * Batch 1 (Research-to-Visualization) — ```shadowdata capture contract.
 *
 * Pins the DETERMINISTIC half of structured research capture:
 *  1. Valid blocks parse into typed datasets with sources and gaps.
 *  2. Malformed/invalid blocks are rejected ALL-OR-NOTHING — partial data
 *     must never leak through (fabrication prevention, Phase 6).
 *  3. Size limits are enforced (oversized blocks are dropped, not truncated).
 */

import { describe, it, expect } from "vitest";
import {
  extractResearchDataBlocks,
  hasShadowDataBlock,
  parseResearchDataBlock,
} from "../dataDoc";

const validBlockJson = JSON.stringify({
  datasets: [
    {
      title: "USDT Market Snapshot",
      columns: [
        { key: "metric", type: "string" },
        { key: "value", type: "number" },
      ],
      rows: [
        { metric: "price", value: 1.0001 },
        { metric: "market_cap", value: 140000000000 },
        { metric: "volume_24h", value: null },
      ],
      asOf: "2026-11-09T12:00:00Z",
    },
  ],
  sources: [
    { url: "https://www.coingecko.com/en/cards/tether", name: "CoinGecko", retrievedAt: "2026-11-09T12:00:00Z" },
  ],
  gaps: ["24h trading volume unavailable from retrieved sources"],
});

function fence(json: string): string {
  return "```shadowdata\n" + json + "\n```";
}

describe("shadowdata capture — extraction contract", () => {
  it("extracts a valid block with datasets, sources and gaps", () => {
    const { blocks, invalidCount } = extractResearchDataBlocks(
      "Research summary here.\n\n" + fence(validBlockJson) + "\n\nConclusion.",
    );
    expect(invalidCount).toBe(0);
    expect(blocks).toHaveLength(1);
    expect(blocks[0].datasets[0].title).toBe("USDT Market Snapshot");
    expect(blocks[0].datasets[0].rows[2].value).toBeNull();
    expect(blocks[0].sources[0].url).toContain("coingecko.com");
    expect(blocks[0].gaps).toHaveLength(1);
    expect(typeof blocks[0].capturedAt).toBe("string");
  });

  it("returns no blocks when content has no shadowdata fence", () => {
    const { blocks, invalidCount } = extractResearchDataBlocks("Just prose. No data.");
    expect(blocks).toHaveLength(0);
    expect(invalidCount).toBe(0);
  });

  it("rejects invalid JSON all-or-nothing (never partially accepts)", () => {
    const { blocks, invalidCount } = extractResearchDataBlocks(
      fence("{ not valid json !!!"),
    );
    expect(blocks).toHaveLength(0);
    expect(invalidCount).toBe(1);
  });

  it("rejects schema violations: nested object values, bad URLs, missing columns", () => {
    // Row value is a nested object — forbidden (injection surface + unclear unit).
    const nested = JSON.stringify({
      datasets: [
        { title: "x", columns: [{ key: "a", type: "number" }], rows: [{ a: { bad: true } }] },
      ],
      sources: [],
      gaps: [],
    });
    expect(parseResearchDataBlock(nested)).toBeNull();

    // Source URL is not a URL.
    const badUrl = JSON.stringify({
      datasets: [
        { title: "x", columns: [{ key: "a", type: "number" }], rows: [{ a: 1 }] },
      ],
      sources: [{ url: "not-a-url" }],
      gaps: [],
    });
    expect(parseResearchDataBlock(badUrl)).toBeNull();

    // Dataset without columns.
    const noColumns = JSON.stringify({
      datasets: [{ title: "x", rows: [] }],
      sources: [],
      gaps: [],
    });
    expect(parseResearchDataBlock(noColumns)).toBeNull();
  });

  it("caps extraction at two blocks per message and counts the rest as invalid", () => {
    const content = fence(validBlockJson) + "\n" + fence(validBlockJson) + "\n" + fence(validBlockJson);
    const { blocks } = extractResearchDataBlocks(content);
    expect(blocks).toHaveLength(2);
  });

  it("drops oversized blocks instead of truncating them", () => {
    const huge = "a".repeat(130_000);
    expect(parseResearchDataBlock(huge)).toBeNull();
  });

  it("detects shadowdata fences (hasShadowDataBlock)", () => {
    expect(hasShadowDataBlock(fence(validBlockJson))).toBe(true);
    expect(hasShadowDataBlock("```json\n{\"a\":1}\n```")).toBe(false);
    expect(hasShadowDataBlock("")).toBe(false);
  });
});
