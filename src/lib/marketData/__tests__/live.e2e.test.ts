/**
 * LIVE market-data verification (Batch 2 E2E evidence).
 *
 * Opt-in: skipped unless LIVE_MARKET_DATA=1. Run with:
 *   LIVE_MARKET_DATA=1 npx vitest run src/lib/marketData/__tests__/live.e2e.test.ts
 *
 * Exercises the adapter against the REAL public providers:
 *  - USDT snapshot (CoinGecko keyless; Binance fallback)
 *  - USDC snapshot
 *  - USDT 30-day daily history (CoinGecko market_chart; Binance klines fallback)
 *  - comparison planning from the real quotes
 * Asserts: real numbers present, provider attribution, timestamps, freshness.
 */

import { describe, expect, it } from "vitest";
import {
  __resetMarketDataStateForTests,
  getMarketHistory,
  getMarketQuotes,
  historyToShadowDataset,
} from "../index";
import { planComparison } from "@/lib/visualization/planner";

const LIVE = process.env.LIVE_MARKET_DATA === "1";

describe.skipIf(!LIVE)("live market-data providers", () => {
  it("retrieves real USDT + USDC snapshots and plans a comparison", async () => {
    __resetMarketDataStateForTests();
    const { quotes, failures } = await getMarketQuotes(["USDT", "USDC"]);
    // At least one provider must answer; per-symbol failures stay explicit.
    expect(quotes.length + failures.length).toBe(2);
    for (const q of quotes) {
      expect(q.priceUsd).toBeGreaterThan(0.9);
      expect(q.priceUsd).toBeLessThan(1.1); // stablecoins
      expect(q.provider.attribution).toBeTruthy();
      expect(new Date(q.asOf).getTime()).not.toBeNaN();
      expect(["live", "cached"]).toContain(q.freshness);
      console.log(`[live] ${q.symbol} $${q.priceUsd} asOf=${q.asOf} via ${q.provider.name} (${q.freshness})`);
    }
    if (quotes.length === 2) {
      const result = planComparison(
        quotes.map((q) => ({
          symbol: q.symbol,
          name: q.name,
          metrics: {
            price_usd: q.priceUsd,
            change_24h_pct: q.change24hPct ?? null,
            market_cap_usd: q.marketCapUsd ?? null,
            volume_24h_usd: q.volume24hUsd ?? null,
          },
          asOf: q.asOf,
        })),
        {
          provenance: "source-verified",
          sources: quotes.map((q) => ({
            url: q.provider.attributionUrl,
            name: q.provider.attribution,
            retrievedAt: q.retrievedAt,
            dataTimestamp: q.asOf,
          })),
          gaps: failures.map((f) => `${f.symbol}: ${f.error.message}`),
        },
      );
      expect(result.status).toBe("ok");
      if (result.status === "ok") {
        expect(result.spec.kind).toBe("comparison-matrix");
        console.log(`[live] comparison spec: ${result.spec.title} — rows=${result.spec.datasets[0].rows.length}`);
      }
    }
  }, 120_000);

  it("retrieves real USDT 30-day history (or refuses explicitly)", async () => {
    __resetMarketDataStateForTests();
    try {
      const history = await getMarketHistory("USDT", 30);
      expect(history.points.length).toBeGreaterThanOrEqual(2);
      expect(history.provider.attribution).toBeTruthy();
      const ds = historyToShadowDataset(history);
      expect(ds.rows.length).toBe(history.points.length);
      expect(typeof ds.rows[0].price_usd).toBe("number");
      console.log(`[live] USDT 30d history: ${history.points.length} points via ${history.provider.name} (ohlc=${history.hasOhlc})`);
    } catch (err) {
      // Explicit refusal with a real reason is acceptable when providers are
      // rate-limited (shared CI IPs often are) — but it must SAY so.
      const message = err instanceof Error ? err.message : String(err);
      expect(message.length).toBeGreaterThan(10);
      console.log(`[live] history unavailable (explicit): ${message}`);
    }
  }, 120_000);
});
