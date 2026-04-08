function requirePremium(req, res, next) {
  if ((req.user?.subscription_tier || "STANDARD") !== "PREMIUM") {
    res.status(403);
    throw new Error("This feature is available to Premium members only");
  }

  next();
}

module.exports = {
  requirePremium,
};
