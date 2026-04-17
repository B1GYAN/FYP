const express = require("express");
const authRoutes = require("./authRoutes");
const billingRoutes = require("./billingRoutes");
const healthRoutes = require("./healthRoutes");
const lessonRoutes = require("./lessonRoutes");
const marketRoutes = require("./marketRoutes");
const portfolioRoutes = require("./portfolioRoutes");
const strategyRoutes = require("./strategyRoutes");
const tradeRoutes = require("./tradeRoutes");
const tradingEngineRoutes = require("./tradingEngineRoutes");
const watchlistRoutes = require("./watchlistRoutes");

const router = express.Router();

router.use("/auth", authRoutes);
router.use("/billing", billingRoutes);
router.use("/health", healthRoutes);
router.use("/learn", lessonRoutes);
router.use("/market", marketRoutes);
router.use("/portfolio", portfolioRoutes);
router.use("/strategy", strategyRoutes);
router.use("/trades", tradeRoutes);
router.use("/trading", tradingEngineRoutes);
router.use("/watchlist", watchlistRoutes);

module.exports = router;
