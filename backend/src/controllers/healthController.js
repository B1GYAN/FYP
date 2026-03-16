function getHealth(req, res) {
  res.json({
    status: "ok",
    environment: process.env.NODE_ENV || "development",
    time: new Date().toISOString(),
  });
}

module.exports = {
  getHealth,
};
