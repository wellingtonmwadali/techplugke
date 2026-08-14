// Seeds the Category collection from the storefront's static taxonomy
// (techplug-admin/src/lib/data.ts `categories` array), so the /ad-techplugke/categories admin
// page isn't empty. Idempotent — skips any slug that already exists, safe to re-run:
//   npx tsx src/scripts/seedCategories.ts
import dns from "node:dns";
dns.setServers(["8.8.8.8", "1.1.1.1"]);

import mongoose from "mongoose";
import { connectMongo } from "../db/mongoose.js";
import { Category } from "../models/Category.js";

const seedCategories = [
  { name: "Phones & Tablets", slug: "phones-tablets", image: "https://picsum.photos/seed/phones-tablets/600/750" },
  { name: "Laptops & Computers", slug: "laptops-computers", image: "https://picsum.photos/seed/laptops-computers/600/750" },
  { name: "TV & Home Entertainment", slug: "tv-home-entertainment", image: "https://picsum.photos/seed/tv-home-entertainment/600/750" },
  { name: "Audio", slug: "audio", image: "https://picsum.photos/seed/audio/600/750" },
  { name: "Gaming", slug: "gaming", image: "https://picsum.photos/seed/gaming/600/750" },
  { name: "Accessories", slug: "accessories", image: "https://picsum.photos/seed/accessories/600/750" },
  // Marketing/placement-style categories (mirrors techplug-admin/src/lib/placements.ts's
  // PLACEMENT_OPTIONS values/labels) — separate concept from placements (which control
  // homepage section membership), these are just browsable categories with the same names.
  { name: "Best Sellers", slug: "best-sellers", image: "https://picsum.photos/seed/best-sellers/600/750" },
  { name: "Flash Sales", slug: "flash-sales", image: "https://picsum.photos/seed/flash-sales/600/750" },
  { name: "Top Deals", slug: "top-deals", image: "https://picsum.photos/seed/top-deals/600/750" },
  { name: "This Month's Deals", slug: "this-month-deals", image: "https://picsum.photos/seed/this-month-deals/600/750" },
  { name: "More Deals", slug: "more-deals", image: "https://picsum.photos/seed/more-deals/600/750" },
  { name: "Top Accessories", slug: "top-accessories", image: "https://picsum.photos/seed/top-accessories/600/750" },
];

async function main() {
  await connectMongo();

  let created = 0;
  let skipped = 0;
  for (const category of seedCategories) {
    const exists = await Category.exists({ slug: category.slug });
    if (exists) {
      skipped++;
      continue;
    }
    await Category.create(category);
    created++;
  }

  console.log(`Seeded ${created} categor${created === 1 ? "y" : "ies"}, skipped ${skipped} existing.`);
  await mongoose.disconnect();
  process.exit(0);
}

main().catch((err) => {
  console.error("Category seed failed:", err);
  process.exit(1);
});
