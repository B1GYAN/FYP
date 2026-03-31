jest.mock("../db", () => ({
  query: jest.fn(),
  getClient: jest.fn(),
}));

jest.mock("../src/services/tradingEngineService", () => ({
  placeOrder: jest.fn(() =>
    Promise.resolve({
      order: {
        id: "order-1",
        pair: "BTC/USDT",
        side: "BUY",
        orderType: "MARKET",
        quantity: 0.1,
        executedPrice: 50000,
        status: "FILLED",
        createdAt: "2026-01-01T00:00:00.000Z",
      },
      portfolio: {
        cashBalance: 5000,
        equityValue: 10000,
        realizedPl: 0,
        unrealizedPl: 200,
        positionsValue: 5000,
        holdings: [],
      },
    })
  ),
}));

const jwt = require("jsonwebtoken");
const request = require("supertest");
const db = require("../db");
const app = require("../src/app");
const env = require("../src/config/env");

describe("trading routes", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("places an authenticated order", async () => {
    const token = jwt.sign(
      { sub: "user-1", email: "bigyan@example.com" },
      env.jwtSecret
    );

    db.query.mockResolvedValueOnce({
      rowCount: 1,
      rows: [
        {
          id: "user-1",
          full_name: "Bigyan Lama",
          email: "bigyan@example.com",
          created_at: "2026-01-01T00:00:00.000Z",
        },
      ],
    });

    const response = await request(app)
      .post("/api/trading/orders")
      .set("Authorization", `Bearer ${token}`)
      .send({
        side: "BUY",
        symbol: "BTC/USDT",
        quantity: 0.1,
        orderType: "MARKET",
      });

    expect(response.statusCode).toBe(201);
    expect(response.body.order.status).toBe("FILLED");
    expect(response.body.portfolio.cashBalance).toBe(5000);
  });
});
