const db = require("../../db");
const { getJson } = require("../utils/http");

const MARKET_CACHE_TTL_MS = 30 * 1000;
const HISTORY_CACHE_TTL_MS = 5 * 60 * 1000;

const currentPriceCache = new Map();
const historicalCache = new Map();

const fallbackPrices = {
  BTCUSDT: { price: 64250.12, changePercent: 1.84 },
  ETHUSDT: { price: 3180.5, changePercent: -0.72 },
  SOLUSDT: { price: 142.33, changePercent: 3.11 },
  ADAUSDT: { price: 0.74, changePercent: 0.96 },
  BNBUSDT: { price: 582.15, changePercent: 1.22 },
  EURUSD: { price: 1.0892, changePercent: 0.15 },
  GBPUSD: { price: 1.2745, changePercent: -0.08 },
};

function normalizeProviderSymbol(symbol, quote = "USDT") {
  return `${symbol}${quote}`.replace("/", "").toUpperCase();
}

function parsePair(pair) {
  const [symbol, quote = "USDT"] = pair.toUpperCase().split("/");
  return { symbol, quote };
}

function formatSignedPercent(value) {
  const rounded = Number(value || 0).toFixed(2);
  return `${Number(rounded) >= 0 ? "+" : ""}${rounded}%`;
}

function cacheGet(cache, key) {
  const entry = cache.get(key);
  if (!entry || entry.expiresAt < Date.now()) {
    cache.delete(key);
    return null;
  }

  return entry.value;
}

function cacheSet(cache, key, value, ttlMs) {
  cache.set(key, {
    value,
    expiresAt: Date.now() + ttlMs,
  });
}

async function fetchTicker(providerSymbol) {
  const cached = cacheGet(currentPriceCache, providerSymbol);
  if (cached) {
    return cached;
  }

  try {
    const data = await getJson(
      `https://api.binance.com/api/v3/ticker/24hr?symbol=${providerSymbol}`
    );

    const ticker = {
      providerSymbol,
      price: Number(data.lastPrice),
      changePercent: Number(data.priceChangePercent),
      source: "binance",
      asOf: new Date().toISOString(),
    };

    cacheSet(currentPriceCache, providerSymbol, ticker, MARKET_CACHE_TTL_MS);
    return ticker;
  } catch (error) {
    const fallback = fallbackPrices[providerSymbol] || {
      price: 100,
      changePercent: 0,
    };
    const ticker = {
      providerSymbol,
      price: fallback.price,
      changePercent: fallback.changePercent,
      source: "fallback",
      asOf: new Date().toISOString(),
    };

    cacheSet(currentPriceCache, providerSymbol, ticker, MARKET_CACHE_TTL_MS);
    return ticker;
  }
}

async function getTickerForPair(symbol, quote = "USDT") {
  const providerSymbol = normalizeProviderSymbol(symbol, quote);
  return fetchTicker(providerSymbol);
}

async function enrichPairs(pairs) {
  const enriched = await Promise.all(
    pairs.map(async (item) => {
      const ticker = await getTickerForPair(item.symbol, item.quote);

      return {
        ...item,
        price: Number(ticker.price),
        change: formatSignedPercent(ticker.changePercent),
        marketSource: ticker.source,
        lastUpdated: ticker.asOf,
      };
    })
  );

  return enriched;
}

function mapTimeframeToBinanceInterval(timeframe) {
  const intervals = {
    "15M": "15m",
    "1H": "1h",
    "4H": "4h",
    "1D": "1d",
  };

  return intervals[timeframe] || "1h";
}

function generateFallbackHistory(symbol, quote, timeframe) {
  const providerSymbol = normalizeProviderSymbol(symbol, quote);
  const basePrice = fallbackPrices[providerSymbol]?.price || 100;
  const candleCount = 40;
  const now = Date.now();
  const stepMs = timeframe === "1D" ? 86400000 : timeframe === "4H" ? 14400000 : timeframe === "15M" ? 900000 : 3600000;
  const candles = [];
  let current = basePrice;

  for (let index = candleCount - 1; index >= 0; index -= 1) {
    const wave = Math.sin(index / 4) * basePrice * 0.01;
    const drift = (candleCount - index) * basePrice * 0.0008;
    const open = current;
    const close = Math.max(0.0001, basePrice + wave + drift);
    const high = Math.max(open, close) * 1.006;
    const low = Math.min(open, close) * 0.994;
    candles.push({
      time: new Date(now - index * stepMs).toISOString(),
      open: Number(open.toFixed(4)),
      high: Number(high.toFixed(4)),
      low: Number(low.toFixed(4)),
      close: Number(close.toFixed(4)),
      volume: Number((1000 + index * 12).toFixed(2)),
    });
    current = close;
  }

  return candles;
}

async function getHistoricalCandles(symbol, quote = "USDT", timeframe = "1H") {
  const cacheKey = `${symbol}-${quote}-${timeframe}`;
  const cached = cacheGet(historicalCache, cacheKey);
  if (cached) {
    return cached;
  }

  try {
    const interval = mapTimeframeToBinanceInterval(timeframe);
    const providerSymbol = normalizeProviderSymbol(symbol, quote);
    const data = await getJson(
      `https://api.binance.com/api/v3/klines?symbol=${providerSymbol}&interval=${interval}&limit=60`
    );

    const candles = data.map((candle) => ({
      time: new Date(candle[0]).toISOString(),
      open: Number(candle[1]),
      high: Number(candle[2]),
      low: Number(candle[3]),
      close: Number(candle[4]),
      volume: Number(candle[5]),
    }));

    cacheSet(historicalCache, cacheKey, candles, HISTORY_CACHE_TTL_MS);
    return candles;
  } catch (error) {
    const candles = generateFallbackHistory(symbol, quote, timeframe);
    cacheSet(historicalCache, cacheKey, candles, HISTORY_CACHE_TTL_MS);
    return candles;
  }
}

async function listSupportedAssets() {
  const result = await db.query(
    `
      SELECT symbol, quote, asset_type, provider_symbol
      FROM market_assets
      WHERE is_active = TRUE
      ORDER BY asset_type, symbol
    `
  );

  return result.rows.map((row) => ({
    symbol: row.symbol,
    quote: row.quote,
    assetType: row.asset_type,
    providerSymbol: row.provider_symbol,
    pair: `${row.symbol}/${row.quote}`,
  }));
}

async function getMarketOverview() {
  const assets = await listSupportedAssets();
  const overview = await Promise.all(
    assets.map(async (asset) => {
      const ticker = await getTickerForPair(asset.symbol, asset.quote);
      return {
        ...asset,
        price: Number(ticker.price),
        change: Number(ticker.changePercent),
        source: ticker.source,
      };
    })
  );

  return overview;
}

module.exports = {
  parsePair,
  getTickerForPair,
  enrichPairs,
  getHistoricalCandles,
  listSupportedAssets,
  getMarketOverview,
};
