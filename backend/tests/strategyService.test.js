jest.mock("../db", () => ({
  query: jest.fn(),
  getClient: jest.fn(),
}));

jest.mock("../src/services/marketDataService", () => ({
  getHistoricalCandles: jest.fn(),
}));

const db = require("../db");
const marketDataService = require("../src/services/marketDataService");
const { runBacktest } = require("../src/services/strategyService");

function createCandlesFromCloses(closes) {
  return closes.map((close, index) => ({
    time: new Date(Date.UTC(2026, 0, 1, index)).toISOString(),
    open: close,
    high: close,
    low: close,
    close,
    volume: 1000 + index,
  }));
}

describe("strategy service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("runs a profitable backtest and stores the strategy result", async () => {
    const candles = createCandlesFromCloses([10, 9, 8, 11, 12, 13, 14]);

    marketDataService.getHistoricalCandles.mockResolvedValue(candles);
    db.query
      .mockResolvedValueOnce({
        rowCount: 1,
        rows: [{ id: "strategy-1" }],
      })
      .mockResolvedValueOnce({
        rowCount: 1,
        rows: [],
      });

    const result = await runBacktest("user-1", {
      name: "ETH Trend Test",
      symbol: "ETH",
      quote: "USDT",
      timeframe: "4H",
      startingBalance: 10000,
      fastMa: 2,
      slowMa: 3,
      rsiSellThreshold: 70,
    });

    expect(marketDataService.getHistoricalCandles).toHaveBeenCalledWith(
      "ETH",
      "USDT",
      "4H"
    );
    expect(result).toEqual({
      strategyId: "strategy-1",
      totalReturn: 27.27,
      winRate: 100,
      maxDrawdown: 0,
      tradeCount: 1,
      finalEquity: 12727.27,
      trades: [
        {
          side: "BUY",
          time: candles[3].time,
          price: 11,
        },
        {
          side: "SELL",
          time: candles[6].time,
          price: 14,
          pnl: 2727.27,
        },
      ],
      equityCurve: [10000, 10000, 10000, 10909.09, 11818.18, 12727.27],
    });

    expect(db.query).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining("INSERT INTO strategies"),
      [
        "user-1",
        "ETH Trend Test",
        "ETH",
        "USDT",
        "4H",
        JSON.stringify({
          fastMa: 2,
          slowMa: 3,
          rsiSellThreshold: 70,
          timeframe: "4H",
          symbol: "ETH",
          quote: "USDT",
          startingBalance: 10000,
        }),
      ]
    );

    expect(db.query).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining("INSERT INTO backtest_results"),
      [
        "strategy-1",
        27.27272727272728,
        100,
        0,
        1,
        JSON.stringify({
          trades: [
            {
              side: "BUY",
              time: candles[3].time,
              price: 11,
            },
            {
              side: "SELL",
              time: candles[6].time,
              price: 14,
              pnl: 2727.27,
            },
          ],
          equityCurve: [10000, 10000, 10000, 10909.09, 11818.18, 12727.27],
          parameters: {
            fastMa: 2,
            slowMa: 3,
            rsiSellThreshold: 70,
            timeframe: "4H",
            symbol: "ETH",
            quote: "USDT",
            startingBalance: 10000,
          },
        }),
      ]
    );
  });

  test("applies default backtest parameters when optional fields are omitted", async () => {
    const candles = createCandlesFromCloses([10, 10, 10, 10, 10, 10, 10]);

    marketDataService.getHistoricalCandles.mockResolvedValue(candles);
    db.query
      .mockResolvedValueOnce({
        rowCount: 1,
        rows: [{ id: "strategy-2" }],
      })
      .mockResolvedValueOnce({
        rowCount: 1,
        rows: [],
      });

    const result = await runBacktest("user-2", {
      symbol: "BTC",
    });

    expect(marketDataService.getHistoricalCandles).toHaveBeenCalledWith(
      "BTC",
      "USDT",
      "1H"
    );
    expect(result.strategyId).toBe("strategy-2");
    expect(result.totalReturn).toBe(0);
    expect(result.winRate).toBe(0);
    expect(result.maxDrawdown).toBe(0);
    expect(result.tradeCount).toBe(0);
    expect(result.finalEquity).toBe(10000);
    expect(result.trades).toEqual([]);
    expect(result.equityCurve).toEqual([10000, 10000, 10000, 10000, 10000, 10000]);

    expect(db.query).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining("INSERT INTO strategies"),
      [
        "user-2",
        "BTC/USDT MA-RSI Strategy",
        "BTC",
        "USDT",
        "1H",
        JSON.stringify({
          fastMa: 5,
          slowMa: 12,
          rsiSellThreshold: 70,
          timeframe: "1H",
          symbol: "BTC",
          quote: "USDT",
          startingBalance: 10000,
        }),
      ]
    );
  });
});
