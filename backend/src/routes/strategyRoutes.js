const express = require("express");
const { requireAuth } = require("../middleware/authMiddleware");
const { requirePremium } = require("../middleware/premiumMiddleware");
const { runBacktest } = require("../controllers/strategyController");

const router = express.Router();

router.use(requireAuth);
router.use(requirePremium);
router.post("/backtest", runBacktest);

module.exports = router;
