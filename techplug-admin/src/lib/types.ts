export type Category = {
  id: string;
  name: string;
  slug: string;
  parentSlug?: string;
  image: string;
};

export type ImageBackground = "transparent" | "studio" | "lifestyle";

// A spec dimension the shopper can toggle, e.g. { name: "RAM", values: ["8GB", "16GB"] }.
// Doesn't carry price — ProductVariant is what maps one combination of these values to a price.
export type ProductVariantOption = {
  name: string;
  values: string[];
};

// One priced combination of variant-option values, e.g. { RAM: "16GB", Storage: "512GB" } at
// 48000. Not every combination of every option's values needs to exist here — see
// src/lib/variants.ts `availableValuesFor` for how the UI hides combinations with no variant.
export type ProductVariant = {
  options: Record<string, string>;
  price: number;
  compareAtPrice?: number;
};

export type Product = {
  id: string;
  name: string;
  slug: string;
  brand?: string;
  // Base/list price. When `variants` is non-empty, the backend keeps this equal to the
  // cheapest variant's price (see techplug-api/src/routes/products.ts), so anything that
  // just reads `price` — cards, price sort/filter — never needs to know variants exist.
  price: number;
  compareAtPrice?: number;
  categorySlugs: string[];
  images: string[];
  // Parallel to `images` (same index). images[0] is always the cover/primary image — order
  // carries that meaning, there's no separate flag for it.
  imageBackgrounds?: ImageBackground[];
  colors: string[];
  variantOptions?: ProductVariantOption[];
  variants?: ProductVariant[];
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
  // Which variant was selected, if the product has priced variants — undefined otherwise.
  variantOptions?: Record<string, string>;
  quantity: number;
};
