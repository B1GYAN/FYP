const path = require("path");
const dotenv = require("dotenv");

dotenv.config({ path: path.join(__dirname, "../../.env") });

function trimTrailingSlash(value) {
  return String(value || "").replace(/\/+$/, "");
}

const port = Number(process.env.PORT || 5001);
const clientOrigin = trimTrailingSlash(
  process.env.CLIENT_ORIGIN || "http://localhost:3000"
);
const publicServerUrl = trimTrailingSlash(
  process.env.PUBLIC_SERVER_URL || `http://localhost:${port}`
);

const env = {
  nodeEnv: process.env.NODE_ENV || "development",
  port,
  clientOrigin,
  publicServerUrl,
  apiBasePath: "/api",
  jwtSecret: process.env.JWT_SECRET || "papertrade-dev-secret",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "7d",
  skrillCheckoutUrl: process.env.SKRILL_CHECKOUT_URL || "https://pay.skrill.com",
  skrillPayToEmail: process.env.SKRILL_PAY_TO_EMAIL || "",
  skrillMerchantId: process.env.SKRILL_MERCHANT_ID || "",
  skrillSecretWord: process.env.SKRILL_SECRET_WORD || "",
  premiumPlanName: process.env.PREMIUM_PLAN_NAME || "PaperTrade Premium",
  premiumPlanPrice: Number(process.env.PREMIUM_PLAN_PRICE || 19),
  premiumPlanCurrency: process.env.PREMIUM_PLAN_CURRENCY || "USD",
  billingDemoMode: String(process.env.BILLING_DEMO_MODE || "false").toLowerCase() === "true",
};

module.exports = env;
