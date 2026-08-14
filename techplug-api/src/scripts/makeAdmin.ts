import dns from "node:dns";
dns.setServers(["8.8.8.8", "1.1.1.1"]);

import { connectMongo } from "../db/mongoose.js";
import { User } from "../models/User.js";
import { Role } from "../models/Role.js";
import mongoose from "mongoose";

async function main() {
  const email = process.argv[2];
  if (!email) {
    console.error("Usage: npm run make-admin -- someone@email.com");
    process.exit(1);
  }

  await connectMongo();

  const user = await User.findOne({ email });
  if (!user) {
    console.error(`No user found with email "${email}". They must sign up in the app first.`);
    await mongoose.disconnect();
    process.exit(1);
  }

  const superAdminRole = await Role.findOne({ name: "super_admin" });
  if (!superAdminRole) {
    console.error('No "super_admin" role found. Run `npm run seed-roles` first.');
    await mongoose.disconnect();
    process.exit(1);
  }

  user.roleId = superAdminRole._id;
  await user.save();

  console.log(`${email} is now a super_admin.`);
  await mongoose.disconnect();
  process.exit(0);
}

main().catch((err) => {
  console.error("Failed to promote user:", err);
  process.exit(1);
});
