const express = require("express");
const { requireAuth } = require("../middleware/authMiddleware");
const { runBacktest } = require("../controllers/strategyController");

const router = express.Router();

router.use(requireAuth);
router.post("/backtest", runBacktest);

module.exports = router;
