import { Router } from "express";
import mongoose from "mongoose";
import { authenticate } from "../middleware/authenticate.js";
import { requireAdmin } from "../middleware/requireAdmin.js";
import { Category } from "../models/Category.js";
import { validateImageDimensions } from "../utils/imageDimensions.js";

export const categoriesRouter = Router();

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// Same base64-data-URI storage pattern as Product.images (see techplug-admin/src/lib/uploadImage.ts)
// — a single category image comfortably clears Express's 15mb json limit set in app.ts, so no
// separate size guard is needed beyond the dimension check already used for products.
const MAX_IMAGE_CHARS = 4_000_000;

categoriesRouter.get("/", async (_req, res) => {
  const categories = await Category.find().sort({ name: 1 });
  res.json(categories);
});

categoriesRouter.get("/:id", async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    res.status(400).json({ error: "Invalid category id" });
    return;
  }
  const category = await Category.findById(req.params.id);
  if (!category) {
    res.status(404).json({ error: "Category not found" });
    return;
  }
  res.json(category);
});

categoriesRouter.post("/", authenticate, requireAdmin, async (req, res) => {
  const body = req.body ?? {};

  if (typeof body.name !== "string" || body.name.trim().length === 0) {
    res.status(400).json({ error: "Name is required" });
    return;
  }
  if (typeof body.image !== "string" || body.image.trim().length === 0) {
    res.status(400).json({ error: "An image is required" });
    return;
  }
  if (body.image.length > MAX_IMAGE_CHARS) {
    res.status(413).json({ error: "Image is too large — use a smaller file" });
    return;
  }
  const dimensionError = validateImageDimensions([body.image]);
  if (dimensionError) {
    res.status(400).json({ error: dimensionError });
    return;
  }

  let parentSlug: string | undefined;
  if (typeof body.parentSlug === "string" && body.parentSlug.trim()) {
    const parent = await Category.findOne({ slug: body.parentSlug.trim() });
    if (!parent) {
      res.status(400).json({ error: "Parent category not found" });
      return;
    }
    if (parent.parentSlug) {
      res.status(400).json({ error: "A subcategory cannot itself have a subcategory" });
      return;
    }
    parentSlug = body.parentSlug.trim();
  }

  try {
    const category = new Category({
      name: body.name,
      slug: typeof body.slug === "string" && body.slug.trim() ? slugify(body.slug) : slugify(body.name),
      image: body.image,
      parentSlug,
    });
    await category.save();
    res.status(201).json(category);
  } catch (err) {
    if (err instanceof Error && "code" in err && (err as { code?: number }).code === 11000) {
      res.status(409).json({ error: "A category with that slug already exists" });
      return;
    }
    res.status(500).json({ error: "Failed to create category" });
  }
});

categoriesRouter.put("/:id", authenticate, requireAdmin, async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    res.status(400).json({ error: "Invalid category id" });
    return;
  }

  const body = req.body ?? {};
  const update: Record<string, unknown> = {};
  const unset: Record<string, unknown> = {};

  if (body.name !== undefined) update.name = body.name;
  if (body.slug !== undefined) update.slug = slugify(body.slug);
  if (body.image !== undefined) {
    if (body.image.length > MAX_IMAGE_CHARS) {
      res.status(413).json({ error: "Image is too large — use a smaller file" });
      return;
    }
    const dimensionError = validateImageDimensions([body.image]);
    if (dimensionError) {
      res.status(400).json({ error: dimensionError });
      return;
    }
    update.image = body.image;
  }
  if (body.parentSlug !== undefined) {
    if (body.parentSlug === null || body.parentSlug === "") {
      // Explicit clear — demote back to a top-level category. $set: { parentSlug: undefined }
      // is silently dropped by Mongoose, so this needs a real $unset.
      unset.parentSlug = "";
    } else if (typeof body.parentSlug === "string") {
      const current = await Category.findById(req.params.id);
      if (current && body.parentSlug === current.slug) {
        res.status(400).json({ error: "A category cannot be its own parent" });
        return;
      }
      const parent = await Category.findOne({ slug: body.parentSlug });
      if (!parent) {
        res.status(400).json({ error: "Parent category not found" });
        return;
      }
      if (parent.parentSlug) {
        res.status(400).json({ error: "A subcategory cannot itself have a subcategory" });
        return;
      }
      update.parentSlug = body.parentSlug;
    }
  }

  const mongoUpdate: Record<string, unknown> = { $set: update };
  if (Object.keys(unset).length > 0) mongoUpdate.$unset = unset;

  try {
    const category = await Category.findByIdAndUpdate(req.params.id, mongoUpdate, {
      new: true,
      runValidators: true,
    });
    if (!category) {
      res.status(404).json({ error: "Category not found" });
      return;
    }
    res.json(category);
  } catch (err) {
    if (err instanceof Error && "code" in err && (err as { code?: number }).code === 11000) {
      res.status(409).json({ error: "A category with that slug already exists" });
      return;
    }
    res.status(500).json({ error: "Failed to update category" });
  }
});

categoriesRouter.delete("/:id", authenticate, requireAdmin, async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    res.status(400).json({ error: "Invalid category id" });
    return;
  }
  const category = await Category.findById(req.params.id);
  if (!category) {
    res.status(404).json({ error: "Category not found" });
    return;
  }
  const subcategoryCount = await Category.countDocuments({ parentSlug: category.slug });
  if (subcategoryCount > 0) {
    res.status(409).json({
      error: `Delete or reassign its ${subcategoryCount} subcategor${subcategoryCount === 1 ? "y" : "ies"} first`,
    });
    return;
  }
  await category.deleteOne();
  res.status(204).send();
});
