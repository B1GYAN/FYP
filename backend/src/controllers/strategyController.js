const asyncHandler = require("../utils/asyncHandler");
const strategyService = require("../services/strategyService");

const runBacktest = asyncHandler(async (req, res) => {
  const result = await strategyService.runBacktest(req.user.id, req.body);
  res.json(result);
});

module.exports = {
  runBacktest,
};
