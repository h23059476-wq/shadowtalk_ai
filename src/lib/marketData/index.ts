/**
 * Public market-data adapter (Batch 2 — approved D2 scope).
 *
 * PROVIDER EVALUATION (November 2026, verified against provider docs):
 *
 *  - CoinGecko public (keyless) API — `api.coingecko.com/api/v3`:
 *      * `GET /simple/price` and `GET /coins/{id}/market_chart` work WITHOUT
 *        any account or key.
 *      * Rate limit: roughly 5–15 calls/min (varies with global load).
 *        The free "Demo" plan (account + demo key) raises this to ~30
 *        calls/min with a 10k calls/month cap; paid plans go higher. We do
 *        NOT ship or embed any key — the adapter is keyless-only.
 *      * `market_chart` supplies real historical price/volume/market-cap
 *        series (daily resolution). History is only claimed when the
 *        provider actually returned it — never synthesized.
 *      * CoinGecko requires visible attribution ("Powered by CoinGecko").
 *
 *  - Binance public REST — `api.binance.com/api/v3`:
 *      * `/ticker/24hr` and `/klines` are public (no key), IP-rate-limited
 *        (HTTP 429 + weight system). Provides true OHLCV klines — the only
 *        provider here that can back a candlestick chart.
 *      * No market-cap data (pairs only) — quotes fall back to CoinGecko
 *        for market cap. Geo-restricted in some regions; failures are
 *        surfaced as `unavailable`, never papered over.
 *
 *  - Endpoints that DO require a key (documented, not faked): CoinGecko
 *    Pro endpoints (minute-granularity history, higher volumes) and any
 *    authenticated Binance account endpoints. The adapter never calls them.
 *
 *  - CoinPaprika public API — `api.coinpaprika.com/v1` (third keyless
 *    fallback):
 *      * `/tickers/{id}` (quotes WITH market cap) and `/coins/{id}/ohlcv/
 *        historical` (daily OHLCV) are free and CORS-open.
 *      * Free tier: ~20 calls/min; daily-only history (~1 year of depth).
 *
 * PRIVACY (D2 condition): requests carry ONLY public asset identifiers
 * (e.g. `ids=tether`). No conversation content, user identifiers, keys or
 * session data ever reach a provider. This adapter is fully independent of
 * AI provider authentication and changes nothing about BYOK.
 *
 * INTEGRITY: values are passed through verbatim (no interpolation, no
 * backfilling of missing candles). Freshness is explicit on every payload;
 * caches are transparent (`freshness: "cached"` + age) and expired data is
 * never served as a fallback after a failed refresh.
 */

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

export interface MarketProviderInfo {
  id: "coingecko" | "binance" | "coinpaprika";
  name: string;
  /** Human-readable attribution line (CoinGecko requires it). */
  attribution: string;
  attributionUrl: string;
  /** True when this provider works without any account/key. */
  keyless: boolean;
  /** Documented limitation of key-required endpoints, when relevant. */
  keyLimitations?: string;
}

export const COINGECKO_PROVIDER: MarketProviderInfo = {
  id: "coingecko",
  name: "CoinGecko (public keyless API)",
  attribution: "Data powered by CoinGecko",
  attributionUrl: "https://www.coingecko.com/en/api",
  keyless: true,
  keyLimitations:
    "Keyless access is rate-limited to roughly 5–15 calls/min. CoinGecko's free Demo plan (your own account) raises this to ~30 calls/min; Pro endpoints (minute-granularity history) require a paid key and are never called by this adapter.",
};

export const BINANCE_PROVIDER: MarketProviderInfo = {
  id: "binance",
  name: "Binance (public market API)",
  attribution: "Data from Binance public API",
  attributionUrl: "https://developers.binance.com/docs/binance-spot-api-docs",
  keyless: true,
  keyLimitations:
    "Market-data endpoints are public; account endpoints require keys and are never called. Binance does not provide market cap, and the API is unavailable in some regions.",
};

export const COINPAPRIKA_PROVIDER: MarketProviderInfo = {
  id: "coinpaprika",
  name: "CoinPaprika (public API)",
  attribution: "Data powered by CoinPaprika",
  attributionUrl: "https://api.coinpaprika.com",
  keyless: true,
  keyLimitations:
    "Keyless access works for /tickers (quotes) and the most recent day of /ohlcv historical data (~20 calls/min). Deeper OHLCV history returns \"not allowed in this plan\" and now REQUIRES a paid key (verified 2026-11) — this adapter surfaces that as an explicit key_required error instead of pretending the endpoint is free.",
};

export interface MarketQuote {
  symbol: string;
  name?: string;
  priceUsd: number;
  change24hPct?: number;
  marketCapUsd?: number;
  volume24hUsd?: number;
  /** Provider-declared data timestamp (ISO). */
  asOf: string;
  /** When we retrieved it (ISO). */
  retrievedAt: string;
  freshness: "live" | "cached";
  cacheAgeMs?: number;
  provider: MarketProviderInfo;
}

export interface MarketCandle {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

export interface MarketHistoryPoint {
  time: string;
  price: number;
}

export interface MarketHistory {
  symbol: string;
  granularity: "daily";
  points: MarketHistoryPoint[];
  /** Present only when the provider supplies true OHLCV (Binance klines). */
  candles?: MarketCandle[];
  hasOhlc: boolean;
  asOf: string;
  retrievedAt: string;
  provider: MarketProviderInfo;
}

export type MarketDataErrorCode =
  | "rate_limited"
  | "unavailable"
  | "not_found"
  | "invalid_symbol"
  | "key_required"
  | "stealth_blocked";

export class MarketDataError extends Error {
  code: MarketDataErrorCode;
  provider?: MarketProviderInfo;
  retryAfterMs?: number;

  constructor(code: MarketDataErrorCode, message: string, opts?: { provider?: MarketProviderInfo; retryAfterMs?: number }) {
    super(message);
    this.name = "MarketDataError";
    this.code = code;
    this.provider = opts?.provider;
    this.retryAfterMs = opts?.retryAfterMs;
  }
}

/* ------------------------------------------------------------------ */
/* Asset resolution                                                    */
/* ------------------------------------------------------------------ */

interface AssetInfo {
  symbol: string;
  name: string;
  coingeckoId: string;
  /** Binance quote pair suffix, when a spot pair exists (e.g. BTCUSDT). */
  binancePair?: string;
  /** CoinPaprika asset id (e.g. "usdt-tether"). */
  paprikaId?: string;
}

/** Small builtin map for common assets (avoids a search round-trip). */
export const BUILTIN_ASSETS: Record<string, AssetInfo> = {
  USDT: { symbol: "USDT", name: "Tether", coingeckoId: "tether", paprikaId: "usdt-tether" },
  USDC: { symbol: "USDC", name: "USD Coin", coingeckoId: "usd-coin", binancePair: "USDCUSDT", paprikaId: "usdc-usd-coin" },
  DAI: { symbol: "DAI", name: "Dai", coingeckoId: "dai", binancePair: "DAIUSDT", paprikaId: "dai-dai" },
  BTC: { symbol: "BTC", name: "Bitcoin", coingeckoId: "bitcoin", binancePair: "BTCUSDT", paprikaId: "btc-bitcoin" },
  ETH: { symbol: "ETH", name: "Ethereum", coingeckoId: "ethereum", binancePair: "ETHUSDT", paprikaId: "eth-ethereum" },
  SOL: { symbol: "SOL", name: "Solana", coingeckoId: "solana", binancePair: "SOLUSDT", paprikaId: "sol-solana" },
  BNB: { symbol: "BNB", name: "BNB", coingeckoId: "binancecoin", binancePair: "BNBUSDT", paprikaId: "bnb-binance-coin" },
  XRP: { symbol: "XRP", name: "XRP", coingeckoId: "ripple", binancePair: "XRPUSDT", paprikaId: "xrp-xrp" },
  ADA: { symbol: "ADA", name: "Cardano", coingeckoId: "cardano", binancePair: "ADAUSDT", paprikaId: "ada-cardano" },
  DOGE: { symbol: "DOGE", name: "Dogecoin", coingeckoId: "dogecoin", binancePair: "DOGEUSDT", paprikaId: "doge-dogecoin" },
};

const symbolCache = new Map<string, AssetInfo | null>();

async function searchCoinGeckoId(symbol: string): Promise<AssetInfo | null> {
  const upper = symbol.toUpperCase();
  if (symbolCache.has(upper)) return symbolCache.get(upper)!;
  try {
    const json = (await fetchProviderJson(
      COINGECKO_PROVIDER,
      `https://api.coingecko.com/api/v3/search?query=${encodeURIComponent(symbol)}`,
    )) as { coins?: Array<{ id?: string; symbol?: string; name?: string }> };
    const coins = Array.isArray(json?.coins) ? json.coins : [];
    const exact = coins.find((c) => typeof c?.symbol === "string" && c.symbol.toUpperCase() === upper);
    const hit = exact ?? (coins.length === 1 ? coins[0] : null);
    const info: AssetInfo | null = hit?.id
      ? { symbol: upper, name: String(hit.name ?? upper), coingeckoId: String(hit.id) }
      : null;
    symbolCache.set(upper, info);
    return info;
  } catch {
    symbolCache.set(upper, null);
    return null;
  }
}

export async function resolveAsset(symbol: string): Promise<AssetInfo> {
  const upper = symbol.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (!upper || upper.length > 12) throw new MarketDataError("invalid_symbol", `"${symbol}" is not a recognizable asset symbol.`);
  const builtin = BUILTIN_ASSETS[upper];
  if (builtin) return builtin;
  const searched = await searchCoinGeckoId(upper);
  if (searched) return searched;
  throw new MarketDataError("invalid_symbol", `Could not resolve "${symbol}" to a known asset. Try a common symbol like USDT, USDC or BTC.`);
}

/* ------------------------------------------------------------------ */
/* Transport: rate limiting, timeouts, 429 handling                    */
/* ------------------------------------------------------------------ */

const FETCH_TIMEOUT_MS = 12_000;
/** Minimum spacing between calls to the same provider (keyless politeness). */
const PROVIDER_MIN_INTERVAL_MS: Record<string, number> = {
  coingecko: 5_000, // keyless budget is ~5–15 calls/min
  binance: 1_200,
  coinpaprika: 3_500, // free tier ~20 calls/min
};

const providerState = new Map<string, { lastCallAt: number; blockedUntil: number }>();

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function respectRateLimit(providerId: string): Promise<void> {
  const state = providerState.get(providerId) ?? { lastCallAt: 0, blockedUntil: 0 };
  const now = Date.now();
  if (state.blockedUntil > now) await sleep(state.blockedUntil - now);
  const minInterval = PROVIDER_MIN_INTERVAL_MS[providerId] ?? 2_000;
  const earliest = Math.max(state.lastCallAt + minInterval, state.blockedUntil);
  const wait = earliest - Date.now();
  if (wait > 0) await sleep(wait);
  providerState.set(providerId, { ...state, lastCallAt: Date.now() });
}

function markRateLimited(providerId: string, retryAfterMs: number): void {
  const state = providerState.get(providerId) ?? { lastCallAt: 0, blockedUntil: 0 };
  providerState.set(providerId, { ...state, blockedUntil: Date.now() + retryAfterMs });
}

async function fetchProviderJson(provider: MarketProviderInfo, url: string, retry = true): Promise<unknown> {
  await respectRateLimit(provider.id);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  let response: Response;
  try {
    response = await fetch(url, {
      method: "GET",
      signal: controller.signal,
      headers: { Accept: "application/json" },
      // NOTE: no credentials, no user data — public GET only.
    });
  } catch (err) {
    clearTimeout(timer);
    const message = err instanceof Error ? err.message : String(err);
    if (/stealth mode/i.test(message)) {
      throw new MarketDataError("stealth_blocked", "Market data is unavailable in Stealth Mode — external network access is disabled.", { provider });
    }
    throw new MarketDataError("unavailable", `Could not reach ${provider.name}: ${message}`, { provider });
  }
  clearTimeout(timer);

  if (response.status === 429) {
    const retryAfterHeader = response.headers.get("retry-after");
    const retryAfterMs = retryAfterHeader ? Math.min(parseFloat(retryAfterHeader) * 1000 || 0, 20_000) : 8_000;
    markRateLimited(provider.id, retryAfterMs);
    if (retry) {
      await sleep(retryAfterMs);
      return fetchProviderJson(provider, url, false);
    }
    throw new MarketDataError(
      "rate_limited",
      `${provider.name} rate limit reached (public access is ~5–15 calls/min). Try again in a few seconds.`,
      { provider, retryAfterMs },
    );
  }
  if (response.status === 401 || response.status === 403) {
    throw new MarketDataError(
      "key_required",
      `${provider.name} requires an API key for this endpoint. This adapter only uses public keyless endpoints — the endpoint may have changed or is regionally blocked.`,
      { provider },
    );
  }
  if (!response.ok) {
    throw new MarketDataError("unavailable", `${provider.name} returned HTTP ${response.status}.`, { provider });
  }
  try {
    return await response.json();
  } catch {
    throw new MarketDataError("unavailable", `${provider.name} returned a malformed response.`, { provider });
  }
}

/* ------------------------------------------------------------------ */
/* Cache — transparent hits, never a silent stale fallback             */
/* ------------------------------------------------------------------ */

interface CacheEntry<T> { value: T; expiresAt: number; storedAt: number }
const quoteCache = new Map<string, CacheEntry<MarketQuote>>();
const historyCache = new Map<string, CacheEntry<MarketHistory>>();

const QUOTE_TTL_MS = 60_000;
const HISTORY_TTL_MS = 10 * 60_000;

/** Test hook — clears module-level caches/rate-limit state. */
export function __resetMarketDataStateForTests(): void {
  quoteCache.clear();
  historyCache.clear();
  symbolCache.clear();
  providerState.clear();
}

/* ------------------------------------------------------------------ */
/* Public API                                                          */
/* ------------------------------------------------------------------ */

function isoFromSeconds(sec: unknown, fallback: number): string {
  return new Date(typeof sec === "number" && sec > 0 ? sec * 1000 : fallback).toISOString();
}

interface CoinGeckoSimplePrice {
  usd?: number;
  usd_24h_change?: number;
  usd_market_cap?: number;
  usd_24h_vol?: number;
  last_updated_at?: number;
}

/**
 * Current market snapshot for one asset. Provider chain: CoinGecko →
 * CoinPaprika (quotes WITH market cap) → Binance 24hr ticker (real exchange
 * data, no market cap). The first provider that actually answers wins; the
 * used provider is named on the quote.
 */
export async function getMarketQuote(symbolInput: string): Promise<MarketQuote> {
  const asset = await resolveAsset(symbolInput);
  const cacheKey = `quote:${asset.symbol}`;
  const cached = quoteCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return {
      ...cached.value,
      freshness: "cached",
      cacheAgeMs: Date.now() - cached.storedAt,
    };
  }

  const now = Date.now();
  try {
    const json = (await fetchProviderJson(
      COINGECKO_PROVIDER,
      `https://api.coingecko.com/api/v3/simple/price?ids=${encodeURIComponent(asset.coingeckoId)}&vs_currencies=usd&include_24hr_change=true&include_market_cap=true&include_24hr_vol=true&include_last_updated_at=true`,
    )) as Record<string, CoinGeckoSimplePrice>;
    const row = json?.[asset.coingeckoId];
    if (!row || typeof row.usd !== "number" || !Number.isFinite(row.usd)) {
      throw new MarketDataError("not_found", `CoinGecko returned no price for ${asset.symbol}.`, { provider: COINGECKO_PROVIDER });
    }
    const quote: MarketQuote = {
      symbol: asset.symbol,
      name: asset.name,
      priceUsd: row.usd,
      ...(typeof row.usd_24h_change === "number" ? { change24hPct: row.usd_24h_change } : {}),
      ...(typeof row.usd_market_cap === "number" ? { marketCapUsd: row.usd_market_cap } : {}),
      ...(typeof row.usd_24h_vol === "number" ? { volume24hUsd: row.usd_24h_vol } : {}),
      asOf: isoFromSeconds(row.last_updated_at, now),
      retrievedAt: new Date().toISOString(),
      freshness: "live",
      provider: COINGECKO_PROVIDER,
    };
    quoteCache.set(cacheKey, { value: quote, expiresAt: Date.now() + QUOTE_TTL_MS, storedAt: Date.now() });
    return quote;
  } catch (err) {
    if (!(err instanceof MarketDataError) || !["rate_limited", "unavailable"].includes(err.code)) throw err;
    // Fallback 1: CoinPaprika ticker (real data incl. market cap).
    if (asset.paprikaId) {
      try {
        const pap = (await fetchProviderJson(
          COINPAPRIKA_PROVIDER,
          `https://api.coinpaprika.com/v1/tickers/${encodeURIComponent(asset.paprikaId)}`,
        )) as {
          last_updated?: string;
          quotes?: { USD?: { price?: number; volume_24h?: number; market_cap?: number; percent_change_24h?: number } };
        };
        const usd = pap?.quotes?.USD;
        if (usd && typeof usd.price === "number" && Number.isFinite(usd.price)) {
          const quote: MarketQuote = {
            symbol: asset.symbol,
            name: asset.name,
            priceUsd: usd.price,
            ...(typeof usd.percent_change_24h === "number" ? { change24hPct: usd.percent_change_24h } : {}),
            ...(typeof usd.market_cap === "number" ? { marketCapUsd: usd.market_cap } : {}),
            ...(typeof usd.volume_24h === "number" ? { volume24hUsd: usd.volume_24h } : {}),
            asOf: pap.last_updated && Number.isFinite(Date.parse(pap.last_updated)) ? pap.last_updated : new Date(now).toISOString(),
            retrievedAt: new Date().toISOString(),
            freshness: "live",
            provider: COINPAPRIKA_PROVIDER,
          };
          quoteCache.set(cacheKey, { value: quote, expiresAt: Date.now() + QUOTE_TTL_MS, storedAt: Date.now() });
          return quote;
        }
      } catch {
        // fall through to Binance
      }
    }
    // Fallback 2: Binance 24hr ticker (real exchange data, no market cap).
    if (!asset.binancePair) throw err;
    const json = (await fetchProviderJson(
      BINANCE_PROVIDER,
      `https://api.binance.com/api/v3/ticker/24hr?symbol=${asset.binancePair}`,
    )) as Record<string, string>;
    const price = parseFloat(json?.lastPrice ?? "");
    const pct = parseFloat(json?.priceChangePercent ?? "");
    const volume = parseFloat(json?.quoteVolume ?? "");
    if (!Number.isFinite(price)) {
      throw new MarketDataError("not_found", `Binance returned no price for ${asset.binancePair}.`, { provider: BINANCE_PROVIDER });
    }
    const closeTime = parseFloat(json?.closeTime ?? "");
    const quote: MarketQuote = {
      symbol: asset.symbol,
      name: asset.name,
      priceUsd: price,
      ...(Number.isFinite(pct) ? { change24hPct: pct } : {}),
      ...(Number.isFinite(volume) ? { volume24hUsd: volume } : {}),
      asOf: new Date(Number.isFinite(closeTime) ? closeTime : now).toISOString(),
      retrievedAt: new Date().toISOString(),
      freshness: "live",
      provider: BINANCE_PROVIDER,
    };
    quoteCache.set(cacheKey, { value: quote, expiresAt: Date.now() + QUOTE_TTL_MS, storedAt: Date.now() });
    return quote;
  }
}

/**
 * Historical daily series. Provider chain: CoinGecko market_chart (prices)
 * → Binance klines (true OHLCV) → CoinPaprika daily OHLCV. If NO provider
 * can serve history the caller gets an explicit error — a snapshot is NEVER
 * stretched into history.
 */
export async function getMarketHistory(symbolInput: string, days: number): Promise<MarketHistory> {
  const asset = await resolveAsset(symbolInput);
  const clampedDays = Math.min(Math.max(Math.round(days), 1), 365);
  const cacheKey = `history:${asset.symbol}:${clampedDays}`;
  const cached = historyCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return { ...cached.value };
  }

  try {
    const json = (await fetchProviderJson(
      COINGECKO_PROVIDER,
      `https://api.coingecko.com/api/v3/coins/${encodeURIComponent(asset.coingeckoId)}/market_chart?vs_currency=usd&days=${clampedDays}&interval=daily`,
    )) as { prices?: Array<[number, number]> };
    const prices = Array.isArray(json?.prices) ? json.prices : [];
    const points = prices
      .filter((p) => Array.isArray(p) && typeof p[0] === "number" && typeof p[1] === "number" && Number.isFinite(p[1]))
      .map((p) => ({ time: new Date(p[0]).toISOString(), price: p[1] }));
    if (points.length < 2) {
      throw new MarketDataError("not_found", `CoinGecko returned no usable ${clampedDays}-day history for ${asset.symbol}.`, { provider: COINGECKO_PROVIDER });
    }
    const history: MarketHistory = {
      symbol: asset.symbol,
      granularity: "daily",
      points,
      hasOhlc: false,
      asOf: points[points.length - 1].time,
      retrievedAt: new Date().toISOString(),
      provider: COINGECKO_PROVIDER,
    };
    historyCache.set(cacheKey, { value: history, expiresAt: Date.now() + HISTORY_TTL_MS, storedAt: Date.now() });
    return history;
  } catch (err) {
    if (!(err instanceof MarketDataError) || !["rate_limited", "unavailable"].includes(err.code)) throw err;
    // Fallback 1: Binance klines (true OHLCV, pairs only).
    if (asset.binancePair) {
      try {
        return await buildBinanceKlineHistory({ symbol: asset.symbol, binancePair: asset.binancePair }, cacheKey, clampedDays);
      } catch {
        // fall through to CoinPaprika
      }
    }
    // Fallback 2: CoinPaprika daily OHLCV (covers assets without a Binance
    // pair, e.g. USDT itself). Real OHLC — never synthesized. NOTE (verified
    // 2026-11): the free plan only serves the most recent day; older ranges
    // return a "not allowed in this plan" payload → surfaced as key_required.
    if (asset.paprikaId) {
      const start = new Date(Date.now() - clampedDays * 86_400_000).toISOString().slice(0, 10);
      const rows = (await fetchProviderJson(
        COINPAPRIKA_PROVIDER,
        `https://api.coinpaprika.com/v1/coins/${encodeURIComponent(asset.paprikaId)}/ohlcv/historical?start=${start}&interval=1d`,
      )) as Array<{ time_open?: string; open?: number; high?: number; low?: number; close?: number; volume?: number }>; 
      if (!Array.isArray(rows) && typeof rows === "object" && rows !== null && "error" in (rows as Record<string, unknown>)) {
        throw new MarketDataError(
          "key_required",
          `CoinPaprika's free plan does not include this historical range (paid key required): ${String((rows as Record<string, unknown>).error).slice(0, 160)}`,
          { provider: COINPAPRIKA_PROVIDER },
        );
      }
      const candles: MarketCandle[] = [];
      const points: MarketHistoryPoint[] = [];
      for (const row of Array.isArray(rows) ? rows : []) {
        if (
          !row?.time_open ||
          ![row.open, row.high, row.low, row.close].every((v) => typeof v === "number" && Number.isFinite(v))
        ) continue;
        const time = new Date(row.time_open).toISOString();
        candles.push({ time, open: row.open!, high: row.high!, low: row.low!, close: row.close!, ...(typeof row.volume === "number" ? { volume: row.volume } : {}) });
        points.push({ time, price: row.close! });
      }
      if (points.length >= 2) {
        const history: MarketHistory = {
          symbol: asset.symbol,
          granularity: "daily",
          points,
          candles,
          hasOhlc: true,
          asOf: points[points.length - 1].time,
          retrievedAt: new Date().toISOString(),
          provider: COINPAPRIKA_PROVIDER,
        };
        historyCache.set(cacheKey, { value: history, expiresAt: Date.now() + HISTORY_TTL_MS, storedAt: Date.now() });
        return history;
      }
    }
    throw err;
  }
}

/** Binance klines helper (true OHLCV) shared by the history fallback chain. */
async function buildBinanceKlineHistory(asset: { symbol: string; binancePair: string }, cacheKey: string, clampedDays: number): Promise<MarketHistory> {
  const json = (await fetchProviderJson(
    BINANCE_PROVIDER,
    `https://api.binance.com/api/v3/klines?symbol=${asset.binancePair}&interval=1d&limit=${Math.min(clampedDays, 1000)}`,
  )) as unknown[];
  if (!Array.isArray(json) || json.length === 0) {
    throw new MarketDataError("not_found", `Binance returned no klines for ${asset.binancePair}.`, { provider: BINANCE_PROVIDER });
  }
  const candles: MarketCandle[] = [];
  const points: MarketHistoryPoint[] = [];
  for (const row of json) {
    if (!Array.isArray(row)) continue;
    const openTime = row[0];
    const open = parseFloat(String(row[1] ?? ""));
    const high = parseFloat(String(row[2] ?? ""));
    const low = parseFloat(String(row[3] ?? ""));
    const close = parseFloat(String(row[4] ?? ""));
    const volume = parseFloat(String(row[5] ?? ""));
    if (!(typeof openTime === "number") || ![open, high, low, close].every(Number.isFinite)) continue;
    const time = new Date(openTime).toISOString();
    candles.push({ time, open, high, low, close, ...(Number.isFinite(volume) ? { volume } : {}) });
    points.push({ time, price: close });
  }
  if (points.length < 2) {
    throw new MarketDataError("not_found", `Binance klines for ${asset.binancePair} were unusable.`, { provider: BINANCE_PROVIDER });
  }
  const history: MarketHistory = {
    symbol: asset.symbol,
    granularity: "daily",
    points,
    candles,
    hasOhlc: true,
    asOf: points[points.length - 1].time,
    retrievedAt: new Date().toISOString(),
    provider: BINANCE_PROVIDER,
  };
  historyCache.set(cacheKey, { value: history, expiresAt: Date.now() + HISTORY_TTL_MS, storedAt: Date.now() });
  return history;
}

/**
 * Fetch a quote for each symbol in sequence (respecting provider rate
 * limits). Failures are returned per-symbol instead of failing the batch.
 */
export interface QuoteBatchResult {
  quotes: MarketQuote[];
  failures: Array<{ symbol: string; error: MarketDataError }>;
}

export async function getMarketQuotes(symbols: string[]): Promise<QuoteBatchResult> {
  const quotes: MarketQuote[] = [];
  const failures: Array<{ symbol: string; error: MarketDataError }> = [];
  for (const symbol of symbols) {
    try {
      quotes.push(await getMarketQuote(symbol));
    } catch (err) {
      failures.push({ symbol, error: err instanceof MarketDataError ? err : new MarketDataError("unavailable", String(err)) });
    }
  }
  return { quotes, failures };
}

/**
 * Convert history into a typed research-shaped dataset the planner can
 * encode. Values are passed through verbatim; the unit is USD.
 */
export function historyToShadowDataset(history: MarketHistory, title?: string): import("@/lib/visualization/types").ShadowDataset {
  const hasOhlc = Boolean(history.hasOhlc && history.candles && history.candles.length > 0);
  return {
    title: title ?? `${history.symbol} daily prices (last ${history.points.length} days)`,
    description: `Retrieved ${history.retrievedAt}. ${history.provider.attribution}.`,
    columns: hasOhlc
      ? [
          { key: "date", type: "date" as const },
          { key: "open_usd", type: "currency" as const, unit: "USD" },
          { key: "high_usd", type: "currency" as const, unit: "USD" },
          { key: "low_usd", type: "currency" as const, unit: "USD" },
          { key: "close_usd", type: "currency" as const, unit: "USD" },
          { key: "volume_usd", type: "currency" as const, unit: "USD" },
        ]
      : [
          { key: "date", type: "date" as const },
          { key: "price_usd", type: "currency" as const, unit: "USD" },
        ],
    rows: hasOhlc
      ? history.candles!.map((c) => ({
          date: c.time,
          open_usd: c.open,
          high_usd: c.high,
          low_usd: c.low,
          close_usd: c.close,
          volume_usd: c.volume ?? null,
        }))
      : history.points.map((p) => ({ date: p.time, price_usd: p.price })),
    asOf: history.asOf,
  };
}
