import { Schema, model, type HydratedDocument } from "mongoose";

// Singleton document — there's only ever one settings row for this store.
export interface SettingsDocument {
  shopName: string;
  ownerName: string;
  notificationEmail: string;
  emailOnNewOrder: boolean;
  emailOnLowStock: boolean;
  // Base64 data URI, same storage pattern as Product.images (see routes/products.ts) — no
  // external file host. Unset falls back to the static /logo.png shipped in the storefront.
  logoUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

const settingsSchema = new Schema<SettingsDocument>(
  {
    shopName: { type: String, default: "TechPlug Kenya" },
    ownerName: { type: String, default: "" },
    notificationEmail: { type: String, default: "" },
    emailOnNewOrder: { type: Boolean, default: true },
    emailOnLowStock: { type: Boolean, default: true },
    logoUrl: { type: String },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

export const Settings = model<SettingsDocument>("Settings", settingsSchema);

// There's exactly one settings document — create it with defaults on first access rather than
// requiring a separate seed step. Called on several write paths per request (order creation,
// every marketing send, the M-Pesa callback) despite rarely changing, so the resolved document
// is cached in-process for a short window rather than re-querying every time. Callers that
// mutate and save it (settingsRouter's PUT) mutate this same cached instance, so the cache
// reflects the change immediately without an explicit invalidation step.
const CACHE_TTL_MS = 30_000;
let cached: { doc: HydratedDocument<SettingsDocument>; expiresAt: number } | null = null;

export async function getOrCreateSettings(): Promise<HydratedDocument<SettingsDocument>> {
  if (cached && cached.expiresAt > Date.now()) return cached.doc;

  const existing = await Settings.findOne();
  const doc = existing ?? (await Settings.create({}));
  cached = { doc, expiresAt: Date.now() + CACHE_TTL_MS };
  return doc;
}
