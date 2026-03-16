const express = require("express");
const { getOverview, getChartData } = require("../controllers/marketController");

const router = express.Router();

router.get("/overview", getOverview);
router.get("/charts", getChartData);

module.exports = router;
