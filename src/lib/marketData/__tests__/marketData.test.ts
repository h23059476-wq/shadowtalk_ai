/**
 * Batch 2 — public market-data adapter tests.
 * Uses a mocked global fetch; fake timers advance the rate-limiter sleeps.
 * Covers: quote/history parsing, attribution + timestamps, transparent
 * caching, 429 → retry → rate_limited, key-required mapping, stealth-mode
 * error mapping, history fallback to Binance klines, invalid symbols.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  BUILTIN_ASSETS,
  COINGECKO_PROVIDER,
  BINANCE_PROVIDER,
  COINPAPRIKA_PROVIDER,
  MarketDataError,
  __resetMarketDataStateForTests,
  getMarketHistory,
  getMarketQuote,
  getMarketQuotes,
  historyToShadowDataset,
  resolveAsset,
} from "../index";

const fetchMock = vi.fn();

function coingeckoPriceBody(overrides: Record<string, unknown> = {}) {
  return {
    tether: {
      usd: 1.0001,
      usd_24h_change: 0.01,
      usd_market_cap: 180_500_000_000,
      usd_24h_vol: 90_000_000_000,
      last_updated_at: 1_760_000_000,
      ...overrides,
    },
  };
}

function jsonResponse(status: number, body: unknown, headers: Record<string, string> = {}) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: (k: string) => headers[k.toLowerCase()] ?? null },
    json: async () => body,
  };
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal("fetch", fetchMock);
  __resetMarketDataStateForTests();
  fetchMock.mockReset();
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("getMarketQuote", () => {
  it("parses a CoinGecko quote with provider attribution and timestamps", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(200, coingeckoPriceBody()));
    const promise = getMarketQuote("USDT");
    await vi.advanceTimersByTimeAsync(100);
    const quote = await promise;
    expect(quote.symbol).toBe("USDT");
    expect(quote.priceUsd).toBe(1.0001);
    expect(quote.marketCapUsd).toBe(180_500_000_000);
    expect(quote.change24hPct).toBe(0.01);
    expect(quote.freshness).toBe("live");
    expect(quote.provider.id).toBe("coingecko");
    expect(quote.provider.attribution).toContain("CoinGecko");
    expect(new Date(quote.asOf).getTime()).toBe(1_760_000_000 * 1000);
    expect(quote.retrievedAt).toBeTruthy();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const url = fetchMock.mock.calls[0][0] as string;
    expect(url).toContain("ids=tether");
    // Privacy: only asset ids are sent — no other query content.
    expect(url).not.toMatch(/user|session|key/i);
  });

  it("serves a transparent cache hit within TTL (no second fetch)", async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, coingeckoPriceBody()));
    const p1 = getMarketQuote("USDT");
    await vi.advanceTimersByTimeAsync(100);
    await p1;
    const p2 = getMarketQuote("USDT");
    await vi.advanceTimersByTimeAsync(100);
    const cached = await p2;
    expect(cached.freshness).toBe("cached");
    expect(typeof cached.cacheAgeMs).toBe("number");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("retries once on 429 and then fails with rate_limited (across the provider chain)", async () => {
    fetchMock.mockResolvedValue(jsonResponse(429, { status: { error_code: 429 } }, { "retry-after": "1" }));
    const promise = getMarketQuote("USDT").catch((e) => e);
    // advance through: attempts + retry-after sleeps across the fallback chain
    await vi.advanceTimersByTimeAsync(30_000);
    const err = (await promise) as MarketDataError;
    expect(err).toBeInstanceOf(MarketDataError);
    expect(err.code).toBe("rate_limited");
    // CoinGecko (×2 with its retry) + CoinPaprika (×2 with its retry).
    expect(fetchMock).toHaveBeenCalledTimes(4);
  });

  it("maps 401/403 to an explicit key_required error (never pretends it's free)", async () => {
    fetchMock.mockResolvedValue(jsonResponse(401, { error: "unauthorized" }));
    const promise = getMarketQuote("USDT").catch((e) => e);
    await vi.advanceTimersByTimeAsync(100);
    const err = (await promise) as MarketDataError;
    expect(err.code).toBe("key_required");
    expect(err.message).toMatch(/requires an API key/i);
  });

  it("maps stealth-mode fetch blocks to stealth_blocked", async () => {
    fetchMock.mockRejectedValue(new Error("Network blocked by Stealth Mode"));
    const promise = getMarketQuote("USDT").catch((e) => e);
    await vi.advanceTimersByTimeAsync(100);
    const err = (await promise) as MarketDataError;
    expect(err.code).toBe("stealth_blocked");
    expect(err.message).toMatch(/Stealth Mode/i);
  });

  it("falls back to Binance ticker when CoinGecko AND CoinPaprika are down (no market cap)", async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse(500, { error: "down" })) // coingecko fails
      .mockResolvedValueOnce(jsonResponse(404, { error: "not found" })) // coinpaprika fails
      .mockResolvedValueOnce(
        jsonResponse(200, {
          symbol: "USDCUSDT",
          lastPrice: "1.0009",
          priceChangePercent: "-0.012",
          quoteVolume: "210748305.59",
          closeTime: 1_760_000_500_000,
        }),
      );
    // USDC has a binancePair; USDT does not — use USDC for the fallback test.
    const promise = getMarketQuote("USDC");
    await vi.advanceTimersByTimeAsync(15_000);
    const quote = await promise;
    expect(quote.provider.id).toBe("binance");
    expect(quote.priceUsd).toBeCloseTo(1.0009);
    expect(quote.marketCapUsd).toBeUndefined();
  });

  it("falls back to CoinPaprika (with market cap) when CoinGecko is down", async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse(429, {}, { "retry-after": "1" })) // coingecko 429
      .mockResolvedValueOnce(jsonResponse(429, {}, { "retry-after": "1" })) // coingecko retry
      .mockResolvedValueOnce(
        jsonResponse(200, {
          id: "usdt-tether",
          last_updated: "2026-11-09T13:45:15Z",
          quotes: { USD: { price: 0.99946, volume_24h: 36_187_686_171, market_cap: 176_949_395_243, percent_change_24h: 0.07 } },
        }),
      );
    const promise = getMarketQuote("USDT");
    await vi.advanceTimersByTimeAsync(20_000);
    const quote = await promise;
    expect(quote.provider.id).toBe("coinpaprika");
    expect(quote.priceUsd).toBeCloseTo(0.99946);
    expect(quote.marketCapUsd).toBe(176_949_395_243);
    expect(quote.asOf).toBe("2026-11-09T13:45:15Z");
  });

  it("fails with invalid_symbol for unresolvable input", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(200, { coins: [] })); // search empty
    const promise = resolveAsset("ZZZZZ").catch((e) => e);
    await vi.advanceTimersByTimeAsync(100);
    const err = (await promise) as MarketDataError;
    expect(err.code).toBe("invalid_symbol");
  });
});

describe("getMarketHistory", () => {
  it("parses CoinGecko daily history into points (no fake OHLC)", async () => {
    const prices = Array.from({ length: 30 }, (_, i) => [(1_759_000_000 + i * 86_400) * 1000, 1 + i * 0.0001]);
    fetchMock.mockResolvedValueOnce(jsonResponse(200, { prices }));
    const promise = getMarketHistory("USDT", 30);
    await vi.advanceTimersByTimeAsync(100);
    const history = await promise;
    expect(history.points).toHaveLength(30);
    expect(history.hasOhlc).toBe(false);
    expect(history.candles).toBeUndefined();
    expect(history.provider.id).toBe("coingecko");
    expect(history.points[0].price).toBe(1);
  });

  it("falls back to Binance klines with REAL OHLC when CoinGecko is rate-limited", async () => {
    const kline = (i: number) => [
      (1_759_000_000 + i * 86_400) * 1000,
      "1.0010",
      "1.0020",
      "1.0000",
      "1.0015",
      "1000000",
      (1_759_000_000 + i * 86_400) * 1000 + 86_399_000,
      "1001500",
      300,
      "500000",
      "500750",
      "0",
    ];
    fetchMock
      .mockResolvedValueOnce(jsonResponse(429, {}, { "retry-after": "1" })) // coingecko 429
      .mockResolvedValueOnce(jsonResponse(429, {}, { "retry-after": "1" })) // coingecko retry
      .mockResolvedValueOnce(jsonResponse(200, Array.from({ length: 30 }, (_, i) => kline(i)))); // binance klines
    const promise = getMarketHistory("USDC", 30);
    await vi.advanceTimersByTimeAsync(30_000);
    const history = await promise;
    expect(history.provider.id).toBe("binance");
    expect(history.hasOhlc).toBe(true);
    expect(history.candles).toHaveLength(30);
    const c = history.candles![0];
    expect(c.high).toBeGreaterThanOrEqual(Math.max(c.open, c.close));
    expect(c.low).toBeLessThanOrEqual(Math.min(c.open, c.close));
  });

  it("returns an explicit error when both providers fail (no invented history)", async () => {
    fetchMock.mockResolvedValue(jsonResponse(429, {}, { "retry-after": "1" }));
    const promise = getMarketHistory("USDC", 30).catch((e) => e);
    await vi.advanceTimersByTimeAsync(60_000);
    const err = (await promise) as MarketDataError;
    expect(err).toBeInstanceOf(MarketDataError);
    expect(["rate_limited", "unavailable"]).toContain(err.code);
  });
});

describe("batch + dataset conversion", () => {
  it("reports per-symbol failures without failing the batch", async () => {
    fetchMock.mockImplementation(async (url: string) => {
      if (url.includes("ids=tether")) return jsonResponse(200, coingeckoPriceBody());
      return jsonResponse(200, { coins: [] }); // unknown asset search
    });
    const promise = getMarketQuotes(["USDT", "ZZZZZ"]);
    // Two sequential CoinGecko calls, each gated by the ~5s keyless interval.
    await vi.advanceTimersByTimeAsync(12_000);
    const { quotes, failures } = await promise;
    expect(quotes).toHaveLength(1);
    expect(quotes[0].symbol).toBe("USDT");
    expect(failures).toHaveLength(1);
    expect(failures[0].symbol).toBe("ZZZZZ");
  });

  it("converts history to a typed dataset with provider attribution", async () => {
    const prices = Array.from({ length: 5 }, (_, i) => [(1_759_000_000 + i * 86_400) * 1000, 1 + i * 0.001]);
    fetchMock.mockResolvedValueOnce(jsonResponse(200, { prices }));
    const promise = getMarketHistory("USDT", 5);
    await vi.advanceTimersByTimeAsync(100);
    const history = await promise;
    const ds = historyToShadowDataset(history);
    expect(ds.columns.some((c) => c.key === "date" && c.type === "date")).toBe(true);
    expect(ds.columns.some((c) => c.key === "price_usd")).toBe(true);
    expect(ds.rows).toHaveLength(5);
    expect(ds.description).toContain("CoinGecko");
  });
});

describe("provider documentation", () => {
  it("documents key-required limitations explicitly", () => {
    expect(COINGECKO_PROVIDER.keyLimitations).toMatch(/Demo plan|rate-limit/i);
    expect(BINANCE_PROVIDER.keyLimitations).toMatch(/market cap|regions/i);
    expect(COINPAPRIKA_PROVIDER.keyLimitations).toMatch(/20 calls\/min|daily-only/i);
    expect(COINGECKO_PROVIDER.keyless).toBe(true);
    expect(BINANCE_PROVIDER.keyless).toBe(true);
    expect(COINPAPRIKA_PROVIDER.keyless).toBe(true);
  });

  it("has builtin mappings for the stablecoins in the E2E scenario", () => {
    expect(BUILTIN_ASSETS.USDT.coingeckoId).toBe("tether");
    expect(BUILTIN_ASSETS.USDC.binancePair).toBe("USDCUSDT");
  });
});
