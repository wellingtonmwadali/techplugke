import { Router } from "express";
import crypto from "node:crypto";
import mongoose from "mongoose";
import { authenticate } from "../middleware/authenticate.js";
import { requireAdmin } from "../middleware/requireAdmin.js";
import { User } from "../models/User.js";
import { Role, STAFF_ROLE_NAMES } from "../models/Role.js";
import { Order } from "../models/Order.js";
import { firebaseAuth } from "../firebase/admin.js";
import { escapeRegExp } from "../utils/text.js";
import { parsePagination } from "../utils/pagination.js";
import { sendEmail } from "../utils/mailer.js";
import { thankYouTemplate } from "../services/emailTemplates.js";
import { getOrCreateSettings } from "../models/Settings.js";

export const usersRouter = Router();

usersRouter.use(authenticate, requireAdmin);

const DAY_MS = 24 * 60 * 60 * 1000;

type Segment = "new" | "active" | "at-risk" | "churned";

// Lifecycle segment derived from order recency, not stored — "new" means never ordered,
// otherwise based on how long ago their most recent order was.
function segmentFor(orderCount: number, lastOrderAt: Date | undefined): Segment {
  if (orderCount === 0 || !lastOrderAt) return "new";
  const daysSinceLastOrder = (Date.now() - lastOrderAt.getTime()) / DAY_MS;
  if (daysSinceLastOrder <= 30) return "active";
  if (daysSinceLastOrder <= 90) return "at-risk";
  return "churned";
}

const FIREBASE_ERROR_MESSAGES: Record<string, string> = {
  "auth/email-already-exists": "That email is already in use by another account.",
  "auth/invalid-email": "Enter a valid email address.",
};

function friendlyFirebaseError(err: unknown, fallback: string): string {
  const code = err && typeof err === "object" && "code" in err ? (err as { code?: string }).code : undefined;
  if (code && FIREBASE_ERROR_MESSAGES[code]) return FIREBASE_ERROR_MESSAGES[code];
  return err instanceof Error ? err.message : fallback;
}

// Lifecycle filter pills exposed in the admin UI — distinct from the `segment` field (which is
// purely recency-based: new/active/at-risk/churned, shown as the row status badge). "repeat"
// and "inactive" here are separate axes (order count, and recency-but-has-ordered) computed
// the same way, just combined differently for filtering purposes than for the badge label.
const LIFECYCLE_FILTERS = ["repeat", "new", "inactive"] as const;
type LifecycleFilter = (typeof LIFECYCLE_FILTERS)[number];

function matchesLifecycleFilter(filterValue: LifecycleFilter, orderCount: number, segment: Segment): boolean {
  if (filterValue === "repeat") return orderCount >= 2;
  if (filterValue === "new") return segment === "new";
  return segment === "at-risk" || segment === "churned"; // "inactive"
}

// Team members (editor/admin/super_admin) live in the same User collection but are managed
// exclusively under /api/team (requireSuperAdmin-gated). Every query in this router excludes
// them so a staff account can't view, edit, or reset-password another staff account — including
// a super_admin — through the customer-management endpoints, which only require requireAdmin.
async function staffRoleIds(): Promise<mongoose.Types.ObjectId[]> {
  const roles = await Role.find({ name: { $in: STAFF_ROLE_NAMES } }).select("_id");
  return roles.map((r) => r._id);
}

function withoutStaff(filter: Record<string, unknown>, staffIds: mongoose.Types.ObjectId[]): Record<string, unknown> {
  return { ...filter, roleId: { $nin: staffIds } };
}

async function findCustomerById(id: string) {
  if (!mongoose.Types.ObjectId.isValid(id)) return null;
  const staffIds = await staffRoleIds();
  return User.findOne({ _id: id, roleId: { $nin: staffIds } });
}

async function orderStatsFor(firebaseUids: string[]) {
  const stats = await Order.aggregate([
    { $match: { firebaseUid: { $in: firebaseUids } } },
    { $sort: { createdAt: -1 } },
    { $group: { _id: "$firebaseUid", count: { $sum: 1 }, spend: { $sum: "$total" }, lastOrderAt: { $first: "$createdAt" } } },
  ]);
  return new Map(stats.map((s) => [s._id, { count: s.count, spend: s.spend, lastOrderAt: s.lastOrderAt as Date }]));
}

function withStats(
  user: InstanceType<typeof User>,
  statsByUid: Map<string, { count: number; spend: number; lastOrderAt: Date }>
) {
  const s = statsByUid.get(user.firebaseUid);
  const orderCount = s?.count ?? 0;
  return {
    ...user.toObject(),
    orderCount,
    totalSpend: s?.spend ?? 0,
    segment: segmentFor(orderCount, s?.lastOrderAt),
  };
}

usersRouter.get("/", async (req, res) => {
  const { search, tag } = req.query;

  const staffIds = await staffRoleIds();
  const filter: Record<string, unknown> = withoutStaff({}, staffIds);
  if (typeof search === "string" && search.trim()) {
    const pattern = new RegExp(escapeRegExp(search.trim()), "i");
    filter.$or = [{ name: pattern }, { email: pattern }];
  }
  // A lifecycle filter value (repeat/new/inactive) is computed from order stats, not a stored
  // tag — handled after stats are attached below. Anything else (e.g. "VIP") is a literal tag match.
  const lifecycleFilter =
    typeof tag === "string" && (LIFECYCLE_FILTERS as readonly string[]).includes(tag) ? (tag as LifecycleFilter) : null;
  if (typeof tag === "string" && tag.trim() && !lifecycleFilter) filter.tags = tag;

  function applyLifecycle<T extends { orderCount: number; segment: Segment }>(items: T[]): T[] {
    return lifecycleFilter ? items.filter((u) => matchesLifecycleFilter(lifecycleFilter, u.orderCount, u.segment)) : items;
  }

  const { page, pageSize } = parsePagination(req.query as Record<string, unknown>);

  // The lifecycle filter (repeat/new/inactive) depends on order stats for the whole matching set
  // before it can be paginated, so it's the one case that still needs a full scan — every other
  // request (the common case) pushes skip/limit down to the DB instead of paginating in memory.
  if (lifecycleFilter) {
    const allUsers = await User.find(filter).sort({ createdAt: -1 });
    const statsByUid = await orderStatsFor(allUsers.map((u) => u.firebaseUid));
    const allMatching = applyLifecycle(allUsers.map((u) => withStats(u, statsByUid)));
    if (page) {
      const total = allMatching.length;
      const items = allMatching.slice((page - 1) * pageSize, page * pageSize);
      res.json({ items, total, page, pageSize });
      return;
    }
    res.json(allMatching);
    return;
  }

  if (page) {
    const [users, total] = await Promise.all([
      User.find(filter).sort({ createdAt: -1 }).skip((page - 1) * pageSize).limit(pageSize),
      User.countDocuments(filter),
    ]);
    const statsByUid = await orderStatsFor(users.map((u) => u.firebaseUid));
    res.json({ items: users.map((u) => withStats(u, statsByUid)), total, page, pageSize });
    return;
  }

  const users = await User.find(filter).sort({ createdAt: -1 });
  const statsByUid = await orderStatsFor(users.map((u) => u.firebaseUid));
  res.json(users.map((u) => withStats(u, statsByUid)));
});

usersRouter.get("/stats", async (_req, res) => {
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const staffIds = await staffRoleIds();
  const customerFilter = withoutStaff({}, staffIds);

  const [totalCustomers, newThisMonth, orderStats, purchaserGroups] = await Promise.all([
    User.countDocuments(customerFilter),
    User.countDocuments({ ...customerFilter, createdAt: { $gte: startOfMonth } }),
    Order.aggregate([{ $group: { _id: null, avg: { $avg: "$total" } } }]),
    Order.aggregate([{ $group: { _id: "$firebaseUid", count: { $sum: 1 } } }]),
  ]);

  const existingBeforeThisMonth = totalCustomers - newThisMonth;
  const growthPercent = existingBeforeThisMonth > 0 ? Math.round((newThisMonth / existingBeforeThisMonth) * 100) : null;

  const purchasers = purchaserGroups.length;
  const repeatPurchasers = purchaserGroups.filter((g) => g.count >= 2).length;
  const repeatRate = purchasers > 0 ? Math.round((repeatPurchasers / purchasers) * 100) : 0;

  res.json({
    totalCustomers,
    newThisMonth,
    growthPercent,
    aov: Math.round(orderStats[0]?.avg ?? 0),
    repeatRate,
  });
});

// Manual customer creation from the admin panel. There's no separate "invite" flow — this
// creates a real Firebase Auth account (random password the customer never sees) plus the
// local User document, then generates a Firebase password-reset link so they can set their
// own password. Mirrors the existing reset-password endpoint's link-generation pattern below.
usersRouter.post("/", async (req, res) => {
  const { name, email, phone, sendWelcomeEmail } = req.body ?? {};

  if (typeof email !== "string" || !email.trim()) {
    res.status(400).json({ error: "Email is required" });
    return;
  }

  let firebaseUid: string;
  try {
    const created = await firebaseAuth.createUser({
      email: email.trim(),
      password: crypto.randomBytes(18).toString("base64url"),
      displayName: typeof name === "string" && name.trim() ? name.trim() : undefined,
    });
    firebaseUid = created.uid;
  } catch (err) {
    res.status(400).json({ error: friendlyFirebaseError(err, "Failed to create customer account") });
    return;
  }

  const user = await User.create({
    firebaseUid,
    email: email.trim(),
    name: typeof name === "string" && name.trim() ? name.trim() : undefined,
    phone: typeof phone === "string" && phone.trim() ? phone.trim() : undefined,
    provider: "password",
    tags: [],
  });

  if (sendWelcomeEmail) {
    try {
      const [resetLink, settings] = await Promise.all([
        firebaseAuth.generatePasswordResetLink(user.email),
        getOrCreateSettings(),
      ]);
      await sendEmail({
        to: user.email,
        subject: "Thank you for shopping with us",
        text: `Hi ${user.name || "there"}, thanks for shopping with ${settings.shopName}! Set your password to sign in any time: ${resetLink}`,
        html: thankYouTemplate(user.name, settings.shopName, resetLink),
      });
    } catch (err) {
      console.error("Thank-you email failed:", err);
    }
  }

  res.status(201).json({ ...user.toObject(), orderCount: 0, totalSpend: 0, segment: "new" as const });
});

usersRouter.get("/:id", async (req, res) => {
  const user = await findCustomerById(req.params.id);
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  const orders = await Order.find({ firebaseUid: user.firebaseUid }).sort({ createdAt: -1 });
  res.json({ ...user.toObject(), orders });
});

usersRouter.patch("/:id", async (req, res) => {
  const user = await findCustomerById(req.params.id);
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  const { tags, email } = req.body ?? {};

  if (email !== undefined && email !== user.email) {
    try {
      await firebaseAuth.updateUser(user.firebaseUid, { email });
    } catch (err) {
      res.status(400).json({ error: friendlyFirebaseError(err, "Failed to update email") });
      return;
    }
    user.email = email;
  }

  if (tags !== undefined) {
    user.tags = Array.isArray(tags) ? tags.filter((t) => typeof t === "string") : [];
  }

  await user.save();
  res.json(user);
});

usersRouter.post("/:id/reset-password", async (req, res) => {
  const user = await findCustomerById(req.params.id);
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  try {
    const link = await firebaseAuth.generatePasswordResetLink(user.email);
    res.json({ link });
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : "Failed to generate reset link" });
  }
});

// Hard delete — removes both the Firebase Auth account and the local record. Order history
// (Order.firebaseUid) is left intact as a historical record; it just no longer resolves to a
// live account. findCustomerById keeps this scoped away from staff accounts, same as every
// other route in this router — deleting a team member's access happens under /api/team instead.
usersRouter.delete("/:id", async (req, res) => {
  const user = await findCustomerById(req.params.id);
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  try {
    await firebaseAuth.deleteUser(user.firebaseUid);
  } catch (err) {
    // auth/user-not-found means the Firebase account is already gone — fine to continue and
    // still remove the local record. Any other failure should stop before we lose the record.
    const code = err && typeof err === "object" && "code" in err ? (err as { code?: string }).code : undefined;
    if (code !== "auth/user-not-found") {
      res.status(400).json({ error: friendlyFirebaseError(err, "Failed to delete customer account") });
      return;
    }
  }

  await User.deleteOne({ _id: user._id });
  res.status(204).send();
});
