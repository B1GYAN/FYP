const asyncHandler = require("../utils/asyncHandler");
const portfolioService = require("../services/portfolioService");

const getPortfolio = asyncHandler(async (req, res) => {
  const summary = await portfolioService.getPortfolioSummary(req.user.id);
  res.json(summary);
});

const getTransactions = asyncHandler(async (req, res) => {
  const transactions = await portfolioService.getTransactionHistory(req.user.id);
  res.json(transactions);
});

const getOrders = asyncHandler(async (req, res) => {
  const orders = await portfolioService.getRecentOrders(req.user.id);
  res.json(orders);
});

module.exports = {
  getPortfolio,
  getTransactions,
  getOrders,
};
