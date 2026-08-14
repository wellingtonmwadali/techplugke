import { Router } from "express";
import { authenticate } from "../middleware/authenticate.js";
import { User, type AuthProvider } from "../models/User.js";
import { Role } from "../models/Role.js";
import { getOrCreateSettings } from "../models/Settings.js";
import { sendEmail } from "../utils/mailer.js";
import { welcomeTemplate } from "../services/emailTemplates.js";
import { config } from "../config/env.js";

export const authRouter = Router();

function resolveProvider(signInProvider: string | undefined): AuthProvider {
  return signInProvider === "google.com" ? "google" : "password";
}

async function withRole(user: InstanceType<typeof User>) {
  const role = user.roleId ? await Role.findById(user.roleId) : null;
  return { ...user.toObject(), role: role?.name ?? "user" };
}

authRouter.post("/sync", authenticate, async (req, res) => {
  const claims = req.firebaseUser!;
  const provider = resolveProvider(claims.firebase?.sign_in_provider);

  const profile = {
    firebaseUid: claims.uid,
    email: claims.email ?? "",
    name: claims.name,
    photoURL: claims.picture,
    provider,
  };

  let user = await User.findOne({ firebaseUid: claims.uid });
  let isNewUser = false;
  if (!user) {
    try {
      const defaultRole = await Role.findOne({ name: "user" });
      user = await User.create({ ...profile, roleId: defaultRole?._id });
      isNewUser = true;
    } catch (err) {
      // Two concurrent first-sign-in syncs can both pass the findOne check above before
      // either insert completes — the loser hits the unique firebaseUid index instead of
      // a clean "not found". Treat that as a normal "someone else just created it" case.
      if (err instanceof Error && "code" in err && (err as { code?: number }).code === 11000) {
        user = await User.findOne({ firebaseUid: claims.uid });
      } else {
        throw err;
      }
    }
  } else {
    user.set(profile);
    await user.save();
  }

  if (!user) {
    res.status(500).json({ error: "Failed to sync user" });
    return;
  }

  res.json(await withRole(user));

  // Best-effort, after the response — same pattern used elsewhere (routes/orders.ts) so a
  // mailer failure can never affect the response already sent above. Covers every real
  // self-serve signup path (email/password AND Google), unlike the admin-manual-creation
  // welcome email in routes/users.ts, which only fires for accounts an admin creates by hand.
  if (isNewUser && user.email) {
    try {
      const settings = await getOrCreateSettings();
      await sendEmail({
        to: user.email,
        subject: `Welcome to ${settings.shopName}`,
        text: `Hi ${user.name || "there"}, welcome to ${settings.shopName}! Explore our latest collection: ${config.storefrontUrl}`,
        html: welcomeTemplate(user.name, settings.shopName),
      });
    } catch (err) {
      console.error("Welcome email failed:", err);
    }
  }
});

authRouter.get("/me", authenticate, async (req, res) => {
  const user = await User.findOne({ firebaseUid: req.firebaseUser!.uid });
  if (!user) {
    res.status(404).json({ error: "User not synced yet" });
    return;
  }
  res.json(await withRole(user));
});
