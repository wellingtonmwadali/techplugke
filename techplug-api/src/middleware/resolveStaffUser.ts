import { User, type UserDocument } from "../models/User.js";
import type { RoleName } from "../models/Role.js";

// A single aggregation ($lookup) instead of the previous User.findOne() + Role.findById()
// pair — this runs on every admin-gated request (nearly the whole admin panel), so folding it
// into one round trip to Mongo matters more than the two indexed lookups' individual cost.
export async function resolveStaffUser(
  firebaseUid: string
): Promise<{ user: UserDocument & { _id: unknown }; roleName: RoleName | undefined } | null> {
  const [doc] = await User.aggregate([
    { $match: { firebaseUid } },
    { $lookup: { from: "roles", localField: "roleId", foreignField: "_id", as: "role" } },
    { $unwind: { path: "$role", preserveNullAndEmptyArrays: true } },
    { $limit: 1 },
  ]);

  if (!doc) return null;
  return { user: doc, roleName: doc.role?.name };
}
