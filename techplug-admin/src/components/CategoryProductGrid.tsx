"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronDown } from "lucide-react";
import ProductCard from "./ProductCard";
import type { Category, Product } from "@/lib/types";

type SortKey = "featured" | "newest" | "price-asc" | "price-desc";

const PRICE_BUCKETS = [
  { label: "Under KSh 2,000", test: (p: number) => p < 2000 },
  { label: "KSh 2,000–4,000", test: (p: number) => p >= 2000 && p < 4000 },
  { label: "KSh 4,000–6,000", test: (p: number) => p >= 4000 && p < 6000 },
  { label: "Over KSh 6,000", test: (p: number) => p >= 6000 },
];

export default function CategoryProductGrid({
  items,
  subcategories = [],
}: {
  items: Product[];
  subcategories?: Category[];
}) {
  const [openFilter, setOpenFilter] = useState<string | null>(null);
  const [brands, setBrands] = useState<string[]>([]);
  const [colors, setColors] = useState<string[]>([]);
  const [subcategorySlugs, setSubcategorySlugs] = useState<string[]>([]);
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
  // Only offer subcategories that at least one product on this page actually has —
  // e.g. don't show "Lenovo" as a filter if nothing in stock right now is tagged with it.
  const subcategoryOptions = useMemo(
    () => subcategories.filter((sc) => items.some((p) => p.categorySlugs.includes(sc.slug))),
    [subcategories, items]
  );

  function toggle<T>(list: T[], value: T, setList: (v: T[]) => void) {
    setList(list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);
  }

  const filtered = useMemo(() => {
    const result = items.filter((p) => {
      if (brands.length > 0 && !(p.brand && brands.includes(p.brand))) return false;
      if (colors.length > 0 && !p.colors.some((c) => colors.includes(c))) return false;
      if (
        subcategorySlugs.length > 0 &&
        !p.categorySlugs.some((slug) => subcategorySlugs.includes(slug))
      ) {
        return false;
      }
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
  }, [items, brands, colors, subcategorySlugs, priceBuckets, sort]);

  const hasActiveFilters =
    brands.length > 0 || colors.length > 0 || subcategorySlugs.length > 0 || priceBuckets.length > 0;

  return (
    <div>
      <div className="sticky top-[88px] z-20 -mx-4 flex flex-wrap items-center gap-2 overflow-x-auto rounded-3xl bg-white px-4 py-4 shadow-soft sm:mx-0">
        {brandOptions.length > 0 && (
          <FilterDropdown
            label="Brand"
            open={openFilter === "brand"}
            onToggle={() => setOpenFilter(openFilter === "brand" ? null : "brand")}
            onClose={() => setOpenFilter(null)}
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
          onClose={() => setOpenFilter(null)}
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

        {subcategoryOptions.length > 0 && (
          <FilterDropdown
            label="Category"
            open={openFilter === "subcategory"}
            onToggle={() => setOpenFilter(openFilter === "subcategory" ? null : "subcategory")}
            onClose={() => setOpenFilter(null)}
          >
            {subcategoryOptions.map((sc) => (
              <label key={sc.slug} className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-cream cursor-pointer">
                <input
                  type="checkbox"
                  className="accent-signal"
                  checked={subcategorySlugs.includes(sc.slug)}
                  onChange={() => toggle(subcategorySlugs, sc.slug, setSubcategorySlugs)}
                />
                {sc.name}
              </label>
            ))}
          </FilterDropdown>
        )}

        {colorOptions.length > 0 && (
          <FilterDropdown
            label="Color"
            open={openFilter === "color"}
            onToggle={() => setOpenFilter(openFilter === "color" ? null : "color")}
            onClose={() => setOpenFilter(null)}
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
              setSubcategorySlugs([]);
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
  onClose,
  children,
}: {
  label: string;
  open: boolean;
  onToggle: () => void;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(null);

  // The panel renders in a portal (see below) specifically so it isn't a layout child of the
  // sticky filter bar — that bar scrolls horizontally on mobile (overflow-x-auto), and CSS
  // forces the vertical axis to clip too whenever the horizontal one isn't `visible`. Left as a
  // normal absolutely-positioned child, the panel either got cut off by that clipping or (once
  // it did render) pushed the bar's own height around. Fixed positioning computed from the
  // trigger button's rect sidesteps both problems entirely.
  useEffect(() => {
    if (!open) return;
    function updatePosition() {
      const rect = buttonRef.current?.getBoundingClientRect();
      if (rect) setCoords({ top: rect.bottom + 8, left: rect.left });
    }
    updatePosition();
    window.addEventListener("scroll", updatePosition, true);
    window.addEventListener("resize", updatePosition);
    return () => {
      window.removeEventListener("scroll", updatePosition, true);
      window.removeEventListener("resize", updatePosition);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function handlePointerDown(e: MouseEvent) {
      const target = e.target as Node;
      if (buttonRef.current?.contains(target) || panelRef.current?.contains(target)) return;
      onClose();
    }
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [open, onClose]);

  return (
    <div className="shrink-0">
      <button
        ref={buttonRef}
        onClick={onToggle}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex items-center gap-1.5 rounded-full border hairline bg-cream px-4 py-2 text-sm font-medium transition hover:bg-signal/30"
      >
        {label}
        <ChevronDown size={14} />
      </button>
      {open &&
        coords &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            ref={panelRef}
            role="menu"
            style={{ top: coords.top, left: coords.left }}
            className="fixed z-50 max-h-64 min-w-[200px] overflow-y-auto rounded-2xl border hairline bg-white py-2 shadow-soft"
          >
            {children}
          </div>,
          document.body
        )}
    </div>
  );
}
