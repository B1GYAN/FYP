require("../config/env");
const runSqlFile = require("./runSqlFile");

async function migrate() {
  try {
    await runSqlFile("db/schema.sql");
    console.log("Database schema applied successfully.");
    process.exit(0);
  } catch (error) {
    console.error("Failed to apply database schema:", error);
    process.exit(1);
  }
}

migrate();
