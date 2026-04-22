jest.mock("../src/services/marketDataService", () => ({
  getMarketOverview: jest.fn(),
  parsePair: jest.fn(),
  getTickerForPair: jest.fn(),
  getHistoricalCandles: jest.fn(),
  mergeLiveTickerIntoCandles: jest.fn(),
}));

const request = require("supertest");
const app = require("../src/app");
const marketDataService = require("../src/services/marketDataService");

describe("market routes", () => {
  beforeEach(() => {
    marketDataService.getMarketOverview.mockReset();
    marketDataService.parsePair.mockReset();
    marketDataService.getTickerForPair.mockReset();
    marketDataService.getHistoricalCandles.mockReset();
    marketDataService.mergeLiveTickerIntoCandles.mockReset();
  });

  test("returns market overview data", async () => {
    marketDataService.getMarketOverview.mockResolvedValue([
      {
        pair: "BTC/USDT",
        price: 64250.12,
        changePercent: 2.31,
        source: "mock-feed",
      },
    ]);

    const response = await request(app).get("/api/market/overview");

    expect(response.statusCode).toBe(200);
    expect(response.body).toEqual([
      expect.objectContaining({
        pair: "BTC/USDT",
        price: 64250.12,
        changePercent: 2.31,
      }),
    ]);
    expect(marketDataService.getMarketOverview).toHaveBeenCalledTimes(1);
  });

  test("returns chart data for the requested pair and timeframe", async () => {
    const historicalCandles = [
      {
        time: "2026-01-01T00:00:00.000Z",
        open: 3000,
        high: 3050,
        low: 2980,
        close: 3040,
        volume: 1200,
      },
    ];
    const mergedCandles = [
      ...historicalCandles,
      {
        time: "2026-01-01T01:00:00.000Z",
        open: 3040,
        high: 3130,
        low: 3035,
        close: 3125.5,
        volume: 980,
      },
    ];

    marketDataService.parsePair.mockReturnValue({
      symbol: "ETH",
      quote: "USDT",
    });
    marketDataService.getTickerForPair.mockResolvedValue({
      price: "3125.5",
      changePercent: "2.4",
      source: "mock-feed",
      asOf: "2026-01-01T01:00:00.000Z",
    });
    marketDataService.getHistoricalCandles.mockResolvedValue(historicalCandles);
    marketDataService.mergeLiveTickerIntoCandles.mockReturnValue(mergedCandles);

    const response = await request(app).get(
      "/api/market/charts?pair=eth/usdt&timeframe=4H"
    );

    expect(response.statusCode).toBe(200);
    expect(response.body).toEqual({
      pair: "ETH/USDT",
      timeframe: "4H",
      currentPrice: 3125.5,
      changePercent: 2.4,
      source: "mock-feed",
      asOf: "2026-01-01T01:00:00.000Z",
      candles: mergedCandles,
    });
    expect(marketDataService.parsePair).toHaveBeenCalledWith("eth/usdt");
    expect(marketDataService.getTickerForPair).toHaveBeenCalledWith("ETH", "USDT");
    expect(marketDataService.getHistoricalCandles).toHaveBeenCalledWith(
      "ETH",
      "USDT",
      "4H"
    );
    expect(marketDataService.mergeLiveTickerIntoCandles).toHaveBeenCalledWith(
      historicalCandles,
      expect.objectContaining({
        price: "3125.5",
      })
    );
  });

  test("uses default chart query values when none are provided", async () => {
    marketDataService.parsePair.mockReturnValue({
      symbol: "BTC",
      quote: "USDT",
    });
    marketDataService.getTickerForPair.mockResolvedValue({
      price: "64000",
      changePercent: "1.2",
      source: "mock-feed",
      asOf: "2026-01-01T00:00:00.000Z",
    });
    marketDataService.getHistoricalCandles.mockResolvedValue([]);
    marketDataService.mergeLiveTickerIntoCandles.mockReturnValue([]);

    const response = await request(app).get("/api/market/charts");

    expect(response.statusCode).toBe(200);
    expect(response.body.pair).toBe("BTC/USDT");
    expect(response.body.timeframe).toBe("1H");
    expect(marketDataService.parsePair).toHaveBeenCalledWith("BTC/USDT");
    expect(marketDataService.getHistoricalCandles).toHaveBeenCalledWith(
      "BTC",
      "USDT",
      "1H"
    );
  });
});
