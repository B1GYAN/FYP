jest.mock("../db", () => ({
  query: jest.fn(),
  getClient: jest.fn(),
}));

jest.mock("../src/services/watchlistService", () => ({
  getAllWatchlistItems: jest.fn(),
  createWatchlistItem: jest.fn(),
}));

const jwt = require("jsonwebtoken");
const request = require("supertest");
const db = require("../db");
const app = require("../src/app");
const env = require("../src/config/env");
const watchlistService = require("../src/services/watchlistService");

function createAuthToken() {
  return jwt.sign({ sub: "user-1", email: "bigyan@example.com" }, env.jwtSecret);
}

function mockAuthenticatedUser() {
  db.query.mockResolvedValueOnce({
    rowCount: 1,
    rows: [
      {
        id: "user-1",
        full_name: "Bigyan Lama",
        email: "bigyan@example.com",
        subscription_tier: "STANDARD",
        created_at: "2026-01-01T00:00:00.000Z",
      },
    ],
  });
}

describe("watchlist routes", () => {
  beforeEach(() => {
    db.query.mockReset();
    db.getClient.mockReset();
    watchlistService.getAllWatchlistItems.mockReset();
    watchlistService.createWatchlistItem.mockReset();
  });

  test("returns the authenticated user's watchlist", async () => {
    mockAuthenticatedUser();
    watchlistService.getAllWatchlistItems.mockResolvedValue([
      {
        id: "watch-1",
        pair: "BTC/USDT",
        symbol: "BTC",
        quote: "USDT",
        price: "64250.12",
        change: "2.31%",
        addedAt: "2026-01-01T00:00:00.000Z",
      },
    ]);

    const response = await request(app)
      .get("/api/watchlist")
      .set("Authorization", `Bearer ${createAuthToken()}`);

    expect(response.statusCode).toBe(200);
    expect(response.body).toEqual([
      expect.objectContaining({
        pair: "BTC/USDT",
        symbol: "BTC",
        quote: "USDT",
      }),
    ]);
    expect(watchlistService.getAllWatchlistItems).toHaveBeenCalledWith("user-1");
  });

  test("creates a new authenticated watchlist item", async () => {
    mockAuthenticatedUser();
    watchlistService.createWatchlistItem.mockResolvedValue({
      id: "watch-2",
      pair: "ETH/USDT",
      symbol: "ETH",
      quote: "USDT",
      price: "--",
      change: "0.0%",
      addedAt: "2026-01-01T00:00:00.000Z",
    });

    const response = await request(app)
      .post("/api/watchlist")
      .set("Authorization", `Bearer ${createAuthToken()}`)
      .send({
        pair: "ETH/USDT",
      });

    expect(response.statusCode).toBe(201);
    expect(response.body).toEqual(
      expect.objectContaining({
        pair: "ETH/USDT",
        symbol: "ETH",
        quote: "USDT",
      })
    );
    expect(watchlistService.createWatchlistItem).toHaveBeenCalledWith(
      "user-1",
      "ETH/USDT"
    );
  });

  test("validates that pair is provided when creating a watchlist item", async () => {
    mockAuthenticatedUser();

    const response = await request(app)
      .post("/api/watchlist")
      .set("Authorization", `Bearer ${createAuthToken()}`)
      .send({});

    expect(response.statusCode).toBe(400);
    expect(response.body.error).toBe("pair is required (e.g. BTC/USDT)");
    expect(watchlistService.createWatchlistItem).not.toHaveBeenCalled();
  });

  test("returns a conflict when the pair already exists", async () => {
    mockAuthenticatedUser();

    const duplicateError = new Error("Pair already exists in watchlist");
    duplicateError.statusCode = 409;
    watchlistService.createWatchlistItem.mockRejectedValueOnce(duplicateError);

    const response = await request(app)
      .post("/api/watchlist")
      .set("Authorization", `Bearer ${createAuthToken()}`)
      .send({
        pair: "BTC/USDT",
      });

    expect(response.statusCode).toBe(409);
    expect(response.body.error).toBe("Pair already exists in watchlist");
  });
});
