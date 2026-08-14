import { Router } from "express";
import mongoose from "mongoose";
import { authenticate } from "../middleware/authenticate.js";
import { requireAdmin } from "../middleware/requireAdmin.js";
import { Placement, getOrSeedPlacements } from "../models/Placement.js";

export const placementsRouter = Router();

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// Public — the storefront homepage renders one section per placement, unauthenticated, and the
// product form/filters need the list too.
placementsRouter.get("/", async (_req, res) => {
  const placements = await getOrSeedPlacements();
  res.json(placements);
});

placementsRouter.use(authenticate, requireAdmin);

placementsRouter.post("/", async (req, res) => {
  const { name } = req.body ?? {};
  if (typeof name !== "string" || !name.trim()) {
    res.status(400).json({ error: "Name is required" });
    return;
  }
  const slug = slugify(name);
  if (!slug) {
    res.status(400).json({ error: "Enter a valid name" });
    return;
  }

  const count = await Placement.countDocuments();
  try {
    const placement = await Placement.create({ name: name.trim(), slug, sortOrder: count });
    res.status(201).json(placement);
  } catch (err) {
    if (err instanceof Error && "code" in err && (err as { code?: number }).code === 11000) {
      res.status(409).json({ error: "A placement with that name already exists" });
      return;
    }
    res.status(500).json({ error: "Failed to create placement" });
  }
});

// Only the display name is editable — `slug` is what's stored on Product.placements and used as
// the homepage section's data key, so changing it would silently orphan existing products'
// placement assignments and break the matching homepage section.
placementsRouter.put("/:id", async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    res.status(400).json({ error: "Invalid placement id" });
    return;
  }
  const { name } = req.body ?? {};
  if (typeof name !== "string" || !name.trim()) {
    res.status(400).json({ error: "Name is required" });
    return;
  }
  const placement = await Placement.findByIdAndUpdate(req.params.id, { $set: { name: name.trim() } }, { new: true });
  if (!placement) {
    res.status(404).json({ error: "Placement not found" });
    return;
  }
  res.json(placement);
});

placementsRouter.delete("/:id", async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    res.status(400).json({ error: "Invalid placement id" });
    return;
  }
  const placement = await Placement.findByIdAndDelete(req.params.id);
  if (!placement) {
    res.status(404).json({ error: "Placement not found" });
    return;
  }
  res.status(204).send();
});
