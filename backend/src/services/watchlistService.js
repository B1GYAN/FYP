const db = require("../../db");
const marketDataService = require("./marketDataService");

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

  const items = result.rows.map(mapWatchlistRow);
  return marketDataService.enrichPairs(items);
}

function normalizePair(pair) {
  const cleaned = pair.trim().toUpperCase();

  if (!cleaned) {
    throw new Error("pair is required (e.g. BTC/USDT)");
  }

  const [symbol, quote = "USDT"] = cleaned.includes("/")
    ? cleaned.split("/")
    : [cleaned, "USDT"];

  if (!symbol || !quote) {
    throw new Error("pair must include a valid symbol and quote");
  }

  return {
    symbol,
    quote,
  };
}

async function createWatchlistItem(userId, pair) {
  const { symbol, quote } = normalizePair(pair);

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
