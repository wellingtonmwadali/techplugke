import type { NextFunction, Request, Response } from "express";
import { User } from "../models/User.js";
import { STAFF_ROLE_NAMES } from "../models/Role.js";
import { resolveStaffUser } from "./resolveStaffUser.js";

declare global {
  namespace Express {
    interface Request {
      adminUser?: InstanceType<typeof User>;
    }
  }
}

// Gates general admin-panel routes (products, orders, categories, marketing, customers) to any
// staff role — editor/admin/super_admin. Settings & Team management are stricter and use
// requireSuperAdmin instead (see requireSuperAdmin.ts).
export async function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.firebaseUser) {
    res.status(401).json({ error: "Missing or malformed Authorization header" });
    return;
  }

  const resolved = await resolveStaffUser(req.firebaseUser.uid);
  if (!resolved || !resolved.roleName || !(STAFF_ROLE_NAMES as readonly string[]).includes(resolved.roleName)) {
    res.status(403).json({ error: "Admin access required" });
    return;
  }

  req.adminUser = User.hydrate(resolved.user);
  next();
}
