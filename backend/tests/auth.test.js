jest.mock("../db", () => ({
  query: jest.fn(),
  getClient: jest.fn(),
}));

jest.mock("bcryptjs", () => ({
  hash: jest.fn(() => Promise.resolve("hashed-password")),
  compare: jest.fn(() => Promise.resolve(true)),
}));

const request = require("supertest");
const db = require("../db");
const app = require("../src/app");

describe("auth routes", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("register returns a token and user payload", async () => {
    const client = {
      query: jest
        .fn()
        .mockResolvedValueOnce()
        .mockResolvedValueOnce({ rowCount: 0, rows: [] })
        .mockResolvedValueOnce({
          rows: [
            {
              id: "user-1",
              full_name: "Bigyan Lama",
              email: "bigyan@example.com",
              starting_balance: 10000,
              subscription_tier: "STANDARD",
              created_at: "2026-01-01T00:00:00.000Z",
            },
          ],
        })
        .mockResolvedValueOnce()
        .mockResolvedValueOnce(),
      release: jest.fn(),
    };

    db.getClient.mockResolvedValue(client);

    const response = await request(app).post("/api/auth/register").send({
      fullName: "Bigyan Lama",
      email: "bigyan@example.com",
      password: "password123",
      subscriptionTier: "PREMIUM",
    });

    expect(response.statusCode).toBe(201);
    expect(response.body.token).toBeTruthy();
    expect(response.body.user.email).toBe("bigyan@example.com");
    expect(response.body.user.subscriptionTier).toBe("STANDARD");
  });
});
