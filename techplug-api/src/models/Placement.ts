import { Schema, model } from "mongoose";

// Where a product can be surfaced on the storefront homepage (e.g. "Top Deals", "Men's
// Fashion") — admin-configurable via /ad-techplugke/categories' Placements tab. Each one drives
// both a checkbox on the product form and a homepage section keyed by `slug`.
export interface PlacementDocument {
  name: string;
  slug: string;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

const placementSchema = new Schema<PlacementDocument>(
  {
    name: { type: String, required: true },
    slug: { type: String, required: true, unique: true, index: true },
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

export const Placement = model<PlacementDocument>("Placement", placementSchema);

// This store originally shipped with these 8 placements hardcoded as a Mongoose enum on
// Product.placements. Seeded once, on first read, so stores upgrading from that hardcoded list
// keep the same homepage sections and existing products' placement values without a manual
// migration step.
const DEFAULT_PLACEMENTS = [
  { name: "Best Sellers", slug: "best-sellers" },
  { name: "Flash Sales", slug: "flash-sales" },
  { name: "Top Deals", slug: "top-deals" },
  { name: "This Month's Deals", slug: "this-month-deals" },
  { name: "More Deals", slug: "more-deals" },
  { name: "Women's Fashion", slug: "women-deals" },
  { name: "Men's Fashion", slug: "men-deals" },
  { name: "Top Accessories", slug: "top-accessories" },
];

export async function getOrSeedPlacements() {
  const existing = await Placement.find().sort({ sortOrder: 1, createdAt: 1 });
  if (existing.length > 0) return existing;
  return Placement.insertMany(DEFAULT_PLACEMENTS.map((p, i) => ({ ...p, sortOrder: i })));
}
