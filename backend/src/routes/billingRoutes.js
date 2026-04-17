const express = require("express");
const {
  completeDemoBillingPayment,
  createSkrillCheckout,
  getBillingPayment,
  handleSkrillStatus,
} = require("../controllers/billingController");
const { requireAuth } = require("../middleware/authMiddleware");

const router = express.Router();

router.post("/skrill/status", handleSkrillStatus);
router.post("/skrill/checkout", requireAuth, createSkrillCheckout);
router.post("/payments/:paymentId/demo-complete", requireAuth, completeDemoBillingPayment);
router.get("/payments/:paymentId", requireAuth, getBillingPayment);

module.exports = router;
