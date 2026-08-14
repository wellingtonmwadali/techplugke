import HeroBento from "@/components/HeroBento";
import CategoryCard from "@/components/CategoryCard";
import ProductCard from "@/components/ProductCard";
import { getCategories } from "@/lib/categories";
import { getPlacements } from "@/lib/placements";
import { getProducts } from "@/lib/products";

export default async function Home() {
  // Backend-managed categories and placements (both created/edited under /ad-techplugke/categories)
  // — the homepage used to hardcode both lists, so anything an admin added there never showed up.
  const [placements, homeCategories] = await Promise.all([getPlacements(), getCategories()]);

  const sections = await Promise.all(
    placements.map(async (placement) => ({
      title: placement.name,
      products: await getProducts({ placement: placement.slug }),
    }))
  );

  const heroPool = sections.map((s) => s.products).find((list) => list.length > 0);
  const heroProduct = heroPool?.[0];
  const newArrival = heroPool?.find((p) => p.id !== heroProduct?.id) ?? null;
  const moreProducts = (heroPool ?? []).filter(
    (p) => p.id !== heroProduct?.id && p.id !== newArrival?.id
  );
  // "Shop By Category" is top-level categories only — subcategories (e.g. "Dell" under
  // "Laptops & Computers") browse via their parent, not as their own tile on the homepage.
  const topLevelCategories = homeCategories.filter((c) => !c.parentSlug);
  const featuredCategory = topLevelCategories[0];

  return (
    <>
      {/* Page-level h1, independent of whether a hero product exists — HeroBento's product
          name renders as an h2 (see HeroBento.tsx) so there's exactly one h1 either way. */}
      <h1 className="sr-only">TechPlug Kenya — Phones, laptops, TVs &amp; electronics, delivered countrywide</h1>

      {heroProduct && featuredCategory && (
        <HeroBento
          heroProduct={heroProduct}
          newArrival={newArrival}
          moreProducts={moreProducts}
          featuredCategorySlug={featuredCategory.slug}
          featuredCategoryName={featuredCategory.name}
        />
      )}

      {topLevelCategories.length > 0 && (
        <section id="shop-by-category" className="bg-cream py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <h2 className="text-center font-bold tracking-tight text-3xl text-ink sm:text-4xl">
              Shop By Category
            </h2>
            <div className="mt-12 grid grid-cols-2 gap-x-6 gap-y-10 sm:grid-cols-3 lg:grid-cols-6">
              {topLevelCategories.map((category) => (
                <CategoryCard key={category.id} category={category} />
              ))}
            </div>
          </div>
        </section>
      )}

      {sections.map(
        (section) =>
          section.products.length > 0 && (
            <section key={section.title} className="py-20">
              <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                <div className="flex items-end justify-between">
                  <h2 className="font-bold tracking-tight text-3xl sm:text-4xl">{section.title}</h2>
                </div>
                <div className="mt-10 grid grid-cols-2 gap-x-5 gap-y-10 sm:grid-cols-3 lg:grid-cols-6">
                  {section.products.map((product) => (
                    <ProductCard key={product.id} product={product} />
                  ))}
                </div>
              </div>
            </section>
          )
      )}
    </>
  );
}
