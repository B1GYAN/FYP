jest.mock("../db", () => ({
  query: jest.fn(),
  getClient: jest.fn(),
}));

jest.mock("bcryptjs", () => ({
  hash: jest.fn(() => Promise.resolve("hashed-password")),
  compare: jest.fn(() => Promise.resolve(true)),
}));

const jwt = require("jsonwebtoken");
const request = require("supertest");
const db = require("../db");
const app = require("../src/app");
const env = require("../src/config/env");

describe("auth login and profile flow", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("logs in an existing user", async () => {
    db.query.mockResolvedValueOnce({
      rowCount: 1,
      rows: [
        {
          id: "user-1",
          full_name: "Bigyan Lama",
          email: "bigyan@example.com",
          password_hash: "hashed-password",
          created_at: "2026-01-01T00:00:00.000Z",
        },
      ],
    });

    const response = await request(app).post("/api/auth/login").send({
      email: "bigyan@example.com",
      password: "password123",
    });

    expect(response.statusCode).toBe(200);
    expect(response.body.token).toBeTruthy();
    expect(response.body.user.fullName).toBe("Bigyan Lama");
  });

  test("returns current user profile for valid token", async () => {
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
            created_at: "2026-01-01T00:00:00.000Z",
          },
        ],
      })
      .mockResolvedValueOnce({
        rowCount: 1,
        rows: [
          {
            id: "user-1",
            full_name: "Bigyan Lama",
            email: "bigyan@example.com",
            created_at: "2026-01-01T00:00:00.000Z",
            cash_balance: 10000,
            equity_value: 10250,
            realized_pl: 120,
          },
        ],
      });

    const response = await request(app)
      .get("/api/auth/me")
      .set("Authorization", `Bearer ${token}`);

    expect(response.statusCode).toBe(200);
    expect(response.body.email).toBe("bigyan@example.com");
    expect(response.body.portfolio.equityValue).toBe(10250);
  });
});
