import { Router } from "express";
import crypto from "node:crypto";
import mongoose from "mongoose";
import { authenticate } from "../middleware/authenticate.js";
import { requireSuperAdmin } from "../middleware/requireSuperAdmin.js";
import { User } from "../models/User.js";
import { Role, STAFF_ROLE_NAMES, type StaffRoleName } from "../models/Role.js";
import { firebaseAuth } from "../firebase/admin.js";
import { sendEmail } from "../utils/mailer.js";
import { teamInviteTemplate } from "../services/emailTemplates.js";
import { getOrCreateSettings } from "../models/Settings.js";

export const teamRouter = Router();

teamRouter.use(authenticate, requireSuperAdmin);

const FIREBASE_ERROR_MESSAGES: Record<string, string> = {
  "auth/email-already-exists": "That email is already in use by another account.",
  "auth/invalid-email": "Enter a valid email address.",
};

function friendlyFirebaseError(err: unknown, fallback: string): string {
  const code = err && typeof err === "object" && "code" in err ? (err as { code?: string }).code : undefined;
  if (code && FIREBASE_ERROR_MESSAGES[code]) return FIREBASE_ERROR_MESSAGES[code];
  return err instanceof Error ? err.message : fallback;
}

function isStaffRoleName(value: unknown): value is StaffRoleName {
  return typeof value === "string" && (STAFF_ROLE_NAMES as readonly string[]).includes(value);
}

async function withRoleName(user: InstanceType<typeof User>, roleById: Map<string, string>) {
  return { ...user.toObject(), role: roleById.get(String(user.roleId)) ?? "user" };
}

teamRouter.get("/", async (_req, res) => {
  const staffRoles = await Role.find({ name: { $in: STAFF_ROLE_NAMES } });
  const roleById = new Map(staffRoles.map((r) => [String(r._id), r.name]));
  const staffRoleIds = staffRoles.map((r) => r._id);

  const members = await User.find({ roleId: { $in: staffRoleIds } }).sort({ createdAt: -1 });
  res.json(await Promise.all(members.map((m) => withRoleName(m, roleById))));
});

// Creates a real Firebase Auth account (random password the invitee never sees) plus the local
// User document with a staff roleId, then emails a password-reset link so they can sign in —
// same pattern as the admin "Add Customer" flow (routes/users.ts).
teamRouter.post("/", async (req, res) => {
  const { name, email, role } = req.body ?? {};

  if (typeof email !== "string" || !email.trim()) {
    res.status(400).json({ error: "Email is required" });
    return;
  }
  if (!isStaffRoleName(role)) {
    res.status(400).json({ error: `Role must be one of: ${STAFF_ROLE_NAMES.join(", ")}` });
    return;
  }

  const roleDoc = await Role.findOne({ name: role });
  if (!roleDoc) {
    res.status(500).json({ error: `Role "${role}" is not seeded — run the seed-roles script.` });
    return;
  }

  const trimmedEmail = email.trim();
  const existing = await User.findOne({ email: trimmedEmail });

  let user: InstanceType<typeof User>;
  if (existing) {
    // The email may belong to a plain customer, or to someone previously removed from the team
    // (DELETE below demotes rather than deletes, so their account — and this email — still
    // exists). Either way there's already a real Firebase account for it, so promote it in
    // place and resend the invite instead of trying to create a second Firebase account for the
    // same email, which would always fail with "email already exists".
    const existingRole = existing.roleId ? await Role.findById(existing.roleId) : null;
    if (existingRole && (STAFF_ROLE_NAMES as readonly string[]).includes(existingRole.name)) {
      res.status(400).json({ error: "This email is already a team member." });
      return;
    }
    existing.roleId = roleDoc._id;
    if (typeof name === "string" && name.trim()) existing.name = name.trim();
    await existing.save();
    user = existing;
  } else {
    let firebaseUid: string;
    try {
      const created = await firebaseAuth.createUser({
        email: trimmedEmail,
        password: crypto.randomBytes(18).toString("base64url"),
        displayName: typeof name === "string" && name.trim() ? name.trim() : undefined,
      });
      firebaseUid = created.uid;
    } catch (err) {
      res.status(400).json({ error: friendlyFirebaseError(err, "Failed to create team member account") });
      return;
    }

    user = await User.create({
      firebaseUid,
      email: trimmedEmail,
      name: typeof name === "string" && name.trim() ? name.trim() : undefined,
      provider: "password",
      roleId: roleDoc._id,
      tags: [],
    });
  }

  try {
    const [resetLink, settings] = await Promise.all([
      firebaseAuth.generatePasswordResetLink(user.email),
      getOrCreateSettings(),
    ]);
    await sendEmail({
      to: user.email,
      subject: `You've been added to the ${settings.shopName} team`,
      text: `Hi ${user.name || "there"}, you've been given ${role} access to the ${settings.shopName} admin panel. Set your password to sign in: ${resetLink}`,
      html: teamInviteTemplate(user.name, settings.shopName, role, resetLink),
    });
  } catch (err) {
    console.error("Team invite email failed:", err);
  }

  res.status(201).json({ ...user.toObject(), role });
});

// Firebase password-reset/invite links expire — this regenerates and re-sends one for an
// existing team member without touching their account or role, for when the original link
// expired before they used it.
teamRouter.post("/:id/resend-invite", async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    res.status(400).json({ error: "Invalid user id" });
    return;
  }
  const user = await User.findById(req.params.id);
  if (!user) {
    res.status(404).json({ error: "Team member not found" });
    return;
  }
  const role = user.roleId ? await Role.findById(user.roleId) : null;
  if (!role || !(STAFF_ROLE_NAMES as readonly string[]).includes(role.name)) {
    res.status(400).json({ error: "This user isn't a team member." });
    return;
  }

  try {
    const [resetLink, settings] = await Promise.all([
      firebaseAuth.generatePasswordResetLink(user.email),
      getOrCreateSettings(),
    ]);
    await sendEmail({
      to: user.email,
      subject: `You've been added to the ${settings.shopName} team`,
      text: `Hi ${user.name || "there"}, you've been given ${role.name} access to the ${settings.shopName} admin panel. Set your password to sign in: ${resetLink}`,
      html: teamInviteTemplate(user.name, settings.shopName, role.name, resetLink),
    });
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : "Failed to resend invite" });
    return;
  }

  res.json({ success: true });
});

teamRouter.patch("/:id", async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    res.status(400).json({ error: "Invalid user id" });
    return;
  }
  const user = await User.findById(req.params.id);
  if (!user) {
    res.status(404).json({ error: "Team member not found" });
    return;
  }

  const { name, role } = req.body ?? {};

  if (role !== undefined) {
    if (!isStaffRoleName(role)) {
      res.status(400).json({ error: `Role must be one of: ${STAFF_ROLE_NAMES.join(", ")}` });
      return;
    }
    const currentRole = user.roleId ? await Role.findById(user.roleId) : null;
    if (currentRole?.name === "super_admin" && role !== "super_admin") {
      const remainingSuperAdmins = await countSuperAdmins(user._id);
      if (remainingSuperAdmins === 0) {
        res.status(400).json({ error: "Can't remove the last super_admin — promote someone else first." });
        return;
      }
    }
    const roleDoc = await Role.findOne({ name: role });
    if (!roleDoc) {
      res.status(500).json({ error: `Role "${role}" is not seeded — run the seed-roles script.` });
      return;
    }
    user.roleId = roleDoc._id;
  }

  if (typeof name === "string") {
    user.name = name.trim() || undefined;
  }

  await user.save();
  res.json(user);
});

// Counts super_admins other than `excludeUserId` — used to block the last super_admin from
// being demoted or removed, which would lock everyone out of Settings & Team.
async function countSuperAdmins(excludeUserId: mongoose.Types.ObjectId): Promise<number> {
  const superAdminRole = await Role.findOne({ name: "super_admin" });
  if (!superAdminRole) return 0;
  return User.countDocuments({ roleId: superAdminRole._id, _id: { $ne: excludeUserId } });
}

// Revokes admin-panel access by demoting the account back to the default "user" role, rather
// than deleting it outright — reversible, and the person may still have a legitimate customer
// account under the same login.
teamRouter.delete("/:id", async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    res.status(400).json({ error: "Invalid user id" });
    return;
  }
  const user = await User.findById(req.params.id);
  if (!user) {
    res.status(404).json({ error: "Team member not found" });
    return;
  }

  const currentRole = user.roleId ? await Role.findById(user.roleId) : null;
  if (currentRole?.name === "super_admin") {
    const remainingSuperAdmins = await countSuperAdmins(user._id);
    if (remainingSuperAdmins === 0) {
      res.status(400).json({ error: "Can't remove the last super_admin — promote someone else first." });
      return;
    }
  }

  const userRole = await Role.findOne({ name: "user" });
  user.roleId = userRole?._id;
  await user.save();
  res.status(204).send();
});
