jest.mock("../db", () => ({
  query: jest.fn(),
  getClient: jest.fn(),
}));

jest.mock("../src/services/strategyService", () => ({
  runBacktest: jest.fn(() =>
    Promise.resolve({
      strategyId: "strategy-1",
      totalReturn: 12.5,
      winRate: 100,
      maxDrawdown: 3.2,
      tradeCount: 1,
      finalEquity: 11250,
      trades: [
        {
          side: "BUY",
          time: "2026-01-01T00:00:00.000Z",
          price: 50000,
        },
        {
          side: "SELL",
          time: "2026-01-01T04:00:00.000Z",
          price: 56000,
          pnl: 1250,
        },
      ],
      equityCurve: [10000, 10100, 10450, 11250],
    })
  ),
}));

const jwt = require("jsonwebtoken");
const request = require("supertest");
const db = require("../db");
const app = require("../src/app");
const env = require("../src/config/env");
const strategyService = require("../src/services/strategyService");

function createAuthToken() {
  return jwt.sign({ sub: "user-1", email: "bigyan@example.com" }, env.jwtSecret);
}

function mockAuthenticatedUser(subscriptionTier = "PREMIUM") {
  db.query.mockResolvedValueOnce({
    rowCount: 1,
    rows: [
      {
        id: "user-1",
        full_name: "Bigyan Lama",
        email: "bigyan@example.com",
        subscription_tier: subscriptionTier,
        created_at: "2026-01-01T00:00:00.000Z",
      },
    ],
  });
}

describe("strategy routes", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("runs a backtest for a premium user", async () => {
    const token = createAuthToken();
    const payload = {
      name: "BTC Momentum Test",
      symbol: "BTC",
      timeframe: "4H",
      fastMa: 3,
      slowMa: 8,
      rsiSellThreshold: 72,
    };

    mockAuthenticatedUser();

    const response = await request(app)
      .post("/api/strategy/backtest")
      .set("Authorization", `Bearer ${token}`)
      .send(payload);

    expect(response.statusCode).toBe(200);
    expect(response.body.strategyId).toBe("strategy-1");
    expect(response.body.totalReturn).toBe(12.5);
    expect(response.body.tradeCount).toBe(1);
    expect(strategyService.runBacktest).toHaveBeenCalledWith("user-1", payload);
  });

  test("blocks standard users from running a backtest", async () => {
    const token = createAuthToken();

    mockAuthenticatedUser("STANDARD");

    const response = await request(app)
      .post("/api/strategy/backtest")
      .set("Authorization", `Bearer ${token}`)
      .send({
        symbol: "BTC",
      });

    expect(response.statusCode).toBe(403);
    expect(response.body.error).toMatch(/Premium/i);
    expect(strategyService.runBacktest).not.toHaveBeenCalled();
  });
});
