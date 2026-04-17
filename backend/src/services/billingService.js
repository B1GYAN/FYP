const crypto = require("crypto");
const db = require("../../db");
const env = require("../config/env");
const runSqlFile = require("../scripts/runSqlFile");

const PREMIUM_PLAN_CODE = "PREMIUM_MONTHLY";
const SKRILL_PROVIDER = "SKRILL";
const SKRILL_DEMO_PROVIDER = "SKRILL_DEMO";
const FINAL_STATUSES = new Set(["PROCESSED", "FAILED", "CANCELLED", "CHARGEBACK"]);
let billingSchemaRecoveryPromise = null;

function hashMd5(value) {
  return crypto.createHash("md5").update(String(value), "utf8").digest("hex").toUpperCase();
}

function formatAmount(amount) {
  return Number(amount || 0).toFixed(2);
}

function isSkrillConfigured() {
  return Boolean(
    env.skrillPayToEmail &&
      env.skrillMerchantId &&
      env.skrillSecretWord &&
      env.publicServerUrl
  );
}

function requireSkrillConfiguration() {
  if (isSkrillConfigured()) {
    return;
  }

  const error = new Error(
    "Skrill checkout is not configured. Set the Skrill merchant email, merchant ID, secret word, and public server URL."
  );
  error.statusCode = 503;
  throw error;
}

function buildMerchantTransactionId() {
  return `PTP-${Date.now()}-${crypto.randomBytes(4).toString("hex").toUpperCase()}`;
}

function isMissingBillingPaymentsRelation(error) {
  return (
    error?.code === "42P01" &&
    /billing_payments/i.test(String(error.message || ""))
  );
}

async function recoverBillingSchema() {
  if (!billingSchemaRecoveryPromise) {
    billingSchemaRecoveryPromise = runSqlFile("db/schema.sql").catch((error) => {
      billingSchemaRecoveryPromise = null;
      throw error;
    });
  }

  await billingSchemaRecoveryPromise;
}

async function withBillingSchemaRecovery(operation) {
  try {
    return await operation();
  } catch (error) {
    if (!isMissingBillingPaymentsRelation(error)) {
      throw error;
    }

    await recoverBillingSchema();
    return operation();
  }
}

async function createPaymentRecord(user, provider = SKRILL_PROVIDER) {
  const merchantTransactionId = buildMerchantTransactionId();
  const result = await withBillingSchemaRecovery(() =>
    db.query(
      `
        INSERT INTO billing_payments (
          user_id,
          provider,
          plan_code,
          merchant_transaction_id,
          amount,
          currency,
          status,
          recipient_account
        )
        VALUES ($1, $2, $3, $4, $5, $6, 'CREATED', $7)
        RETURNING id, merchant_transaction_id
      `,
      [
        user.id,
        provider,
        PREMIUM_PLAN_CODE,
        merchantTransactionId,
        env.premiumPlanPrice,
        env.premiumPlanCurrency,
        env.skrillPayToEmail || "",
      ]
    )
  );

  return result.rows[0];
}

function mapSkrillStatus(statusCode) {
  switch (String(statusCode || "")) {
    case "2":
      return "PROCESSED";
    case "0":
      return "PENDING";
    case "-1":
      return "CANCELLED";
    case "-2":
      return "FAILED";
    case "-3":
      return "CHARGEBACK";
    default:
      return "UNKNOWN";
  }
}

function getCheckoutFields({ user, payment }) {
  const paymentId = payment.id;
  const amount = formatAmount(env.premiumPlanPrice);

  return {
    pay_to_email: env.skrillPayToEmail,
    transaction_id: payment.merchant_transaction_id,
    return_url: `${env.clientOrigin}/billing/return?paymentId=${paymentId}&state=success`,
    cancel_url: `${env.clientOrigin}/billing/return?paymentId=${paymentId}&state=cancelled`,
    status_url: `${env.publicServerUrl}${env.apiBasePath}/billing/skrill/status`,
    language: "EN",
    amount,
    currency: env.premiumPlanCurrency,
    detail1_description: "Plan:",
    detail1_text: `${env.premiumPlanName} (${amount} ${env.premiumPlanCurrency})`,
    merchant_fields: "payment_id,plan_code",
    payment_id: paymentId,
    plan_code: PREMIUM_PLAN_CODE,
    pay_from_email: user.email,
  };
}

async function createPremiumCheckout(user) {
  if ((user.subscription_tier || "STANDARD") === "PREMIUM") {
    const error = new Error("This account is already on the Premium plan");
    error.statusCode = 409;
    throw error;
  }

  if (env.billingDemoMode) {
    const payment = await createPaymentRecord(user, SKRILL_DEMO_PROVIDER);

    return {
      mode: "DEMO",
      paymentId: payment.id,
      recipientEmail: env.skrillPayToEmail || "Not configured",
      amount: env.premiumPlanPrice,
      currency: env.premiumPlanCurrency,
      planName: env.premiumPlanName,
      instructions:
        "Demo Skrill mode is active. Use this flow to simulate a successful Premium purchase during project presentation.",
    };
  }

  requireSkrillConfiguration();
  const payment = await createPaymentRecord(user, SKRILL_PROVIDER);

  return {
    mode: "HOSTED",
    paymentId: payment.id,
    endpoint: env.skrillCheckoutUrl,
    method: "POST",
    fields: getCheckoutFields({ user, payment }),
  };
}

function isValidSkrillStatusSignature(payload) {
  const md5SecretWord = hashMd5(env.skrillSecretWord);
  const signatureSource = [
    payload.merchant_id || "",
    payload.transaction_id || "",
    md5SecretWord,
    payload.mb_amount || "",
    payload.mb_currency || "",
    payload.status || "",
  ].join("");

  return hashMd5(signatureSource) === String(payload.md5sig || "").toUpperCase();
}

async function downgradeIfNoProcessedPayments(client, userId, excludePaymentId) {
  const result = await client.query(
    `
      SELECT COUNT(*)::int AS count
      FROM billing_payments
      WHERE user_id = $1 AND status = 'PROCESSED' AND id <> $2
    `,
    [userId, excludePaymentId]
  );

  if (result.rows[0].count === 0) {
    await client.query(
      `
        UPDATE users
        SET subscription_tier = 'STANDARD', updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
      `,
      [userId]
    );
  }
}

async function processSkrillStatus(payload) {
  requireSkrillConfiguration();

  if (!payload.transaction_id || !payload.merchant_id || !payload.status) {
    const error = new Error("Missing required Skrill status fields");
    error.statusCode = 400;
    throw error;
  }

  if (String(payload.merchant_id) !== String(env.skrillMerchantId)) {
    const error = new Error("Skrill merchant ID did not match this application");
    error.statusCode = 400;
    throw error;
  }

  if (!isValidSkrillStatusSignature(payload)) {
    const error = new Error("Invalid Skrill payment signature");
    error.statusCode = 400;
    throw error;
  }

  return withBillingSchemaRecovery(async () => {
    const client = await db.getClient();

    try {
      await client.query("BEGIN");

      const paymentResult = await client.query(
        `
          SELECT *
          FROM billing_payments
          WHERE merchant_transaction_id = $1
          FOR UPDATE
        `,
        [payload.transaction_id]
      );

      if (paymentResult.rowCount === 0) {
        const error = new Error("Billing payment record not found");
        error.statusCode = 404;
        throw error;
      }

      const payment = paymentResult.rows[0];
      const nextStatus = mapSkrillStatus(payload.status);

      await client.query(
        `
          UPDATE billing_payments
          SET
            provider_transaction_id = $2,
            status = $3,
            payer_email = $4,
            provider_payload = $5::jsonb,
            processed_at = CASE
              WHEN $3 = 'PROCESSED' THEN CURRENT_TIMESTAMP
              ELSE processed_at
            END,
            updated_at = CURRENT_TIMESTAMP
          WHERE id = $1
        `,
        [
          payment.id,
          payload.mb_transaction_id || null,
          nextStatus,
          payload.pay_from_email || null,
          JSON.stringify(payload),
        ]
      );

      if (nextStatus === "PROCESSED") {
        await client.query(
          `
            UPDATE users
            SET subscription_tier = 'PREMIUM', updated_at = CURRENT_TIMESTAMP
            WHERE id = $1
          `,
          [payment.user_id]
        );
      }

      if (nextStatus === "CHARGEBACK" && payment.status === "PROCESSED") {
        await downgradeIfNoProcessedPayments(client, payment.user_id, payment.id);
      }

      await client.query("COMMIT");

      return {
        paymentId: payment.id,
        status: nextStatus,
        isFinal: FINAL_STATUSES.has(nextStatus),
      };
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  });
}

async function getBillingPaymentForUser(userId, paymentId) {
  const result = await withBillingSchemaRecovery(() =>
    db.query(
      `
        SELECT
          bp.id,
          bp.provider,
          bp.plan_code,
          bp.amount,
          bp.currency,
          bp.status,
          bp.provider_transaction_id,
          bp.payer_email,
          bp.created_at,
          bp.processed_at,
          u.subscription_tier
        FROM billing_payments bp
        INNER JOIN users u ON u.id = bp.user_id
        WHERE bp.id = $1 AND bp.user_id = $2
      `,
      [paymentId, userId]
    )
  );

  if (result.rowCount === 0) {
    const error = new Error("Billing payment not found");
    error.statusCode = 404;
    throw error;
  }

  const row = result.rows[0];

  return {
    id: row.id,
    provider: row.provider,
    planCode: row.plan_code,
    amount: Number(row.amount),
    currency: row.currency,
    status: row.status,
    providerTransactionId: row.provider_transaction_id,
    payerEmail: row.payer_email,
    createdAt: row.created_at,
    processedAt: row.processed_at,
    isFinal: FINAL_STATUSES.has(row.status),
    isPremiumActive: (row.subscription_tier || "STANDARD") === "PREMIUM",
  };
}

async function completeDemoPayment(userId, paymentId) {
  if (!env.billingDemoMode) {
    const error = new Error("Demo billing mode is disabled");
    error.statusCode = 403;
    throw error;
  }

  return withBillingSchemaRecovery(async () => {
    const client = await db.getClient();

    try {
      await client.query("BEGIN");

      const paymentResult = await client.query(
        `
          SELECT *
          FROM billing_payments
          WHERE id = $1 AND user_id = $2
          FOR UPDATE
        `,
        [paymentId, userId]
      );

      if (paymentResult.rowCount === 0) {
        const error = new Error("Billing payment not found");
        error.statusCode = 404;
        throw error;
      }

      const payment = paymentResult.rows[0];

      if (payment.status !== "PROCESSED") {
        await client.query(
          `
            UPDATE billing_payments
            SET
              status = 'PROCESSED',
              provider_payload = $2::jsonb,
              processed_at = CURRENT_TIMESTAMP,
              updated_at = CURRENT_TIMESTAMP
            WHERE id = $1
          `,
          [
            payment.id,
            JSON.stringify({
              mode: "demo",
              provider: "skrill-demo",
              recipientEmail: env.skrillPayToEmail || "",
              completedAt: new Date().toISOString(),
            }),
          ]
        );

        await client.query(
          `
            UPDATE users
            SET subscription_tier = 'PREMIUM', updated_at = CURRENT_TIMESTAMP
            WHERE id = $1
          `,
          [userId]
        );
      }

      await client.query("COMMIT");

      return {
        paymentId: payment.id,
        status: "PROCESSED",
        isFinal: true,
        demoMode: true,
      };
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  });
}

module.exports = {
  completeDemoPayment,
  createPremiumCheckout,
  getBillingPaymentForUser,
  isSkrillConfigured,
  processSkrillStatus,
};
