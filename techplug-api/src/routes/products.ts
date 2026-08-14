import { Router } from "express";
import mongoose, { type HydratedDocument } from "mongoose";
import { authenticate } from "../middleware/authenticate.js";
import { requireAdmin } from "../middleware/requireAdmin.js";
import {
  IMAGE_BACKGROUNDS,
  Product,
  type ImageBackground,
  type ProductDocument,
  type ProductVariant,
  type ProductVariantOption,
} from "../models/Product.js";
import { escapeRegExp } from "../utils/text.js";
import { validateImageDimensions } from "../utils/imageDimensions.js";
import { parsePagination } from "../utils/pagination.js";

export const productsRouter = Router();

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// Placement values are admin-defined (models/Placement.ts) rather than a fixed set, so this only
// validates shape (non-empty string) — the product form's checkboxes are themselves populated
// from the Placement collection, so a well-formed client only ever sends real slugs anyway.
function isPlacement(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isImageBackground(value: unknown): value is ImageBackground {
  return typeof value === "string" && (IMAGE_BACKGROUNDS as readonly string[]).includes(value);
}

function isValidVariantOptions(value: unknown): value is ProductVariantOption[] {
  return (
    Array.isArray(value) &&
    value.every(
      (v) =>
        v &&
        typeof v === "object" &&
        typeof (v as Record<string, unknown>).name === "string" &&
        (v as { name: string }).name.trim().length > 0 &&
        Array.isArray((v as { values: unknown }).values) &&
        ((v as { values: unknown[] }).values as unknown[]).every((val) => typeof val === "string" && val.trim())
    )
  );
}

function isValidVariants(value: unknown): value is ProductVariant[] {
  return (
    Array.isArray(value) &&
    value.every((v) => {
      if (!v || typeof v !== "object") return false;
      const variant = v as Record<string, unknown>;
      if (typeof variant.price !== "number" || variant.price < 0) return false;
      if (variant.compareAtPrice !== undefined && typeof variant.compareAtPrice !== "number") return false;
      if (!variant.options || typeof variant.options !== "object") return false;
      return Object.values(variant.options as Record<string, unknown>).every((val) => typeof val === "string");
    })
  );
}

// Keeps the base `price` (used by product cards, price sort/filter, and any code that hasn't
// been taught about variants) equal to the cheapest variant whenever variants are set — so admins
// only ever have to think about per-variant prices once a product has any.
function cheapestVariantPrice(variants: ProductVariant[]): number | undefined {
  if (variants.length === 0) return undefined;
  return Math.min(...variants.map((v) => v.price));
}

// MongoDB caps a document at 16MB; images are stored as base64 data URIs directly on the
// product document (see techplug-admin/src/lib/uploadImage.ts), so a handful of them can
// approach that limit even though each individual file is capped at 2MB client-side. Cap
// the combined size well under the hard limit, leaving headroom for the rest of the doc.
const MAX_TOTAL_IMAGE_CHARS = 12_000_000; // ~9MB decoded

function imagesTooLarge(images: unknown): boolean {
  if (!Array.isArray(images)) return false;
  const total = images.reduce((sum, img) => sum + (typeof img === "string" ? img.length : 0), 0);
  return total > MAX_TOTAL_IMAGE_CHARS;
}

const PRODUCT_FIELDS = [
  "name",
  "brand",
  "price",
  "compareAtPrice",
  "categorySlugs",
  "images",
  "imageBackgrounds",
  "colors",
  "variantOptions",
  "variants",
  "specs",
  "warranty",
  "description",
  "stockQuantity",
  "badges",
  "placements",
] as const;

// List/batch responses only need a thumbnail — full galleries are only ever shown from a
// single-product fetch (by :id or ?slug=). Keeps list payloads from scaling with catalog size
// now that every image is an embedded base64 string rather than a hosted URL.
function toListShape(product: HydratedDocument<ProductDocument>) {
  const obj = product.toObject();
  return { ...obj, images: obj.images.slice(0, 1) };
}

productsRouter.get("/", async (req, res) => {
  const { category, placement, ids, slug, search, inStock } = req.query;

  if (typeof slug === "string") {
    const product = await Product.findOne({ slug });
    if (!product) {
      res.status(404).json({ error: "Product not found" });
      return;
    }
    res.json(product);
    return;
  }

  const filter: Record<string, unknown> = {};
  if (category === "sale") {
    filter.compareAtPrice = { $exists: true, $ne: null };
  } else if (category === "new") {
    filter.badges = "New";
  } else if (typeof category === "string") {
    filter.categorySlugs = category;
  }
  if (typeof placement === "string") filter.placements = placement;
  // inStock is a virtual (derived from stockQuantity), not a stored field — filter on the
  // underlying number instead.
  if (inStock === "true") filter.stockQuantity = { $gt: 0 };
  else if (inStock === "false") filter.stockQuantity = { $lte: 0 };
  if (typeof search === "string" && search.trim()) {
    const pattern = new RegExp(escapeRegExp(search.trim()), "i");
    filter.$or = [{ name: pattern }, { brand: pattern }];
  }
  if (typeof ids === "string") {
    const validIds = ids
      .split(",")
      .map((id) => id.trim())
      .filter((id) => mongoose.Types.ObjectId.isValid(id));
    filter._id = { $in: validIds };
  }

  const { page, pageSize } = parsePagination(req.query as Record<string, unknown>);

  if (page) {
    const [items, total] = await Promise.all([
      Product.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * pageSize)
        .limit(pageSize),
      Product.countDocuments(filter),
    ]);
    res.json({ items: items.map(toListShape), total, page, pageSize });
    return;
  }

  const products = await Product.find(filter).sort({ createdAt: -1 });
  res.json(products.map(toListShape));
});

productsRouter.post("/batch", async (req, res) => {
  const { ids } = req.body ?? {};
  if (!Array.isArray(ids) || ids.length === 0) {
    res.json([]);
    return;
  }
  const validIds = ids.filter((id) => typeof id === "string" && mongoose.Types.ObjectId.isValid(id));
  const products = await Product.find({ _id: { $in: validIds } });
  res.json(products.map(toListShape));
});

productsRouter.patch("/bulk", authenticate, requireAdmin, async (req, res) => {
  const { ids, update } = req.body ?? {};
  if (!Array.isArray(ids) || ids.length === 0) {
    res.status(400).json({ error: "ids is required" });
    return;
  }
  const validIds = ids.filter((id) => mongoose.Types.ObjectId.isValid(id));
  if (validIds.length === 0) {
    res.status(400).json({ error: "No valid product ids" });
    return;
  }
  if (!update || typeof update !== "object") {
    res.status(400).json({ error: "update is required" });
    return;
  }

  const safeUpdate: Record<string, unknown> = {};
  for (const field of PRODUCT_FIELDS) {
    if (update[field] !== undefined) safeUpdate[field] = update[field];
  }
  if (safeUpdate.placements !== undefined) {
    safeUpdate.placements = Array.isArray(safeUpdate.placements)
      ? (safeUpdate.placements as unknown[]).filter(isPlacement)
      : [];
  }
  if (Object.keys(safeUpdate).length === 0) {
    res.status(400).json({ error: "No valid fields to update" });
    return;
  }

  const result = await Product.updateMany({ _id: { $in: validIds } }, { $set: safeUpdate });
  res.json({ matched: result.matchedCount, modified: result.modifiedCount });
});

productsRouter.delete("/bulk", authenticate, requireAdmin, async (req, res) => {
  const { ids } = req.body ?? {};
  if (!Array.isArray(ids) || ids.length === 0) {
    res.status(400).json({ error: "ids is required" });
    return;
  }
  const validIds = ids.filter((id) => mongoose.Types.ObjectId.isValid(id));
  const result = await Product.deleteMany({ _id: { $in: validIds } });
  res.json({ deleted: result.deletedCount });
});

productsRouter.post("/import", authenticate, requireAdmin, async (req, res) => {
  const { products } = req.body ?? {};
  if (!Array.isArray(products) || products.length === 0) {
    res.status(400).json({ error: "products is required" });
    return;
  }

  const results: { row: number; success: boolean; error?: string }[] = [];

  for (let i = 0; i < products.length; i++) {
    const row = products[i] as Record<string, string>;
    try {
      const name = row.name?.trim();
      const price = Number(row.price);
      const categorySlugs = row.categorySlugs
        ? row.categorySlugs.split(";").map((s) => s.trim()).filter(Boolean)
        : [];
      const images = row.images ? row.images.split(";").map((s) => s.trim()).filter(Boolean) : [];

      if (!name) throw new Error("Missing name");
      if (!Number.isFinite(price) || price < 0) throw new Error("Invalid price");
      if (categorySlugs.length === 0) throw new Error("Missing categorySlugs");
      if (images.length === 0) throw new Error("Missing images");

      const product = new Product({
        name,
        slug: slugify(row.slug?.trim() || name),
        brand: row.brand?.trim(),
        price,
        compareAtPrice: row.compareAtPrice ? Number(row.compareAtPrice) : undefined,
        categorySlugs,
        images,
        colors: row.colors ? row.colors.split(";").map((s) => s.trim()).filter(Boolean) : [],
        specs: row.specs?.trim(),
        warranty: row.warranty?.trim(),
        description: row.description?.trim(),
        stockQuantity: row.stockQuantity ? Math.max(0, Number(row.stockQuantity) || 0) : 0,
        badges: row.badges ? row.badges.split(";").map((s) => s.trim()).filter(Boolean) : [],
        placements: row.placements
          ? row.placements.split(";").map((s) => s.trim()).filter(isPlacement)
          : [],
      });
      await product.save();
      results.push({ row: i + 1, success: true });
    } catch (err) {
      results.push({ row: i + 1, success: false, error: err instanceof Error ? err.message : "Failed" });
    }
  }

  res.json({ results });
});

productsRouter.post("/:id/duplicate", authenticate, requireAdmin, async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    res.status(400).json({ error: "Invalid product id" });
    return;
  }
  const source = await Product.findById(req.params.id);
  if (!source) {
    res.status(404).json({ error: "Product not found" });
    return;
  }

  let slug = `${source.slug}-copy`;
  let suffix = 2;
  while (await Product.exists({ slug })) {
    slug = `${source.slug}-copy-${suffix}`;
    suffix += 1;
  }

  const copy = new Product({
    name: `${source.name} (Copy)`,
    slug,
    brand: source.brand,
    price: source.price,
    compareAtPrice: source.compareAtPrice,
    categorySlugs: source.categorySlugs,
    images: source.images,
    imageBackgrounds: source.imageBackgrounds,
    colors: source.colors,
    variantOptions: source.variantOptions,
    variants: source.variants,
    specs: source.specs,
    warranty: source.warranty,
    description: source.description,
    // Deliberately not carried over — a catalog duplicate doesn't inherit the source's
    // physical stock count; the admin must set it consciously, same as placements below.
    stockQuantity: 0,
    badges: source.badges,
    placements: [],
  });
  await copy.save();
  res.status(201).json(copy);
});

productsRouter.get("/:id", async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    res.status(400).json({ error: "Invalid product id" });
    return;
  }
  const product = await Product.findById(req.params.id);
  if (!product) {
    res.status(404).json({ error: "Product not found" });
    return;
  }
  res.json(product);
});

productsRouter.post("/", authenticate, requireAdmin, async (req, res) => {
  const body = req.body ?? {};

  if (typeof body.name !== "string" || body.name.trim().length === 0) {
    res.status(400).json({ error: "Name is required" });
    return;
  }
  if (typeof body.price !== "number" || body.price < 0) {
    res.status(400).json({ error: "Valid price is required" });
    return;
  }
  if (!Array.isArray(body.categorySlugs) || body.categorySlugs.length === 0) {
    res.status(400).json({ error: "At least one category is required" });
    return;
  }
  if (!Array.isArray(body.images) || body.images.length === 0) {
    res.status(400).json({ error: "At least one image is required" });
    return;
  }
  if (imagesTooLarge(body.images)) {
    res.status(413).json({ error: "Images are too large combined — remove one or use smaller files" });
    return;
  }
  const dimensionError = validateImageDimensions(body.images);
  if (dimensionError) {
    res.status(400).json({ error: dimensionError });
    return;
  }
  const placements = Array.isArray(body.placements) ? body.placements.filter(isPlacement) : [];
  const imageBackgrounds = Array.isArray(body.imageBackgrounds)
    ? body.imageBackgrounds.filter(isImageBackground)
    : [];

  let variantOptions: ProductVariantOption[] | undefined;
  let variants: ProductVariant[] | undefined;
  if (body.variantOptions !== undefined || body.variants !== undefined) {
    if (body.variantOptions !== undefined && !isValidVariantOptions(body.variantOptions)) {
      res.status(400).json({ error: "Invalid variant options" });
      return;
    }
    if (body.variants !== undefined && !isValidVariants(body.variants)) {
      res.status(400).json({ error: "Invalid variants" });
      return;
    }
    variantOptions = body.variantOptions;
    variants = body.variants;
  }
  // A product with priced variants always sells at its cheapest variant's price on cards/
  // listings — see cheapestVariantPrice's doc comment.
  const price = variants && variants.length > 0 ? cheapestVariantPrice(variants)! : body.price;

  try {
    const product = new Product({
      name: body.name,
      slug: typeof body.slug === "string" && body.slug.trim() ? slugify(body.slug) : slugify(body.name),
      brand: body.brand,
      price,
      compareAtPrice: body.compareAtPrice,
      categorySlugs: body.categorySlugs,
      images: body.images,
      imageBackgrounds,
      colors: Array.isArray(body.colors) ? body.colors : [],
      variantOptions,
      variants,
      specs: body.specs,
      warranty: body.warranty,
      description: body.description,
      stockQuantity:
        typeof body.stockQuantity === "number" && body.stockQuantity >= 0 ? body.stockQuantity : 0,
      badges: Array.isArray(body.badges) ? body.badges : [],
      placements,
    });
    await product.save();
    res.status(201).json(product);
  } catch (err) {
    if (err instanceof Error && "code" in err && (err as { code?: number }).code === 11000) {
      res.status(409).json({ error: "A product with that slug already exists" });
      return;
    }
    res.status(500).json({ error: "Failed to create product" });
  }
});

productsRouter.put("/:id", authenticate, requireAdmin, async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    res.status(400).json({ error: "Invalid product id" });
    return;
  }

  const body = req.body ?? {};

  if (body.images !== undefined) {
    if (imagesTooLarge(body.images)) {
      res.status(413).json({ error: "Images are too large combined — remove one or use smaller files" });
      return;
    }
    const dimensionError = validateImageDimensions(body.images);
    if (dimensionError) {
      res.status(400).json({ error: dimensionError });
      return;
    }
  }

  if (body.variantOptions !== undefined && !isValidVariantOptions(body.variantOptions)) {
    res.status(400).json({ error: "Invalid variant options" });
    return;
  }
  if (body.variants !== undefined && !isValidVariants(body.variants)) {
    res.status(400).json({ error: "Invalid variants" });
    return;
  }

  const update: Record<string, unknown> = {};

  if (body.name !== undefined) update.name = body.name;
  if (body.slug !== undefined) update.slug = slugify(body.slug);
  if (body.brand !== undefined) update.brand = body.brand;
  if (body.price !== undefined) update.price = body.price;
  if (body.compareAtPrice !== undefined) update.compareAtPrice = body.compareAtPrice;
  if (body.categorySlugs !== undefined) update.categorySlugs = body.categorySlugs;
  if (body.images !== undefined) update.images = body.images;
  if (body.imageBackgrounds !== undefined) {
    update.imageBackgrounds = Array.isArray(body.imageBackgrounds)
      ? body.imageBackgrounds.filter(isImageBackground)
      : [];
  }
  if (body.colors !== undefined) update.colors = body.colors;
  if (body.variantOptions !== undefined) update.variantOptions = body.variantOptions;
  if (body.variants !== undefined) {
    update.variants = body.variants;
    // See cheapestVariantPrice's doc comment — this overrides whatever `price` the client sent
    // whenever variants are (still) present, same rule as create.
    const cheapest = cheapestVariantPrice(body.variants as ProductVariant[]);
    if (cheapest !== undefined) update.price = cheapest;
  }
  if (body.specs !== undefined) update.specs = body.specs;
  if (body.warranty !== undefined) update.warranty = body.warranty;
  if (body.description !== undefined) update.description = body.description;
  if (body.stockQuantity !== undefined && typeof body.stockQuantity === "number" && body.stockQuantity >= 0) {
    update.stockQuantity = body.stockQuantity;
  }
  if (body.badges !== undefined) update.badges = body.badges;
  if (body.placements !== undefined) {
    update.placements = Array.isArray(body.placements) ? body.placements.filter(isPlacement) : [];
  }

  try {
    const product = await Product.findByIdAndUpdate(
      req.params.id,
      { $set: update },
      { new: true, runValidators: true }
    );
    if (!product) {
      res.status(404).json({ error: "Product not found" });
      return;
    }
    res.json(product);
  } catch (err) {
    if (err instanceof Error && "code" in err && (err as { code?: number }).code === 11000) {
      res.status(409).json({ error: "A product with that slug already exists" });
      return;
    }
    res.status(500).json({ error: "Failed to update product" });
  }
});

productsRouter.delete("/:id", authenticate, requireAdmin, async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    res.status(400).json({ error: "Invalid product id" });
    return;
  }
  const product = await Product.findByIdAndDelete(req.params.id);
  if (!product) {
    res.status(404).json({ error: "Product not found" });
    return;
  }
  res.status(204).send();
});
