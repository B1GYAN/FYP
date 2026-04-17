jest.mock("../db", () => ({
  query: jest.fn(),
  getClient: jest.fn(),
}));

const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const request = require("supertest");
const db = require("../db");
const app = require("../src/app");
const env = require("../src/config/env");

function createSignature(payload) {
  const secretHash = crypto
    .createHash("md5")
    .update(env.skrillSecretWord, "utf8")
    .digest("hex")
    .toUpperCase();

  return crypto
    .createHash("md5")
    .update(
      `${payload.merchant_id}${payload.transaction_id}${secretHash}${payload.mb_amount}${payload.mb_currency}${payload.status}`,
      "utf8"
    )
    .digest("hex")
    .toUpperCase();
}

describe("billing routes", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    env.billingDemoMode = false;
    env.skrillCheckoutUrl = "https://pay.skrill.com";
    env.skrillPayToEmail = "merchant@example.com";
    env.skrillMerchantId = "merchant-123";
    env.skrillSecretWord = "secret-word";
    env.premiumPlanName = "PaperTrade Premium";
    env.premiumPlanPrice = 19;
    env.premiumPlanCurrency = "USD";
    env.publicServerUrl = "https://papertrade.example.com";
    env.clientOrigin = "http://localhost:3000";
  });

  test("creates a hosted Skrill checkout for standard users", async () => {
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
            subscription_tier: "STANDARD",
            created_at: "2026-01-01T00:00:00.000Z",
          },
        ],
      })
      .mockResolvedValueOnce({
        rowCount: 1,
        rows: [
          {
            id: "payment-1",
            merchant_transaction_id: "PTP-123",
          },
        ],
      });

    const response = await request(app)
      .post("/api/billing/skrill/checkout")
      .set("Authorization", `Bearer ${token}`);

    expect(response.statusCode).toBe(200);
    expect(response.body.endpoint).toBe("https://pay.skrill.com");
    expect(response.body.fields.pay_to_email).toBe("merchant@example.com");
    expect(response.body.fields.payment_id).toBe("payment-1");
    expect(response.body.fields.return_url).toContain("/billing/return?paymentId=payment-1");
  });

  test("recovers checkout creation when the billing table is missing locally", async () => {
    const token = jwt.sign(
      { sub: "user-1", email: "bigyan@example.com" },
      env.jwtSecret
    );

    const missingTableError = new Error('relation "billing_payments" does not exist');
    missingTableError.code = "42P01";

    db.query
      .mockResolvedValueOnce({
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
      })
      .mockRejectedValueOnce(missingTableError)
      .mockResolvedValueOnce({ rowCount: 0, rows: [] })
      .mockResolvedValueOnce({
        rowCount: 1,
        rows: [
          {
            id: "payment-1",
            merchant_transaction_id: "PTP-123",
          },
        ],
      });

    const response = await request(app)
      .post("/api/billing/skrill/checkout")
      .set("Authorization", `Bearer ${token}`);

    expect(response.statusCode).toBe(200);
    expect(response.body.fields.payment_id).toBe("payment-1");
    expect(
      db.query.mock.calls.some(([sql]) =>
        String(sql).includes("CREATE TABLE IF NOT EXISTS billing_payments")
      )
    ).toBe(true);
  });

  test("accepts a verified Skrill status callback", async () => {
    const payload = {
      merchant_id: "merchant-123",
      transaction_id: "PTP-123",
      mb_amount: "19.00",
      mb_currency: "USD",
      status: "2",
      mb_transaction_id: "MB-999",
      pay_from_email: "payer@example.com",
    };
    payload.md5sig = createSignature(payload);

    const client = {
      query: jest
        .fn()
        .mockResolvedValueOnce()
        .mockResolvedValueOnce({
          rowCount: 1,
          rows: [
            {
              id: "payment-1",
              user_id: "user-1",
              status: "CREATED",
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
      .post("/api/billing/skrill/status")
      .type("form")
      .send(payload);

    expect(response.statusCode).toBe(200);
    expect(response.text).toBe("OK");
    expect(client.query).toHaveBeenCalledWith(
      expect.stringContaining("UPDATE users"),
      ["user-1"]
    );
  });

  test("completes a demo Skrill payment and upgrades the user", async () => {
    env.billingDemoMode = true;

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
          subscription_tier: "STANDARD",
          created_at: "2026-01-01T00:00:00.000Z",
        },
      ],
    });

    const client = {
      query: jest
        .fn()
        .mockResolvedValueOnce()
        .mockResolvedValueOnce({
          rowCount: 1,
          rows: [
            {
              id: "payment-1",
              user_id: "user-1",
              status: "CREATED",
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
      .post("/api/billing/payments/payment-1/demo-complete")
      .set("Authorization", `Bearer ${token}`);

    expect(response.statusCode).toBe(200);
    expect(response.body.status).toBe("PROCESSED");
    expect(response.body.demoMode).toBe(true);
    expect(client.query).toHaveBeenCalledWith(
      expect.stringContaining("UPDATE users"),
      ["user-1"]
    );
  });
});
