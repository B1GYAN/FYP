const asyncHandler = require("../utils/asyncHandler");
const marketDataService = require("../services/marketDataService");

const getOverview = asyncHandler(async (req, res) => {
  const overview = await marketDataService.getMarketOverview();
  res.json(overview);
});

const getChartData = asyncHandler(async (req, res) => {
  const { pair = "BTC/USDT", timeframe = "1H" } = req.query;
  const { symbol, quote } = marketDataService.parsePair(pair);
  const ticker = await marketDataService.getTickerForPair(symbol, quote);
  const historicalCandles = await marketDataService.getHistoricalCandles(
    symbol,
    quote,
    timeframe
  );
  const candles = marketDataService.mergeLiveTickerIntoCandles(
    historicalCandles,
    ticker
  );

  res.json({
    pair: `${symbol}/${quote}`,
    timeframe,
    currentPrice: Number(ticker.price),
    changePercent: Number(ticker.changePercent),
    source: ticker.source,
    asOf: ticker.asOf,
    candles,
  });
});

module.exports = {
  getOverview,
  getChartData,
};
