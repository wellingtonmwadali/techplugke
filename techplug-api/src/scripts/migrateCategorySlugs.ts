// One-time migration: converts each product's legacy single `categorySlug` string field into
// the new `categorySlugs: string[]` array field, then removes the old field. Run once, after
// deploying the schema change, before relying on multi-category filtering/admin UI:
//   npx tsx src/scripts/migrateCategorySlugs.ts
//
// Uses the raw collection (not the Mongoose model) since the model's TS type no longer declares
// the legacy `categorySlug` field.
import dns from "node:dns";
dns.setServers(["8.8.8.8", "1.1.1.1"]);

import mongoose from "mongoose";
import { connectMongo } from "../db/mongoose.js";

async function main() {
  await connectMongo();
  const products = mongoose.connection.collection("products");

  const cursor = products.find({ categorySlug: { $exists: true } });
  let migrated = 0;

  for await (const doc of cursor) {
    const legacySlug = doc.categorySlug;
    if (typeof legacySlug !== "string" || !legacySlug) continue;

    await products.updateOne(
      { _id: doc._id },
      {
        $set: { categorySlugs: doc.categorySlugs?.length ? doc.categorySlugs : [legacySlug] },
        $unset: { categorySlug: "" },
      }
    );
    migrated++;
  }

  console.log(`Migrated ${migrated} product(s) from categorySlug to categorySlugs.`);
  await mongoose.disconnect();
  process.exit(0);
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
