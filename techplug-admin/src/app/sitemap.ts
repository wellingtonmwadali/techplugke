import type { MetadataRoute } from "next";
import { getProducts } from "@/lib/products";
import { getCategories } from "@/lib/categories";
import { categories as staticCategories } from "@/lib/data";
import { SITE_URL } from "@/lib/siteUrl";

// Dynamically includes every product and category slug (static + backend-managed) — Google's
// primary discovery path for the catalog, since nothing else links every product from one place.
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [products, dynamicCategories] = await Promise.all([getProducts({}), getCategories()]);

  const categorySlugs = Array.from(
    new Set([...staticCategories.map((c) => c.slug), ...dynamicCategories.map((c) => c.slug)])
  );

  return [
    { url: SITE_URL, changeFrequency: "daily", priority: 1 },
    ...categorySlugs.map(
      (slug): MetadataRoute.Sitemap[number] => ({
        url: `${SITE_URL}/category/${slug}`,
        changeFrequency: "daily",
        priority: 0.7,
      })
    ),
    ...products.map(
      (p): MetadataRoute.Sitemap[number] => ({
        url: `${SITE_URL}/product/${p.slug}`,
        changeFrequency: "weekly",
        priority: 0.8,
      })
    ),
  ];
}
