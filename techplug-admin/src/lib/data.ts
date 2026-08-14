import { Category } from "./types";

// NOTE: Category/nav taxonomy is static frontend data. Product data has moved to MongoDB
// (managed via the /ad-techplugke admin panel) — see src/lib/products.ts for fetch helpers.

export const categories: Category[] = [
  { id: "c1", name: "Phones & Tablets", slug: "phones-tablets", image: "https://picsum.photos/seed/phones-tablets/600/750" },
  { id: "c2", name: "Laptops & Computers", slug: "laptops-computers", image: "https://picsum.photos/seed/laptops-computers/600/750" },
  { id: "c3", name: "TV & Home Entertainment", slug: "tv-home-entertainment", image: "https://picsum.photos/seed/tv-home-entertainment/600/750" },
  { id: "c4", name: "Audio", slug: "audio", image: "https://picsum.photos/seed/audio/600/750" },
  { id: "c5", name: "Gaming", slug: "gaming", image: "https://picsum.photos/seed/gaming/600/750" },
  { id: "c6", name: "Accessories", slug: "accessories", image: "https://picsum.photos/seed/accessories/600/750" },
];

// Real electronics photography (Unsplash) used for the homepage hero slider.
// `categories` above still uses picsum placeholders for the rest of the catalog.
function productPhoto(id: string, w: number, h: number) {
  return `https://images.unsplash.com/photo-${id}?w=${w}&h=${h}&fit=crop&auto=format&q=80`;
}

export const heroSlides = [
  {
    id: "h1",
    image: productPhoto("1550009158-9ebf69173e03", 1600, 900),
    eyebrow: "New season",
    headline: "The latest tech, honestly priced",
    cta: "Shop new arrivals",
    href: "/category/new",
  },
  {
    id: "h2",
    image: productPhoto("1511707171634-5f897ff02aa9", 1600, 900),
    eyebrow: "Just dropped",
    headline: "Phones that keep up with you",
    cta: "Shop phones",
    href: "/category/phones-tablets",
  },
  {
    id: "h3",
    image: productPhoto("1496181133206-80ce9b88a853", 1600, 900),
    eyebrow: "Trending now",
    headline: "Laptops built for work and play",
    cta: "Shop laptops",
    href: "/category/laptops-computers",
  },
  {
    id: "h4",
    image: productPhoto("1593305841991-05c297ba4575", 1600, 900),
    eyebrow: "Home entertainment",
    headline: "Bigger screens, better nights in",
    cta: "Shop TVs",
    href: "/category/tv-home-entertainment",
  },
  {
    id: "h5",
    image: productPhoto("1545127398-14699f92334b", 1600, 900),
    eyebrow: "Sound that moves you",
    headline: "Audio gear for every setup",
    cta: "Shop audio",
    href: "/category/audio",
  },
  {
    id: "h6",
    image: productPhoto("1519669417670-68775a50919f", 1600, 900),
    eyebrow: "Level up",
    headline: "Gear built for serious gaming",
    cta: "Shop gaming",
    href: "/category/gaming",
  },
  {
    id: "h7",
    image: productPhoto("1512499617640-c74ae3a79d37", 1600, 900),
    eyebrow: "Cash on delivery",
    headline: "Try it out before you pay",
    cta: "Start shopping",
    href: "/category/phones-tablets",
  },
];

// Electronics-only categories for the homepage sidebar rail.
export const sidebarCategories = [
  { name: "Phones & Tablets", slug: "phones-tablets", icon: "Smartphone" as const },
  { name: "Laptops & Computers", slug: "laptops-computers", icon: "Laptop" as const },
  { name: "TV & Home Entertainment", slug: "tv-home-entertainment", icon: "Tv" as const },
  { name: "Audio", slug: "audio", icon: "Headphones" as const },
  { name: "Gaming", slug: "gaming", icon: "Gamepad2" as const },
  { name: "Cameras", slug: "cameras", icon: "Camera" as const },
  { name: "Smart Home", slug: "smart-home", icon: "Home" as const },
  { name: "Wearables", slug: "wearables", icon: "Watch" as const },
  { name: "Accessories", slug: "accessories", icon: "Cable" as const },
  { name: "Home Appliances", slug: "home-appliances", icon: "Refrigerator" as const },
  { name: "New Arrivals", slug: "new", icon: "Sparkle" as const },
  { name: "Sale", slug: "sale", icon: "Tag" as const },
];

export const navCategories = [
  { name: "What's New", slug: "new" },
  {
    name: "Phones & Computing",
    slug: "phones-computing",
    children: [
      { name: "Phones & Tablets", slug: "phones-tablets" },
      { name: "Laptops & Computers", slug: "laptops-computers" },
      { name: "Gaming", slug: "gaming" },
    ],
  },
  {
    name: "Home & Entertainment",
    slug: "home-entertainment",
    children: [
      { name: "TVs", slug: "tv-home-entertainment" },
      { name: "Audio", slug: "audio" },
      { name: "Smart Home", slug: "smart-home" },
    ],
  },
  { name: "Accessories", slug: "accessories" },
  { name: "Bulk Orders", slug: "bulk-orders" },
  { name: "Sale", slug: "sale" },
];

export function getCategoryBySlug(slug: string): Category | undefined {
  return categories.find((c) => c.slug === slug);
}
