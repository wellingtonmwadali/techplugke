import type { Metadata } from "next";
import Link from "next/link";
import Breadcrumbs from "@/components/Breadcrumbs";
import CategoryProductGrid from "@/components/CategoryProductGrid";
import { categories } from "@/lib/data";
import { getProducts } from "@/lib/products";

// Query-string search results are thin/duplicate content with no link equity to pass — kept out
// of the index entirely rather than given a canonical (there's no single canonical URL for
// arbitrary search terms).
export const metadata: Metadata = {
  robots: { index: false, follow: true },
};

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const query = q?.trim() ?? "";
  const items = query ? await getProducts({ search: query }) : [];

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <Breadcrumbs items={[{ label: "Search results" }]} />
      <h1 className="font-bold tracking-tight text-3xl">
        {query ? <>Results for &ldquo;{query}&rdquo;</> : "Search"}
      </h1>

      {!query ? (
        <p className="mt-4 text-sm text-ink/60">Enter a search term to find products.</p>
      ) : items.length === 0 ? (
        <div className="mt-16 text-center">
          <p className="font-bold tracking-tight text-xl">No results for &ldquo;{query}&rdquo;</p>
          <p className="mt-2 text-sm text-ink/60">Try a different search, or browse a category:</p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            {categories.map((c) => (
              <Link
                key={c.slug}
                href={`/category/${c.slug}`}
                className="rounded-full border hairline px-4 py-2 text-sm font-medium hover:border-ink transition-colors"
              >
                {c.name}
              </Link>
            ))}
          </div>
        </div>
      ) : (
        <div className="mt-6">
          <CategoryProductGrid items={items} />
        </div>
      )}
    </div>
  );
}
