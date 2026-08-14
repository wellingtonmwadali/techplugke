import { apiFetch } from "./api";

export type StaffRole = "editor" | "admin" | "super_admin";

export const STAFF_ROLES: StaffRole[] = ["editor", "admin", "super_admin"];

export type TeamMember = {
  _id: string;
  name?: string;
  email: string;
  role: StaffRole;
  createdAt: string;
};

export function getTeam(): Promise<TeamMember[]> {
  return apiFetch<TeamMember[]>("/api/team");
}

export function addTeamMember(input: { name: string; email: string; role: StaffRole }): Promise<TeamMember> {
  return apiFetch<TeamMember>("/api/team", { method: "POST", body: JSON.stringify(input) });
}

export function updateTeamMemberRole(id: string, role: StaffRole): Promise<TeamMember> {
  return apiFetch<TeamMember>(`/api/team/${id}`, { method: "PATCH", body: JSON.stringify({ role }) });
}

export function removeTeamMember(id: string): Promise<void> {
  return apiFetch<void>(`/api/team/${id}`, { method: "DELETE" });
}

// Regenerates and re-sends the set-password link — for when the original invite link expired
// before the team member used it.
export function resendTeamInvite(id: string): Promise<void> {
  return apiFetch<void>(`/api/team/${id}/resend-invite`, { method: "POST" });
}
