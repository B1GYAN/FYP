jest.mock("../db", () => ({
  query: jest.fn(),
  getClient: jest.fn(),
}));

jest.mock("../src/services/marketDataService", () => ({
  parsePair: jest.fn(() => ({ symbol: "BTC", quote: "USDT" })),
  getTickerForPair: jest.fn(() =>
    Promise.resolve({
      price: 50000,
      changePercent: 1.2,
    })
  ),
}));

jest.mock("../src/services/learningService", () => ({
  evaluateAndStoreInsights: jest.fn(() => Promise.resolve()),
}));

jest.mock("../src/services/portfolioService", () => ({
  getUserPortfolioRecord: jest.fn(),
  getPortfolioSummary: jest.fn(),
}));

const db = require("../db");
const portfolioService = require("../src/services/portfolioService");
const { placeOrder } = require("../src/services/tradingEngineService");

function createClient(queryResults = []) {
  const query = jest.fn();

  for (const result of queryResults) {
    query.mockResolvedValueOnce(result);
  }

  query.mockResolvedValue({});

  return {
    query,
    release: jest.fn(),
  };
}

describe("trading engine", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    portfolioService.getUserPortfolioRecord.mockResolvedValue({
      id: "portfolio-1",
      user_id: "user-1",
      cash_balance: 10000,
      equity_value: 10000,
      realized_pl: 0,
    });

    portfolioService.getPortfolioSummary.mockResolvedValue({
      cashBalance: 10000,
      equityValue: 10000,
      realizedPl: 0,
      unrealizedPl: 0,
      positionsValue: 0,
      holdings: [],
    });
  });

  test("rejects orders when balance is too low", async () => {
    portfolioService.getUserPortfolioRecord.mockResolvedValueOnce({
      id: "portfolio-1",
      user_id: "user-1",
      cash_balance: 100,
      equity_value: 100,
      realized_pl: 0,
    });

    const client = createClient([
      undefined,
      { rowCount: 0, rows: [] },
      { rows: [{ id: "order-1", created_at: "2026-01-01T00:00:00.000Z" }] },
    ]);

    db.getClient.mockResolvedValue(client);

    await expect(
      placeOrder("user-1", {
        side: "BUY",
        symbol: "BTC/USDT",
        quantity: 1,
        orderType: "MARKET",
      })
    ).rejects.toThrow("Insufficient virtual cash balance");
  });

  test("opens a short position when selling without an existing holding", async () => {
    portfolioService.getPortfolioSummary.mockResolvedValueOnce({
      cashBalance: 15000,
      equityValue: 10000,
      realizedPl: 0,
      unrealizedPl: 0,
      positionsValue: -5000,
      holdings: [
        {
          pair: "BTC/USDT",
          quantity: -0.1,
          direction: "SHORT",
        },
      ],
    });

    const client = createClient([
      undefined,
      { rowCount: 0, rows: [] },
      { rows: [{ id: "order-1", created_at: "2026-01-01T00:00:00.000Z" }] },
    ]);

    db.getClient.mockResolvedValue(client);

    const result = await placeOrder("user-1", {
      side: "SELL",
      symbol: "BTC/USDT",
      quantity: 0.1,
      orderType: "MARKET",
    });

    expect(result.order.side).toBe("SELL");
    expect(result.portfolio.holdings[0].direction).toBe("SHORT");
    expect(client.query).toHaveBeenCalledWith(
      expect.stringContaining("INSERT INTO holdings"),
      ["portfolio-1", "BTC", "USDT", -0.1, 50000]
    );
  });

  test("covers part of an existing short with a buy order", async () => {
    portfolioService.getPortfolioSummary.mockResolvedValueOnce({
      cashBalance: 12500,
      equityValue: 10200,
      realizedPl: 300,
      unrealizedPl: 100,
      positionsValue: -2300,
      holdings: [
        {
          pair: "BTC/USDT",
          quantity: -0.05,
          direction: "SHORT",
        },
      ],
    });

    const client = createClient([
      undefined,
      {
        rowCount: 1,
        rows: [{ id: "holding-1", quantity: -0.1, average_price: 53000 }],
      },
      { rows: [{ id: "order-1", created_at: "2026-01-01T00:00:00.000Z" }] },
    ]);

    db.getClient.mockResolvedValue(client);

    const result = await placeOrder("user-1", {
      side: "BUY",
      symbol: "BTC/USDT",
      quantity: 0.05,
      orderType: "MARKET",
    });

    expect(result.order.side).toBe("BUY");
    expect(result.portfolio.realizedPl).toBe(300);
    expect(client.query).toHaveBeenCalledWith(
      expect.stringContaining("SET quantity = $2"),
      ["holding-1", -0.05, 53000]
    );
    expect(client.query).toHaveBeenCalledWith(
      expect.stringContaining("SET cash_balance = $2"),
      ["portfolio-1", 7500, 150]
    );
  });

  test("flips a long position into a short when sell quantity exceeds current holding", async () => {
    portfolioService.getPortfolioSummary.mockResolvedValueOnce({
      cashBalance: 14000,
      equityValue: 9800,
      realizedPl: 100,
      unrealizedPl: -50,
      positionsValue: -4200,
      holdings: [
        {
          pair: "BTC/USDT",
          quantity: -0.08,
          direction: "SHORT",
        },
      ],
    });

    const client = createClient([
      undefined,
      {
        rowCount: 1,
        rows: [{ id: "holding-1", quantity: 0.02, average_price: 45000 }],
      },
      { rows: [{ id: "order-1", created_at: "2026-01-01T00:00:00.000Z" }] },
    ]);

    db.getClient.mockResolvedValue(client);

    const result = await placeOrder("user-1", {
      side: "SELL",
      symbol: "BTC/USDT",
      quantity: 0.1,
      orderType: "MARKET",
    });

    expect(result.portfolio.holdings[0].direction).toBe("SHORT");
    expect(client.query).toHaveBeenCalledWith(
      expect.stringContaining("SET quantity = $2"),
      ["holding-1", -0.08, 50000]
    );
    expect(client.query).toHaveBeenCalledWith(
      expect.stringContaining("SET cash_balance = $2"),
      ["portfolio-1", 15000, 100]
    );
  });
});
