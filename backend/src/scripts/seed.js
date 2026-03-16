require("../config/env");
const runSqlFile = require("./runSqlFile");

async function seed() {
  try {
    await runSqlFile("db/seed.sql");
    console.log("Database seed applied successfully.");
    process.exit(0);
  } catch (error) {
    console.error("Failed to seed database:", error);
    process.exit(1);
  }
}

seed();
