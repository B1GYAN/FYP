const jwt = require("jsonwebtoken");
const env = require("../config/env");
const asyncHandler = require("../utils/asyncHandler");
const db = require("../../db");

const requireAuth = asyncHandler(async (req, res, next) => {
  const authorization = req.headers.authorization || "";

  if (!authorization.startsWith("Bearer ")) {
    res.status(401);
    throw new Error("Authorization token is required");
  }

  const token = authorization.replace("Bearer ", "").trim();

  try {
    const payload = jwt.verify(token, env.jwtSecret);
    const result = await db.query(
      `
        SELECT id, full_name, email, subscription_tier, created_at
        FROM users
        WHERE id = $1
      `,
      [payload.sub]
    );

    if (result.rowCount === 0) {
      res.status(401);
      throw new Error("User no longer exists");
    }

    req.user = {
      ...result.rows[0],
      subscription_tier: result.rows[0].subscription_tier || "STANDARD",
    };
    next();
  } catch (error) {
    if (error.name === "JsonWebTokenError" || error.name === "TokenExpiredError") {
      res.status(401);
      throw new Error("Invalid or expired token");
    }

    throw error;
  }
});

module.exports = {
  requireAuth,
};
