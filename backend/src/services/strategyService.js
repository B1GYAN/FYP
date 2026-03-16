const db = require("../../db");
const marketDataService = require("./marketDataService");

function movingAverage(values, period, index) {
  if (index + 1 < period) {
    return null;
  }

  const subset = values.slice(index + 1 - period, index + 1);
  return subset.reduce((sum, value) => sum + value, 0) / period;
}

function calculateRsi(values, period, index) {
  if (index < period) {
    return null;
  }

  let gains = 0;
  let losses = 0;

  for (let cursor = index - period + 1; cursor <= index; cursor += 1) {
    const diff = values[cursor] - values[cursor - 1];
    if (diff >= 0) {
      gains += diff;
    } else {
      losses += Math.abs(diff);
    }
  }

  if (losses === 0) {
    return 100;
  }

  const rs = gains / losses;
  return 100 - 100 / (1 + rs);
}

function calculateMaxDrawdown(equityCurve) {
  let peak = equityCurve[0] || 0;
  let maxDrawdown = 0;

  for (const point of equityCurve) {
    peak = Math.max(peak, point);
    const drawdown = peak === 0 ? 0 : ((peak - point) / peak) * 100;
    maxDrawdown = Math.max(maxDrawdown, drawdown);
  }

  return Number(maxDrawdown.toFixed(2));
}

async function runBacktest(userId, payload) {
  const {
    name,
    symbol,
    quote = "USDT",
    timeframe = "1H",
    startingBalance = 10000,
    fastMa = 5,
    slowMa = 12,
    rsiSellThreshold = 70,
  } = payload;

  const candles = await marketDataService.getHistoricalCandles(symbol, quote, timeframe);
  const closes = candles.map((candle) => candle.close);
  let cash = Number(startingBalance);
  let positionQty = 0;
  let entryPrice = 0;
  let wins = 0;
  let losses = 0;
  const trades = [];
  const equityCurve = [];

  for (let index = 1; index < candles.length; index += 1) {
    const fastCurrent = movingAverage(closes, Number(fastMa), index);
    const fastPrev = movingAverage(closes, Number(fastMa), index - 1);
    const slowCurrent = movingAverage(closes, Number(slowMa), index);
    const slowPrev = movingAverage(closes, Number(slowMa), index - 1);
    const rsi = calculateRsi(closes, 6, index);
    const price = closes[index];

    const buySignal =
      fastCurrent !== null &&
      slowCurrent !== null &&
      fastPrev !== null &&
      slowPrev !== null &&
      fastPrev <= slowPrev &&
      fastCurrent > slowCurrent;

    const sellSignal =
      positionQty > 0 &&
      ((fastCurrent !== null &&
        slowCurrent !== null &&
        fastPrev !== null &&
        slowPrev !== null &&
        fastPrev >= slowPrev &&
        fastCurrent < slowCurrent) ||
        (rsi !== null && rsi >= Number(rsiSellThreshold)));

    if (buySignal && positionQty === 0) {
      positionQty = cash / price;
      entryPrice = price;
      cash = 0;
      trades.push({
        side: "BUY",
        time: candles[index].time,
        price: Number(price.toFixed(4)),
      });
    } else if (sellSignal && positionQty > 0) {
      const endingValue = positionQty * price;
      const pnl = endingValue - positionQty * entryPrice;
      cash = endingValue;
      positionQty = 0;
      trades.push({
        side: "SELL",
        time: candles[index].time,
        price: Number(price.toFixed(4)),
        pnl: Number(pnl.toFixed(2)),
      });

      if (pnl >= 0) {
        wins += 1;
      } else {
        losses += 1;
      }
    }

    const equity = cash + positionQty * price;
    equityCurve.push(Number(equity.toFixed(2)));
  }

  const finalEquity =
    cash + positionQty * closes[closes.length - 1];
  const totalReturn = ((finalEquity - startingBalance) / startingBalance) * 100;
  const closedTrades = wins + losses;
  const winRate = closedTrades === 0 ? 0 : (wins / closedTrades) * 100;
  const maxDrawdown = calculateMaxDrawdown(equityCurve);

  const strategyConfig = {
    fastMa: Number(fastMa),
    slowMa: Number(slowMa),
    rsiSellThreshold: Number(rsiSellThreshold),
    timeframe,
    symbol,
    quote,
    startingBalance: Number(startingBalance),
  };

  const strategyResult = await db.query(
    `
      INSERT INTO strategies (user_id, name, symbol, quote, timeframe, config)
      VALUES ($1, $2, $3, $4, $5, $6::jsonb)
      RETURNING id
    `,
    [
      userId,
      name || `${symbol}/${quote} MA-RSI Strategy`,
      symbol,
      quote,
      timeframe,
      JSON.stringify(strategyConfig),
    ]
  );

  const resultPayload = {
    trades,
    equityCurve,
    parameters: strategyConfig,
  };

  await db.query(
    `
      INSERT INTO backtest_results (
        strategy_id,
        total_return,
        win_rate,
        max_drawdown,
        trade_count,
        result_payload
      )
      VALUES ($1, $2, $3, $4, $5, $6::jsonb)
    `,
    [
      strategyResult.rows[0].id,
      totalReturn,
      winRate,
      maxDrawdown,
      closedTrades,
      JSON.stringify(resultPayload),
    ]
  );

  return {
    strategyId: strategyResult.rows[0].id,
    totalReturn: Number(totalReturn.toFixed(2)),
    winRate: Number(winRate.toFixed(2)),
    maxDrawdown,
    tradeCount: closedTrades,
    finalEquity: Number(finalEquity.toFixed(2)),
    trades,
    equityCurve,
  };
}

module.exports = {
  runBacktest,
};
