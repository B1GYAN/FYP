const express = require("express");
const { requireAuth } = require("../middleware/authMiddleware");
const { placeOrder } = require("../controllers/tradingEngineController");

const router = express.Router();

router.use(requireAuth);
router.post("/orders", placeOrder);

module.exports = router;
