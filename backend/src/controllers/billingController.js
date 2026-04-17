const asyncHandler = require("../utils/asyncHandler");
const billingService = require("../services/billingService");

const createSkrillCheckout = asyncHandler(async (req, res) => {
  const checkout = await billingService.createPremiumCheckout(req.user);
  res.json(checkout);
});

const getBillingPayment = asyncHandler(async (req, res) => {
  const payment = await billingService.getBillingPaymentForUser(
    req.user.id,
    req.params.paymentId
  );
  res.json(payment);
});

const completeDemoBillingPayment = asyncHandler(async (req, res) => {
  const result = await billingService.completeDemoPayment(
    req.user.id,
    req.params.paymentId
  );
  res.json(result);
});

const handleSkrillStatus = asyncHandler(async (req, res) => {
  await billingService.processSkrillStatus(req.body);
  res.status(200).send("OK");
});

module.exports = {
  completeDemoBillingPayment,
  createSkrillCheckout,
  getBillingPayment,
  handleSkrillStatus,
};
