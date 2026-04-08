const env = require("./src/config/env");
const app = require("./src/app");

function logStartupError(error) {
  if (error.code === "EADDRINUSE") {
    console.error(
      `Port ${env.port} is already in use. Stop the existing process or change PORT in backend/.env.`
    );
    return;
  }

  console.error("Failed to start PaperTrade backend:", error);
}

function startServer({ exitOnError = true } = {}) {
  return new Promise((resolve, reject) => {
    let settled = false;

    const server = app.listen(env.port, () => {
      settled = true;
      console.log(`PaperTrade backend running on http://localhost:${env.port}`);
      resolve(server);
    });

    server.on("error", (error) => {
      logStartupError(error);

      if (!settled) {
        reject(error);
      }

      if (exitOnError) {
        process.exit(1);
      }
    });
  });
}

if (require.main === module) {
  startServer().catch(() => {
    // Startup errors are already logged in the server error handler.
  });
}

module.exports = startServer;
