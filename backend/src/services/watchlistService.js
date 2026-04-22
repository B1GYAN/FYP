const db = require("../../db");
const marketDataService = require("./marketDataService");

function createValidationError(message) {
  const error = new Error(message);
  error.statusCode = 400;
  return error;
}

function mapWatchlistRow(row) {
  return {
    id: row.id,
    pair: `${row.symbol}/${row.quote}`,
    symbol: row.symbol,
    quote: row.quote,
    price: "--",
    change: "0.0%",
    addedAt: row.created_at,
  };
}

async function getSupportedPairSet() {
  const supportedAssets = await marketDataService.listSupportedAssets();
  return new Set(supportedAssets.map((asset) => asset.pair));
}

async function getAllWatchlistItems(userId) {
  const result = await db.query(
    `
      SELECT id, symbol, quote, created_at
      FROM watchlist
      WHERE user_id = $1
      ORDER BY id
    `,
    [userId]
  );

  const supportedPairs = await getSupportedPairSet();
  const items = result.rows
    .filter((row) => supportedPairs.has(`${row.symbol}/${row.quote}`))
    .map(mapWatchlistRow);

  return marketDataService.enrichPairs(items);
}

function normalizePair(pair) {
  const cleaned = pair.trim().toUpperCase();

  if (!cleaned) {
    throw createValidationError("pair is required (e.g. BTC/USDT)");
  }

  const [symbol, quote = "USDT"] = cleaned.includes("/")
    ? cleaned.split("/")
    : [cleaned, "USDT"];

  if (!symbol || !quote) {
    throw createValidationError("pair must include a valid symbol and quote");
  }

  return {
    symbol,
    quote,
  };
}

async function assertPairIsSupported(symbol, quote) {
  const pair = `${symbol}/${quote}`;
  const supportedPairs = await getSupportedPairSet();

  if (!supportedPairs.has(pair)) {
    throw createValidationError(
      `Pair ${pair} is not supported. Use a listed market pair such as BTC/USDT.`
    );
  }
}

async function createWatchlistItem(userId, pair) {
  const { symbol, quote } = normalizePair(pair);
  await assertPairIsSupported(symbol, quote);

  const existing = await db.query(
    `
      SELECT id, symbol, quote, created_at
      FROM watchlist
      WHERE user_id = $1 AND symbol = $2 AND quote = $3
    `,
    [userId, symbol, quote]
  );

  if (existing.rowCount > 0) {
    const duplicateError = new Error("Pair already exists in watchlist");
    duplicateError.statusCode = 409;
    throw duplicateError;
  }

  const result = await db.query(
    `
      INSERT INTO watchlist (user_id, symbol, quote)
      VALUES ($1, $2, $3)
      RETURNING id, symbol, quote, created_at
    `,
    [userId, symbol, quote]
  );

  return mapWatchlistRow(result.rows[0]);
}

module.exports = {
  getAllWatchlistItems,
  createWatchlistItem,
};
