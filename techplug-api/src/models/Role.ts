import { Schema, model } from "mongoose";

export const ROLE_NAMES = ["user", "editor", "admin", "super_admin"] as const;
export type RoleName = (typeof ROLE_NAMES)[number];

// Roles an account can be granted admin-panel access under (excludes "user", the default
// customer role) — order here doubles as display order in the team-member role picker.
export const STAFF_ROLE_NAMES = ["editor", "admin", "super_admin"] as const;
export type StaffRoleName = (typeof STAFF_ROLE_NAMES)[number];

export interface RoleDocument {
  name: RoleName;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

const roleSchema = new Schema<RoleDocument>(
  {
    name: { type: String, required: true, unique: true, enum: ROLE_NAMES, index: true },
    description: { type: String },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

export const Role = model<RoleDocument>("Role", roleSchema);
