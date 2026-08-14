import type { NextFunction, Request, Response } from "express";
import { User } from "../models/User.js";
import { resolveStaffUser } from "./resolveStaffUser.js";

// Stricter than requireAdmin — only super_admin, for Settings and Team management (the two
// areas editors/admins shouldn't reach; see requireAdmin.ts for the general staff gate).
export async function requireSuperAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.firebaseUser) {
    res.status(401).json({ error: "Missing or malformed Authorization header" });
    return;
  }

  const resolved = await resolveStaffUser(req.firebaseUser.uid);
  if (!resolved || resolved.roleName !== "super_admin") {
    res.status(403).json({ error: "Super admin access required" });
    return;
  }

  req.adminUser = User.hydrate(resolved.user);
  next();
}
