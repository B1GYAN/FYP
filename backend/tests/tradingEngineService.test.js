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

const db = require("../db");
const { placeOrder } = require("../src/services/tradingEngineService");

describe("trading engine", () => {
  test("rejects orders when balance is too low", async () => {
    const client = {
      query: jest
        .fn()
        .mockResolvedValueOnce()
        .mockResolvedValueOnce({
          rowCount: 1,
          rows: [
            {
              id: "portfolio-1",
              user_id: "user-1",
              cash_balance: 100,
              equity_value: 100,
              realized_pl: 0,
            },
          ],
        })
        .mockResolvedValueOnce({ rowCount: 0, rows: [] })
        .mockResolvedValueOnce({
          rows: [{ id: "order-1", created_at: "2026-01-01T00:00:00.000Z" }],
        })
        .mockResolvedValueOnce(),
      release: jest.fn(),
    };

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
});
