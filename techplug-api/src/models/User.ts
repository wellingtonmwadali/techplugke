import { Schema, model, type Types } from "mongoose";

export type AuthProvider = "password" | "google";

export interface UserDocument {
  firebaseUid: string;
  email: string;
  name?: string;
  phone?: string;
  photoURL?: string;
  provider: AuthProvider;
  roleId?: Types.ObjectId;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<UserDocument>(
  {
    firebaseUid: { type: String, required: true, unique: true, index: true },
    email: { type: String, required: true },
    name: { type: String },
    phone: { type: String },
    photoURL: { type: String },
    provider: { type: String, enum: ["password", "google"], required: true },
    roleId: { type: Schema.Types.ObjectId, ref: "Role" },
    tags: { type: [String], default: [] },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

// The admin customer list (routes/users.ts) sorts by createdAt on every request.
userSchema.index({ createdAt: -1 });

export const User = model<UserDocument>("User", userSchema);
