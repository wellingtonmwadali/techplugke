"use client";

import { useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";
import ProductCard from "./ProductCard";
import type { Product } from "@/lib/types";

type SortKey = "featured" | "newest" | "price-asc" | "price-desc";

const PRICE_BUCKETS = [
  { label: "Under KSh 2,000", test: (p: number) => p < 2000 },
  { label: "KSh 2,000–4,000", test: (p: number) => p >= 2000 && p < 4000 },
  { label: "KSh 4,000–6,000", test: (p: number) => p >= 4000 && p < 6000 },
  { label: "Over KSh 6,000", test: (p: number) => p >= 6000 },
];

export default function CategoryProductGrid({ items }: { items: Product[] }) {
  const [openFilter, setOpenFilter] = useState<string | null>(null);
  const [brands, setBrands] = useState<string[]>([]);
  const [colors, setColors] = useState<string[]>([]);
  const [priceBuckets, setPriceBuckets] = useState<string[]>([]);
  const [sort, setSort] = useState<SortKey>("featured");

  const brandOptions = useMemo(
    () => Array.from(new Set(items.map((p) => p.brand).filter(Boolean))).sort() as string[],
    [items]
  );
  const colorOptions = useMemo(
    () => Array.from(new Set(items.flatMap((p) => p.colors))).sort(),
    [items]
  );

  function toggle<T>(list: T[], value: T, setList: (v: T[]) => void) {
    setList(list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);
  }

  const filtered = useMemo(() => {
    const result = items.filter((p) => {
      if (brands.length > 0 && !(p.brand && brands.includes(p.brand))) return false;
      if (colors.length > 0 && !p.colors.some((c) => colors.includes(c))) return false;
      if (priceBuckets.length > 0) {
        const matches = PRICE_BUCKETS.filter((b) => priceBuckets.includes(b.label)).some((b) =>
          b.test(p.price)
        );
        if (!matches) return false;
      }
      return true;
    });

    switch (sort) {
      case "price-asc":
        return [...result].sort((a, b) => a.price - b.price);
      case "price-desc":
        return [...result].sort((a, b) => b.price - a.price);
      default:
        return result;
    }
  }, [items, brands, colors, priceBuckets, sort]);

  const hasActiveFilters = brands.length > 0 || colors.length > 0 || priceBuckets.length > 0;

  return (
    <div>
      <div className="sticky top-[88px] z-20 -mx-4 flex flex-wrap items-center gap-2 overflow-x-auto rounded-3xl bg-white px-4 py-4 shadow-soft sm:mx-0">
        {brandOptions.length > 0 && (
          <FilterDropdown
            label="Brand"
            open={openFilter === "brand"}
            onToggle={() => setOpenFilter(openFilter === "brand" ? null : "brand")}
          >
            {brandOptions.map((b) => (
              <label key={b} className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-cream cursor-pointer">
                <input
                  type="checkbox"
                  className="accent-signal"
                  checked={brands.includes(b)}
                  onChange={() => toggle(brands, b, setBrands)}
                />
                {b}
              </label>
            ))}
          </FilterDropdown>
        )}

        <FilterDropdown
          label="Price"
          open={openFilter === "price"}
          onToggle={() => setOpenFilter(openFilter === "price" ? null : "price")}
        >
          {PRICE_BUCKETS.map((b) => (
            <label key={b.label} className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-cream cursor-pointer">
              <input
                type="checkbox"
                className="accent-signal"
                checked={priceBuckets.includes(b.label)}
                onChange={() => toggle(priceBuckets, b.label, setPriceBuckets)}
              />
              {b.label}
            </label>
          ))}
        </FilterDropdown>

        {colorOptions.length > 0 && (
          <FilterDropdown
            label="Color"
            open={openFilter === "color"}
            onToggle={() => setOpenFilter(openFilter === "color" ? null : "color")}
          >
            {colorOptions.map((c) => (
              <label key={c} className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-cream cursor-pointer">
                <input
                  type="checkbox"
                  className="accent-signal"
                  checked={colors.includes(c)}
                  onChange={() => toggle(colors, c, setColors)}
                />
                {c}
              </label>
            ))}
          </FilterDropdown>
        )}

        {hasActiveFilters && (
          <button
            onClick={() => {
              setBrands([]);
              setColors([]);
              setPriceBuckets([]);
            }}
            className="text-xs text-ink/60 underline shrink-0"
          >
            Clear filters
          </button>
        )}

        <div className="ml-auto flex shrink-0 items-center gap-2">
          <label htmlFor="sort" className="text-xs text-ink/60">
            Sort by
          </label>
          <select
            id="sort"
            value={sort}
            onChange={(e) => setSort(e.target.value as SortKey)}
            className="rounded-full border hairline bg-cream px-3 py-2 text-sm"
          >
            <option value="featured">Featured</option>
            <option value="newest">Newest</option>
            <option value="price-asc">Price: Low to High</option>
            <option value="price-desc">Price: High to Low</option>
          </select>
        </div>
      </div>

      <p className="mt-4 text-sm text-ink/60">
        {filtered.length} product{filtered.length === 1 ? "" : "s"}
      </p>

      {filtered.length === 0 ? (
        <div className="mt-16 text-center">
          <p className="font-bold tracking-tight text-xl">No products match these filters</p>
          <p className="mt-2 text-sm text-ink/60">Try clearing a filter or checking back soon.</p>
        </div>
      ) : (
        <div className="mt-4 grid grid-cols-2 gap-x-5 gap-y-10 sm:grid-cols-3 lg:grid-cols-4">
          {filtered.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </div>
  );
}

function FilterDropdown({
  label,
  open,
  onToggle,
  children,
}: {
  label: string;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="relative shrink-0">
      <button
        onClick={onToggle}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex items-center gap-1.5 rounded-full border hairline bg-cream px-4 py-2 text-sm font-medium transition hover:bg-signal/30"
      >
        {label}
        <ChevronDown size={14} />
      </button>
      {open && (
        <div
          role="menu"
          className="absolute left-0 top-full z-30 mt-2 max-h-64 min-w-[200px] overflow-y-auto rounded-2xl border hairline bg-white py-2 shadow-soft"
        >
          {children}
        </div>
      )}
    </div>
  );
}
