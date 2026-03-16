const asyncHandler = require("../utils/asyncHandler");
const watchlistService = require("../services/watchlistService");

const getWatchlist = asyncHandler(async (req, res) => {
  const items = await watchlistService.getAllWatchlistItems(req.user.id);
  res.json(items);
});

const addWatchlistItem = asyncHandler(async (req, res) => {
  const { pair } = req.body;

  if (!pair || typeof pair !== "string") {
    res.status(400);
    throw new Error("pair is required (e.g. BTC/USDT)");
  }

  try {
    const item = await watchlistService.createWatchlistItem(req.user.id, pair);
    res.status(201).json(item);
  } catch (error) {
    if (error.statusCode) {
      res.status(error.statusCode);
    }
    throw error;
  }
});

module.exports = {
  getWatchlist,
  addWatchlistItem,
};
