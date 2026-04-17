const db = require("../../db");
const billingService = require("./billingService");
const marketDataService = require("./marketDataService");

function roundCurrency(value) {
  return Number(Number(value || 0).toFixed(2));
}

async function getUserPortfolioRecord(userId, client = db) {
  const result = await client.query(
    `
      SELECT id, user_id, cash_balance, equity_value, realized_pl
      FROM portfolios
      WHERE user_id = $1
    `,
    [userId]
  );

  if (result.rowCount === 0) {
    const error = new Error("Portfolio not found");
    error.statusCode = 404;
    throw error;
  }

  return result.rows[0];
}

async function getUserHoldings(userId) {
  const result = await db.query(
    `
      SELECT
        h.id,
        h.symbol,
        h.quote,
        h.quantity,
        h.average_price
      FROM holdings h
      INNER JOIN portfolios p ON p.id = h.portfolio_id
      WHERE p.user_id = $1 AND h.quantity <> 0
      ORDER BY h.symbol
    `,
    [userId]
  );

  const holdings = await Promise.all(
    result.rows.map(async (row) => {
      const ticker = await marketDataService.getTickerForPair(row.symbol, row.quote);
      const quantity = Number(row.quantity);
      const absoluteQuantity = Math.abs(quantity);
      const averagePrice = Number(row.average_price);
      const currentPrice = Number(ticker.price);
      const marketValue = quantity * currentPrice;
      const unrealizedPl = (currentPrice - averagePrice) * quantity;

      return {
        id: row.id,
        pair: `${row.symbol}/${row.quote}`,
        symbol: row.symbol,
        quote: row.quote,
        quantity,
        absoluteQuantity,
        direction: quantity >= 0 ? "LONG" : "SHORT",
        averagePrice,
        currentPrice,
        marketValue: roundCurrency(marketValue),
        exposureValue: roundCurrency(absoluteQuantity * currentPrice),
        unrealizedPl: roundCurrency(unrealizedPl),
        changePercent: Number(ticker.changePercent.toFixed(2)),
      };
    })
  );

  return holdings;
}

async function getPortfolioSummary(userId) {
  await billingService.reconcileLegacyPremiumBalance(userId);
  const portfolio = await getUserPortfolioRecord(userId);
  const holdings = await getUserHoldings(userId);
  const positionsValue = holdings.reduce((sum, holding) => sum + holding.marketValue, 0);
  const unrealizedPl = holdings.reduce((sum, holding) => sum + holding.unrealizedPl, 0);
  const equityValue = roundCurrency(Number(portfolio.cash_balance) + positionsValue);

  await db.query(
    `
      UPDATE portfolios
      SET equity_value = $2, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
    `,
    [portfolio.id, equityValue]
  );

  return {
    cashBalance: roundCurrency(portfolio.cash_balance),
    equityValue,
    realizedPl: roundCurrency(portfolio.realized_pl),
    unrealizedPl: roundCurrency(unrealizedPl),
    positionsValue: roundCurrency(positionsValue),
    holdings,
  };
}

async function getTransactionHistory(userId) {
  const result = await db.query(
    `
      SELECT
        t.id,
        t.symbol,
        t.quote,
        t.side,
        t.quantity,
        t.price,
        t.gross_value,
        t.realized_pl,
        t.created_at
      FROM transactions t
      INNER JOIN portfolios p ON p.id = t.portfolio_id
      WHERE p.user_id = $1
      ORDER BY t.created_at DESC
      LIMIT 50
    `,
    [userId]
  );

  return result.rows.map((row) => ({
    id: row.id,
    pair: `${row.symbol}/${row.quote}`,
    side: row.side,
    quantity: Number(row.quantity),
    price: Number(row.price),
    grossValue: roundCurrency(row.gross_value),
    realizedPl: roundCurrency(row.realized_pl),
    createdAt: row.created_at,
  }));
}

async function getRecentOrders(userId) {
  const result = await db.query(
    `
      SELECT
        id,
        symbol,
        quote,
        side,
        order_type,
        status,
        quantity,
        requested_price,
        executed_price,
        created_at,
        executed_at
      FROM orders
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT 25
    `,
    [userId]
  );

  return result.rows.map((row) => ({
    id: row.id,
    pair: `${row.symbol}/${row.quote}`,
    side: row.side,
    orderType: row.order_type,
    status: row.status,
    quantity: Number(row.quantity),
    requestedPrice: row.requested_price ? Number(row.requested_price) : null,
    executedPrice: row.executed_price ? Number(row.executed_price) : null,
    createdAt: row.created_at,
    executedAt: row.executed_at,
  }));
}

module.exports = {
  getUserPortfolioRecord,
  getUserHoldings,
  getPortfolioSummary,
  getTransactionHistory,
  getRecentOrders,
  roundCurrency,
};
