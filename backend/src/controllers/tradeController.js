const asyncHandler = require("../utils/asyncHandler");
const tradeService = require("../services/tradeService");

const getTrades = asyncHandler(async (req, res) => {
  res.json(tradeService.getTrades());
});

const createTrade = asyncHandler(async (req, res) => {
  const { side, symbol, qty, price, note } = req.body;

  if (!side || !symbol || Number(qty) <= 0 || Number(price) < 0) {
    res.status(400);
    throw new Error("side, symbol, qty and price are required");
  }

  const trade = tradeService.createTrade({ side, symbol, qty, price, note });
  res.status(201).json(trade);
});

module.exports = {
  getTrades,
  createTrade,
};
