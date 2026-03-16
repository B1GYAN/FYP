const express = require("express");
const {
  getTrades,
  createTrade,
} = require("../controllers/tradeController");

const router = express.Router();

router.get("/", getTrades);
router.post("/", createTrade);

module.exports = router;
