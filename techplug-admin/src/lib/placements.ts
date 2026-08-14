import { apiFetch } from "./api";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

// Where a product can be surfaced on the storefront homepage (e.g. "Top Deals") — admin-managed
// under /ad-techplugke/categories' Placements tab, rather than a fixed hardcoded list.
export type PlacementItem = {
  id: string;
  name: string;
  slug: string;
  sortOrder: number;
};

// Public — used by both the storefront homepage (server-rendered) and the admin panel.
export async function getPlacements(): Promise<PlacementItem[]> {
  const res = await fetch(`${API_URL}/api/placements`, { next: { revalidate: 60 } });
  if (!res.ok) return [];
  return res.json();
}

export function createPlacement(name: string): Promise<PlacementItem> {
  return apiFetch<PlacementItem>("/api/placements", { method: "POST", body: JSON.stringify({ name }) });
}

export function updatePlacement(id: string, name: string): Promise<PlacementItem> {
  return apiFetch<PlacementItem>(`/api/placements/${id}`, { method: "PUT", body: JSON.stringify({ name }) });
}

export function deletePlacement(id: string): Promise<void> {
  return apiFetch<void>(`/api/placements/${id}`, { method: "DELETE" });
}
