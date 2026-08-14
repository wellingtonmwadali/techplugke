import { Router } from "express";
import { authenticate } from "../middleware/authenticate.js";
import { requireSuperAdmin } from "../middleware/requireSuperAdmin.js";
import { getOrCreateSettings } from "../models/Settings.js";

export const settingsRouter = Router();

// MongoDB caps a document at 16MB and the logo rides in the same Settings document as
// everything else — cap it well under that, same reasoning as products.ts's image size guard.
const MAX_LOGO_CHARS = 2_000_000; // ~1.5MB decoded

// Public — the storefront header/footer render the shop's logo/name on every page for
// unauthenticated visitors, so this has to be reachable without a staff login. Registered
// before the auth gate below applies to everything else on this router.
settingsRouter.get("/public", async (_req, res) => {
  const settings = await getOrCreateSettings();
  res.json({ shopName: settings.shopName, logoUrl: settings.logoUrl });
});

settingsRouter.use(authenticate, requireSuperAdmin);

settingsRouter.get("/", async (_req, res) => {
  const settings = await getOrCreateSettings();
  res.json(settings);
});

settingsRouter.put("/", async (req, res) => {
  const body = req.body ?? {};
  const settings = await getOrCreateSettings();

  if (typeof body.shopName === "string") settings.shopName = body.shopName;
  if (typeof body.ownerName === "string") settings.ownerName = body.ownerName;
  if (typeof body.notificationEmail === "string") settings.notificationEmail = body.notificationEmail;
  if (typeof body.emailOnNewOrder === "boolean") settings.emailOnNewOrder = body.emailOnNewOrder;
  if (typeof body.emailOnLowStock === "boolean") settings.emailOnLowStock = body.emailOnLowStock;
  if (body.logoUrl === null) {
    settings.logoUrl = undefined;
  } else if (typeof body.logoUrl === "string") {
    if (body.logoUrl.length > MAX_LOGO_CHARS) {
      res.status(400).json({ error: "Logo image is too large." });
      return;
    }
    settings.logoUrl = body.logoUrl;
  }

  await settings.save();
  res.json(settings);
});
