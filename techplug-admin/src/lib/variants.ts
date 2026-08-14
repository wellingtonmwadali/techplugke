import type { Product, ProductVariant } from "./types";

// True only when `options` names/values exactly match a variant's — a partial selection (e.g.
// only RAM chosen, Storage not yet picked) never matches, so callers can tell "no variant
// selected yet" apart from "selected a combination with no price."
export function findVariant(
  product: Product,
  options: Record<string, string> | undefined
): ProductVariant | undefined {
  if (!product.variants || product.variants.length === 0 || !options) return undefined;
  const keys = Object.keys(options);
  return product.variants.find((v) => {
    const variantKeys = Object.keys(v.options);
    return (
      variantKeys.length === keys.length && variantKeys.every((k) => v.options[k] === options[k])
    );
  });
}

export function resolvePrice(product: Product, options?: Record<string, string>): number {
  return findVariant(product, options)?.price ?? product.price;
}

export function resolveCompareAtPrice(product: Product, options?: Record<string, string>): number | undefined {
  const variant = findVariant(product, options);
  return variant ? variant.compareAtPrice : product.compareAtPrice;
}

// The variant with the lowest price — used to default the buy box's selection and for
// "quick add" on product cards, where there's no chance to ask the shopper to choose first.
export function cheapestVariant(product: Product): ProductVariant | undefined {
  if (!product.variants || product.variants.length === 0) return undefined;
  return product.variants.reduce((min, v) => (v.price < min.price ? v : min), product.variants[0]);
}

// Which values are still choosable for `optionName` given what's already selected for the
// *other* dimensions — e.g. if RAM=8GB only ever ships with Storage=256GB, selecting RAM=8GB
// should narrow the Storage picker down to just "256GB" rather than offering a combination
// that has no variant (and therefore no price) behind it.
export function availableValuesFor(
  product: Product,
  optionName: string,
  selected: Record<string, string>
): string[] {
  if (!product.variants) return [];
  const otherEntries = Object.entries(selected).filter(([key]) => key !== optionName);
  const matching = product.variants.filter((v) =>
    otherEntries.every(([key, value]) => v.options[key] === value)
  );
  return Array.from(new Set(matching.map((v) => v.options[optionName]).filter((v): v is string => Boolean(v))));
}

// Two variant selections are the same cart line only if they pick identical values for every
// dimension — used for cart-line matching/keying instead of a raw object/JSON compare so
// key order never matters.
export function sameVariantOptions(
  a: Record<string, string> | undefined,
  b: Record<string, string> | undefined
): boolean {
  if (!a && !b) return true;
  if (!a || !b) return false;
  const aKeys = Object.keys(a);
  const bKeys = Object.keys(b);
  if (aKeys.length !== bKeys.length) return false;
  return aKeys.every((key) => a[key] === b[key]);
}

// Stable, human-readable label for a variant selection, e.g. "RAM: 16GB, Storage: 512GB" — used
// wherever a cart line/order item needs to show what was picked.
export function describeVariantOptions(options: Record<string, string> | undefined): string {
  if (!options) return "";
  return Object.entries(options)
    .map(([name, value]) => `${name}: ${value}`)
    .join(", ");
}
