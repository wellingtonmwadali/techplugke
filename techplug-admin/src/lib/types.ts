export type Category = {
  id: string;
  name: string;
  slug: string;
  parentSlug?: string;
  image: string;
};

export type ImageBackground = "transparent" | "studio" | "lifestyle";

export type Product = {
  id: string;
  name: string;
  slug: string;
  brand?: string;
  price: number;
  compareAtPrice?: number;
  categorySlugs: string[];
  images: string[];
  // Parallel to `images` (same index). images[0] is always the cover/primary image — order
  // carries that meaning, there's no separate flag for it.
  imageBackgrounds?: ImageBackground[];
  colors: string[];
  specs?: string;
  warranty?: string;
  description?: string;
  stockQuantity: number;
  inStock: boolean;
  badges?: string[];
  placements?: string[];
};

export type CartLine = {
  productId: string;
  color: string;
  quantity: number;
};
