jest.mock("../db", () => ({
  query: jest.fn(),
  getClient: jest.fn(),
}));

const jwt = require("jsonwebtoken");
const request = require("supertest");
const db = require("../db");
const app = require("../src/app");
const env = require("../src/config/env");

describe("portfolio routes", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("repairs a legacy premium balance before returning portfolio summary", async () => {
    const token = jwt.sign(
      { sub: "user-1", email: "bigyan@example.com" },
      env.jwtSecret
    );

    db.query
      .mockResolvedValueOnce({
        rowCount: 1,
        rows: [
          {
            id: "user-1",
            full_name: "Bigyan Lama",
            email: "bigyan@example.com",
            subscription_tier: "PREMIUM",
            created_at: "2026-01-01T00:00:00.000Z",
          },
        ],
      })
      .mockResolvedValueOnce({
        rowCount: 1,
        rows: [
          {
            id: "portfolio-1",
            user_id: "user-1",
            cash_balance: 100000,
            equity_value: 100000,
            realized_pl: 0,
          },
        ],
      })
      .mockResolvedValueOnce({
        rowCount: 0,
        rows: [],
      })
      .mockResolvedValueOnce({
        rowCount: 1,
        rows: [],
      });

    const client = {
      query: jest
        .fn()
        .mockResolvedValueOnce()
        .mockResolvedValueOnce({
          rowCount: 1,
          rows: [
            {
              subscription_tier: "PREMIUM",
              starting_balance: 10000,
              has_processed_payment: true,
            },
          ],
        })
        .mockResolvedValueOnce()
        .mockResolvedValueOnce()
        .mockResolvedValueOnce(),
      release: jest.fn(),
    };

    db.getClient.mockResolvedValue(client);

    const response = await request(app)
      .get("/api/portfolio")
      .set("Authorization", `Bearer ${token}`);

    expect(response.statusCode).toBe(200);
    expect(response.body.cashBalance).toBe(100000);
    expect(response.body.equityValue).toBe(100000);
    expect(client.query).toHaveBeenCalledWith(
      expect.stringContaining("UPDATE users"),
      ["user-1", 100000]
    );
    expect(client.query).toHaveBeenCalledWith(
      expect.stringContaining("cash_balance = cash_balance + $2"),
      ["user-1", 90000]
    );
  });
});
