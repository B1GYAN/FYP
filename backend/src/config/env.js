const path = require("path");
const dotenv = require("dotenv");

dotenv.config({ path: path.join(__dirname, "../../.env") });

const env = {
  nodeEnv: process.env.NODE_ENV || "development",
  port: Number(process.env.PORT || 5001),
  clientOrigin: process.env.CLIENT_ORIGIN || "http://localhost:3000",
  apiBasePath: "/api",
  jwtSecret: process.env.JWT_SECRET || "papertrade-dev-secret",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "7d",
};

module.exports = env;
