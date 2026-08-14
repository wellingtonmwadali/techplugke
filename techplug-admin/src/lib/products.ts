import { Product } from "./types";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

type GetProductsParams = {
  category?: string;
  placement?: string;
  ids?: string[];
  search?: string;
};

export async function getProducts(params: GetProductsParams = {}): Promise<Product[]> {
  // Cart/wishlist lookups pass ids in bulk — a GET query string doesn't bound well as the
  // list grows, so those go through a POST body instead of joining ids into the URL.
  if (params.ids && params.ids.length > 0) {
    const res = await fetch(`${API_URL}/api/products/batch`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: params.ids }),
      cache: "no-store",
    });
    if (!res.ok) return [];
    return res.json();
  }

  const search = new URLSearchParams();
  if (params.category) search.set("category", params.category);
  if (params.placement) search.set("placement", params.placement);
  if (params.search) search.set("search", params.search);

  // Public catalog browsing (category/placement/search) — doesn't need per-request freshness,
  // so a short revalidate window cuts repeat API/DB load instead of hitting the API on every
  // single visitor. Cart/wishlist lookups above stay no-store since they need current
  // price/stock.
  const res = await fetch(`${API_URL}/api/products?${search.toString()}`, { next: { revalidate: 60 } });
  if (!res.ok) return [];
  return res.json();
}

// Used by the admin edit-product page, which needs the current saved state every time it's
// opened — kept no-store rather than the revalidate window used for public catalog reads below.
export async function getProductById(id: string): Promise<Product | null> {
  const res = await fetch(`${API_URL}/api/products/${id}`, { cache: "no-store" });
  if (!res.ok) return null;
  return res.json();
}

export async function getProductBySlugRemote(slug: string): Promise<Product | null> {
  const res = await fetch(`${API_URL}/api/products?slug=${encodeURIComponent(slug)}`, {
    next: { revalidate: 60 },
  });
  if (!res.ok) return null;
  return res.json();
}
