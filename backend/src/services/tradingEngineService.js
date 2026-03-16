const db = require("../../db");
const marketDataService = require("./marketDataService");
const portfolioService = require("./portfolioService");
const learningService = require("./learningService");

function parseOrderInput(input) {
  const side = String(input.side || "").toUpperCase();
  const orderType = String(input.orderType || "MARKET").toUpperCase();
  const quantity = Number(input.quantity);
  const requestedPrice = input.limitPrice !== undefined && input.limitPrice !== null && input.limitPrice !== ""
    ? Number(input.limitPrice)
    : null;
  const stopLoss = input.stopLoss !== undefined && input.stopLoss !== null && input.stopLoss !== ""
    ? Number(input.stopLoss)
    : null;

  if (!["BUY", "SELL"].includes(side)) {
    const error = new Error("Order side must be BUY or SELL");
    error.statusCode = 400;
    throw error;
  }

  if (!["MARKET", "LIMIT"].includes(orderType)) {
    const error = new Error("Order type must be MARKET or LIMIT");
    error.statusCode = 400;
    throw error;
  }

  if (!Number.isFinite(quantity) || quantity <= 0) {
    const error = new Error("Quantity must be greater than zero");
    error.statusCode = 400;
    throw error;
  }

  if (orderType === "LIMIT" && (!Number.isFinite(requestedPrice) || requestedPrice <= 0)) {
    const error = new Error("Limit orders require a valid limit price");
    error.statusCode = 400;
    throw error;
  }

  if (stopLoss !== null && (!Number.isFinite(stopLoss) || stopLoss <= 0)) {
    const error = new Error("Stop-loss must be a valid positive price");
    error.statusCode = 400;
    throw error;
  }

  const { symbol, quote } = marketDataService.parsePair(input.symbol || "");

  if (!symbol) {
    const error = new Error("A valid trading pair is required");
    error.statusCode = 400;
    throw error;
  }

  return {
    side,
    orderType,
    quantity,
    requestedPrice,
    stopLoss,
    symbol,
    quote,
    notes: input.note || null,
  };
}

async function getHoldingForUpdate(client, portfolioId, symbol, quote) {
  const result = await client.query(
    `
      SELECT id, quantity, average_price
      FROM holdings
      WHERE portfolio_id = $1 AND symbol = $2 AND quote = $3
      FOR UPDATE
    `,
    [portfolioId, symbol, quote]
  );

  return result.rowCount > 0 ? result.rows[0] : null;
}

async function createOrderRecord(client, userId, portfolioId, order) {
  const result = await client.query(
    `
      INSERT INTO orders (
        user_id,
        portfolio_id,
        symbol,
        quote,
        side,
        order_type,
        status,
        quantity,
        requested_price,
        notes
      )
      VALUES ($1, $2, $3, $4, $5, $6, 'PENDING', $7, $8, $9)
      RETURNING id, created_at
    `,
    [
      userId,
      portfolioId,
      order.symbol,
      order.quote,
      order.side,
      order.orderType,
      order.quantity,
      order.requestedPrice,
      order.notes,
    ]
  );

  return result.rows[0];
}

async function placeOrder(userId, payload) {
  const order = parseOrderInput(payload);
  const client = await db.getClient();

  try {
    await client.query("BEGIN");

    const portfolio = await portfolioService.getUserPortfolioRecord(userId, client);
    const portfolioId = portfolio.id;
    const holding = await getHoldingForUpdate(
      client,
      portfolioId,
      order.symbol,
      order.quote
    );

    const ticker = await marketDataService.getTickerForPair(order.symbol, order.quote);
    const referencePrice = Number(ticker.price);
    const executedPrice =
      order.orderType === "MARKET" ? referencePrice : order.requestedPrice;
    const orderValue = executedPrice * order.quantity;

    const createdOrder = await createOrderRecord(client, userId, portfolioId, order);

    let realizedPl = 0;
    let nextCashBalance = Number(portfolio.cash_balance);

    if (order.side === "BUY") {
      if (nextCashBalance < orderValue) {
        const error = new Error("Insufficient virtual cash balance");
        error.statusCode = 400;
        throw error;
      }

      nextCashBalance -= orderValue;

      if (!holding) {
        await client.query(
          `
            INSERT INTO holdings (
              portfolio_id,
              symbol,
              quote,
              quantity,
              average_price
            )
            VALUES ($1, $2, $3, $4, $5)
          `,
          [portfolioId, order.symbol, order.quote, order.quantity, executedPrice]
        );
      } else {
        const existingQty = Number(holding.quantity);
        const existingAvg = Number(holding.average_price);
        const newQty = existingQty + order.quantity;
        const newAveragePrice =
          (existingQty * existingAvg + order.quantity * executedPrice) / newQty;

        await client.query(
          `
            UPDATE holdings
            SET quantity = $2,
                average_price = $3,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $1
          `,
          [holding.id, newQty, newAveragePrice]
        );
      }
    } else {
      const currentQty = holding ? Number(holding.quantity) : 0;

      if (!holding || currentQty < order.quantity) {
        const error = new Error("Cannot sell more than the quantity you own");
        error.statusCode = 400;
        throw error;
      }

      nextCashBalance += orderValue;
      realizedPl = (executedPrice - Number(holding.average_price)) * order.quantity;
      const remainingQty = currentQty - order.quantity;

      if (remainingQty <= 0) {
        await client.query(`DELETE FROM holdings WHERE id = $1`, [holding.id]);
      } else {
        await client.query(
          `
            UPDATE holdings
            SET quantity = $2, updated_at = CURRENT_TIMESTAMP
            WHERE id = $1
          `,
          [holding.id, remainingQty]
        );
      }
    }

    await client.query(
      `
        UPDATE portfolios
        SET cash_balance = $2,
            realized_pl = realized_pl + $3,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
      `,
      [portfolioId, nextCashBalance, realizedPl]
    );

    await client.query(
      `
        UPDATE orders
        SET status = 'FILLED',
            executed_price = $2,
            executed_at = CURRENT_TIMESTAMP
        WHERE id = $1
      `,
      [createdOrder.id, executedPrice]
    );

    await client.query(
      `
        INSERT INTO transactions (
          order_id,
          portfolio_id,
          symbol,
          quote,
          side,
          quantity,
          price,
          gross_value,
          realized_pl
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      `,
      [
        createdOrder.id,
        portfolioId,
        order.symbol,
        order.quote,
        order.side,
        order.quantity,
        executedPrice,
        orderValue,
        realizedPl,
      ]
    );

    const priceVsReference = referencePrice > 0
      ? ((executedPrice - referencePrice) / referencePrice) * 100
      : 0;

    await learningService.evaluateAndStoreInsights(client, userId, portfolioId, {
      pair: `${order.symbol}/${order.quote}`,
      side: order.side,
      realizedPl,
      priceVsReference,
      stopLossProvided: order.stopLoss !== null,
    });

    await client.query("COMMIT");

    const summary = await portfolioService.getPortfolioSummary(userId);

    return {
      order: {
        id: createdOrder.id,
        pair: `${order.symbol}/${order.quote}`,
        side: order.side,
        orderType: order.orderType,
        quantity: order.quantity,
        executedPrice: Number(executedPrice.toFixed(8)),
        status: "FILLED",
        createdAt: createdOrder.created_at,
      },
      portfolio: summary,
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

module.exports = {
  placeOrder,
};
