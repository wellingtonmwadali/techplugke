import dns from "node:dns";
dns.setServers(["8.8.8.8", "1.1.1.1"]);

import { app } from "./app.js";
import { config } from "./config/env.js";
import { connectMongo } from "./db/mongoose.js";

// Express 4 doesn't catch rejected promises thrown inside async route handlers — without
// this, a bug like an unguarded duplicate-key write would surface as a silent hang instead
// of a clean error response. Log and keep the process alive rather than crashing on it.
process.on("unhandledRejection", (reason) => {
  console.error("Unhandled promise rejection:", reason);
});

async function main() {
  await connectMongo();
  app.listen(config.port, () => {
    console.log(`API listening on http://localhost:${config.port}`);
  });
}

main().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
