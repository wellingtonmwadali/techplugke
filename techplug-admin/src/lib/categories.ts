import { Category } from "./types";
import { getCategoryBySlug } from "./data";
import { apiFetch } from "./api";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

// Backend-managed categories (created/edited via /ad-techplugke/categories) — the single source
// of truth for the homepage "Shop By Category" rail. The static `categories`/`navCategories`/
// `sidebarCategories` arrays in ./data.ts are still used for header/nav taxonomy and remain
// hand-curated for now (see CLAUDE.md placeholder notes).
export async function getCategories(): Promise<Category[]> {
  const res = await fetch(`${API_URL}/api/categories`, { cache: "no-store" });
  if (!res.ok) return [];
  return res.json();
}

export async function createCategory(input: {
  name: string;
  slug?: string;
  image: string;
  parentSlug?: string;
}): Promise<Category> {
  return apiFetch<Category>("/api/categories", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function updateCategory(
  id: string,
  input: Partial<{ name: string; slug: string; image: string; parentSlug: string | null }>
): Promise<Category> {
  return apiFetch<Category>(`/api/categories/${id}`, {
    method: "PUT",
    body: JSON.stringify(input),
  });
}

export async function deleteCategory(id: string): Promise<void> {
  await apiFetch<void>(`/api/categories/${id}`, { method: "DELETE" });
}

// Resolves a category slug for pages that need a label: checks the static curated data first
// (fast, no network), then falls back to the backend-managed list — so a category an admin
// just created through /ad-techplugke/categories resolves even though it isn't in the static
// nav/homepage arrays.
export async function resolveCategory(slug: string): Promise<Category | undefined> {
  const fromStatic = getCategoryBySlug(slug);
  if (fromStatic) return fromStatic;
  const dynamic = await getCategories();
  return dynamic.find((c) => c.slug === slug);
}
