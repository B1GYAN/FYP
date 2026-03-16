const express = require("express");
const {
  getWatchlist,
  addWatchlistItem,
} = require("../controllers/watchlistController");
const { requireAuth } = require("../middleware/authMiddleware");

const router = express.Router();

router.use(requireAuth);
router.get("/", getWatchlist);
router.post("/", addWatchlistItem);

module.exports = router;
