const env = require("./src/config/env");
const app = require("./src/app");

const server = app.listen(env.port, () => {
  console.log(`PaperTrade backend running on http://localhost:${env.port}`);
});

server.on("error", (error) => {
  if (error.code === "EADDRINUSE") {
    console.error(
      `Port ${env.port} is already in use. Stop the existing process or change PORT in backend/.env.`
    );
    process.exit(1);
  }

  console.error("Failed to start PaperTrade backend:", error);
  process.exit(1);
});
