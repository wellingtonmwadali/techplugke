import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Breadcrumbs from "@/components/Breadcrumbs";
import CategoryProductGrid from "@/components/CategoryProductGrid";
import { categories, navCategories } from "@/lib/data";
import { getCategories, resolveCategory } from "@/lib/categories";
import { getProducts } from "@/lib/products";
import { SITE_URL } from "@/lib/siteUrl";

const titleOverrides: Record<string, string> = {
  sale: "Sale",
  new: "What's New",
};

async function categoryLabel(slug: string): Promise<string | undefined> {
  if (titleOverrides[slug]) return titleOverrides[slug];
  const fromCategories = categories.find((c) => c.slug === slug)?.name;
  if (fromCategories) return fromCategories;
  for (const item of navCategories) {
    if (item.slug === slug) return item.name;
    const child = item.children?.find((c) => c.slug === slug);
    if (child) return child.name;
  }
  // Falls back to the backend-managed category list — covers categories an admin created
  // through /ad-techplugke/categories that aren't in the curated static nav/homepage arrays.
  return (await resolveCategory(slug))?.name;
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const label = await categoryLabel(slug);
  if (!label) return {};

  const title = `Shop ${label}`;
  const description = `Shop ${label} at TechPlug Kenya — genuine electronics and accessories with countrywide delivery.`;
  const url = `${SITE_URL}/category/${slug}`;

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { type: "website", title, description, url },
    twitter: { card: "summary", title, description },
  };
}

export default async function CategoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const label = await categoryLabel(slug);
  if (!label) notFound();

  const [items, allCategories] = await Promise.all([
    getProducts({ category: slug }),
    getCategories(),
  ]);
  const subcategories = allCategories.filter((c) => c.parentSlug === slug);

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
      { "@type": "ListItem", position: 2, name: label, item: `${SITE_URL}/category/${slug}` },
    ],
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />

      <Breadcrumbs items={[{ label }]} />
      <h1 className="font-bold tracking-tight text-3xl">{label}</h1>

      {items.length === 0 ? (
        <div className="mt-16 text-center">
          <p className="font-bold tracking-tight text-xl">Nothing here yet</p>
          <p className="mt-2 text-sm text-ink/60">New stock is on the way — check back soon.</p>
        </div>
      ) : (
        <div className="mt-6">
          <CategoryProductGrid items={items} subcategories={subcategories} />
        </div>
      )}
    </div>
  );
}
