// db.js
// PostgreSQL connection helper using pg.Pool

const { Pool } = require("pg");

const pool = new Pool({
  host: process.env.PGHOST || "localhost",
  port: process.env.PGPORT || 5432,
  user: process.env.PGUSER || "postgres",
  password: process.env.PGPASSWORD || "",
  database: process.env.PGDATABASE || "papertrade",
});

pool.on("error", (err) => {
  console.error("Unexpected PostgreSQL error", err);
  process.exit(-1);
});

module.exports = {
  query: (text, params) => pool.query(text, params),
};
