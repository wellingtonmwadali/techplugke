// The product catalog is populated entirely through the /ad-techplugke admin panel — there is
// no fake/sample catalog seeded here. This script is kept as a placeholder for a future one-off
// migration (e.g. importing a supplier's product list) and currently does nothing but connect
// and exit cleanly.
import dns from "node:dns";
dns.setServers(["8.8.8.8", "1.1.1.1"]);

import mongoose from "mongoose";
import { connectMongo } from "../db/mongoose.js";

async function main() {
  await connectMongo();
  console.log("No sample products to seed — add products via the /ad-techplugke admin panel.");
  await mongoose.disconnect();
  process.exit(0);
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
