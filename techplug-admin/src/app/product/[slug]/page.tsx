import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getProductBySlugRemote, getProducts } from "@/lib/products";
import { resolveCategory } from "@/lib/categories";
import { SITE_URL } from "@/lib/siteUrl";
import Breadcrumbs from "@/components/Breadcrumbs";
import ProductGallery from "@/components/ProductGallery";
import ProductBuyBox from "@/components/ProductBuyBox";
import ProductCard from "@/components/ProductCard";

function productDescription(product: { name: string; brand?: string; description?: string; price: number }): string {
  if (product.description) return product.description.slice(0, 155);
  const brand = product.brand ? `${product.brand} ` : "";
  return `Shop the ${brand}${product.name} at TechPlug Kenya — Ksh ${product.price.toLocaleString()}. Countrywide delivery, pay via M-Pesa.`;
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlugRemote(slug);
  if (!product) return {};

  const title = product.brand ? `${product.name} by ${product.brand}` : product.name;
  const description = productDescription(product);
  const url = `${SITE_URL}/product/${product.slug}`;
  const image = product.images[0];

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      type: "website",
      title,
      description,
      url,
      images: image ? [{ url: image, alt: product.name }] : undefined,
    },
    twitter: {
      card: image ? "summary_large_image" : "summary",
      title,
      description,
      images: image ? [image] : undefined,
    },
  };
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = await getProductBySlugRemote(slug);
  if (!product) notFound();

  const primaryCategorySlug = product.categorySlugs[0];

  // Neither fetch depends on the other's result — both only need primaryCategorySlug.
  const [relatedProducts, category] = await Promise.all([
    getProducts({ category: primaryCategorySlug }),
    primaryCategorySlug ? resolveCategory(primaryCategorySlug) : Promise.resolve(undefined),
  ]);
  const related = relatedProducts.filter((p) => p.id !== product.id).slice(0, 4);

  const url = `${SITE_URL}/product/${product.slug}`;
  const breadcrumbItems = [
    { name: "Home", url: SITE_URL },
    ...(category ? [{ name: category.name, url: `${SITE_URL}/category/${category.slug}` }] : []),
    { name: product.name, url },
  ];

  // Product + BreadcrumbList structured data — powers price/availability/rating and breadcrumb
  // rich results in Google search. See https://schema.org/Product.
  const productJsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: productDescription(product),
    image: product.images,
    brand: product.brand ? { "@type": "Brand", name: product.brand } : undefined,
    sku: product.id,
    offers: {
      "@type": "Offer",
      url,
      priceCurrency: "KES",
      price: product.price,
      availability: product.inStock ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
    },
  };

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: breadcrumbItems.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: item.url,
    })),
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />

      <Breadcrumbs
        items={[
          ...(category ? [{ label: category.name, href: `/category/${category.slug}` }] : []),
          { label: product.name },
        ]}
      />

      <div className="grid gap-10 lg:grid-cols-2">
        <ProductGallery product={product} />
        <ProductBuyBox product={product} />
      </div>

      {related.length > 0 && (
        <section className="mt-20">
          <h2 className="font-bold tracking-tight text-2xl">You may also like</h2>
          <div className="mt-8 grid grid-cols-2 gap-x-5 gap-y-10 sm:grid-cols-4">
            {related.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
