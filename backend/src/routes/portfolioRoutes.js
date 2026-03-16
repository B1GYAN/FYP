const express = require("express");
const { requireAuth } = require("../middleware/authMiddleware");
const {
  getPortfolio,
  getTransactions,
  getOrders,
} = require("../controllers/portfolioController");

const router = express.Router();

router.use(requireAuth);
router.get("/", getPortfolio);
router.get("/transactions", getTransactions);
router.get("/orders", getOrders);

module.exports = router;
