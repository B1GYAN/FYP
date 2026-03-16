const asyncHandler = require("../utils/asyncHandler");
const tradingEngineService = require("../services/tradingEngineService");

const placeOrder = asyncHandler(async (req, res) => {
  try {
    const result = await tradingEngineService.placeOrder(req.user.id, req.body);
    res.status(201).json(result);
  } catch (error) {
    if (error.statusCode) {
      res.status(error.statusCode);
    }
    throw error;
  }
});

module.exports = {
  placeOrder,
};
