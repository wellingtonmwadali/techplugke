import { Schema, model } from "mongoose";

export interface CategoryDocument {
  name: string;
  slug: string;
  image: string;
  // References another Category's slug — present only on subcategories (e.g. "Dell" under
  // "Laptops & Computers"). Absent/undefined means this is a top-level category.
  parentSlug?: string;
  createdAt: Date;
  updatedAt: Date;
}

const categorySchema = new Schema<CategoryDocument>(
  {
    name: { type: String, required: true },
    slug: { type: String, required: true, unique: true, index: true },
    image: { type: String, required: true },
    parentSlug: { type: String, index: true },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

export const Category = model<CategoryDocument>("Category", categorySchema);
