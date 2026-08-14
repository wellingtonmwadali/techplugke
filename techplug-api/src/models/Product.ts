import { Schema, model } from "mongoose";

export const IMAGE_BACKGROUNDS = ["transparent", "studio", "lifestyle"] as const;
export type ImageBackground = (typeof IMAGE_BACKGROUNDS)[number];

export interface ProductDocument {
  name: string;
  slug: string;
  brand?: string;
  price: number;
  compareAtPrice?: number;
  categorySlugs: string[];
  images: string[];
  // Parallel to `images` (same index), tags each image's art-direction so the storefront
  // renderer can eventually pick a floating-cutout vs. flat-canvas treatment. `images[0]` is
  // always treated as the cover/primary image by every consumer — order carries that meaning,
  // there's no separate "isCover" flag.
  imageBackgrounds: ImageBackground[];
  colors: string[];
  specs?: string;
  warranty?: string;
  description?: string;
  stockQuantity: number;
  inStock: boolean; // virtual — derived from stockQuantity, not stored
  badges?: string[];
  // References Placement.slug (models/Placement.ts) — kept as a plain string array rather than
  // a populated ref since a product only needs to render as a matching tag/homepage section,
  // never traverse to the Placement document itself.
  placements: string[];
  createdAt: Date;
  updatedAt: Date;
}

const productSchema = new Schema<ProductDocument>(
  {
    name: { type: String, required: true },
    slug: { type: String, required: true, unique: true, index: true },
    brand: { type: String },
    price: { type: Number, required: true },
    compareAtPrice: { type: Number },
    categorySlugs: {
      type: [String],
      required: true,
      index: true,
      validate: {
        validator: (value: string[]) => Array.isArray(value) && value.length > 0,
        message: "At least one category is required",
      },
    },
    images: { type: [String], required: true },
    imageBackgrounds: { type: [String], enum: IMAGE_BACKGROUNDS, default: [] },
    colors: { type: [String], default: [] },
    specs: { type: String },
    warranty: { type: String },
    description: { type: String },
    stockQuantity: { type: Number, default: 0, min: 0 },
    badges: { type: [String], default: [] },
    placements: { type: [String], default: [], index: true },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

// List routes sort by createdAt (routes/products.ts) — without this every list/pagination
// query is a full collection scan + in-memory sort.
productSchema.index({ createdAt: -1 });

productSchema.virtual("inStock").get(function (this: { stockQuantity: number }) {
  return this.stockQuantity > 0;
});

export const Product = model<ProductDocument>("Product", productSchema);
