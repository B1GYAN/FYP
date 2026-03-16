const fs = require("fs/promises");
const path = require("path");
const db = require("../../db");

async function runSqlFile(relativeFilePath) {
  const absolutePath = path.join(__dirname, "..", relativeFilePath);
  const sql = await fs.readFile(absolutePath, "utf8");
  await db.query(sql);
}

module.exports = runSqlFile;
