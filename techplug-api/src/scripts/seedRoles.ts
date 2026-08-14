import dns from "node:dns";
dns.setServers(["8.8.8.8", "1.1.1.1"]);

import mongoose from "mongoose";
import { connectMongo } from "../db/mongoose.js";
import { Role } from "../models/Role.js";

const roles = [
  { name: "user" as const, description: "Default role for all sign-ups." },
  { name: "editor" as const, description: "Staff access to the /ad-techplugke admin panel, except Settings & Team." },
  { name: "admin" as const, description: "Staff access to the /ad-techplugke admin panel, except Settings & Team." },
  { name: "super_admin" as const, description: "Full access to the /ad-techplugke admin panel, including Settings & Team." },
];

async function main() {
  await connectMongo();

  for (const role of roles) {
    await Role.findOneAndUpdate(
      { name: role.name },
      { $setOnInsert: role },
      { upsert: true }
    );
    console.log(`Ensured role "${role.name}" exists.`);
  }

  await mongoose.disconnect();
  process.exit(0);
}

main().catch((err) => {
  console.error("Seeding roles failed:", err);
  process.exit(1);
});
