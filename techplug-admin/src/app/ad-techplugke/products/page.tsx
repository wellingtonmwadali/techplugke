"use client";

import Image from "next/image";
import Link from "next/link";
import { useRef, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  Plus,
  Upload,
  Info,
  Edit2,
  Copy,
  Trash2,
  MoreVertical,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { apiFetch } from "@/lib/api";
import { formatKes } from "@/lib/format";
import { getCategories } from "@/lib/categories";
import { getPlacements, type PlacementItem } from "@/lib/placements";
import { parseCsv } from "@/lib/csv";
import type { Category, Product } from "@/lib/types";

type ImportResult = { row: number; success: boolean; error?: string };
type Paginated<T> = { items: T[]; total: number; page: number; pageSize: number };

const PAGE_SIZE = 25;

const PLACEMENT_BADGES: Record<string, { icon: string; label: string; className: string }> = {
  "flash-sales": { icon: "🔥", label: "Flash Sales", className: "bg-amber-50 text-amber-700 border-amber-200" },
  "best-sellers": { icon: "⭐", label: "Best Sellers", className: "bg-lime-50 text-lime-700 border-lime-200" },
  "this-month-deals": { icon: "🏷️", label: "Deals", className: "bg-blue-50 text-blue-700 border-blue-200" },
  "top-deals": { icon: "💰", label: "Top Deals", className: "bg-purple-50 text-purple-700 border-purple-200" },
  "more-deals": { icon: "➕", label: "More Deals", className: "bg-slate-100 text-slate-600 border-slate-200" },
  "women-deals": { icon: "👗", label: "Women's", className: "bg-pink-50 text-pink-700 border-pink-200" },
  "men-deals": { icon: "👔", label: "Men's", className: "bg-sky-50 text-sky-700 border-sky-200" },
  "top-accessories": { icon: "👜", label: "Accessories", className: "bg-teal-50 text-teal-700 border-teal-200" },
};

export default function AdminProductsPage() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[] | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [placementOptions, setPlacementOptions] = useState<PlacementItem[]>([]);
  const [total, setTotal] = useState(0);
  const [outOfStockTotal, setOutOfStockTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [error, setError] = useState<string | null>(null);

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [stockFilter, setStockFilter] = useState<"" | "true" | "false">("");
  const [placementFilter, setPlacementFilter] = useState("");

  const [selected, setSelected] = useState<string[]>([]);
  const [bulkPrice, setBulkPrice] = useState("");
  const [bulkCategory, setBulkCategory] = useState("");
  const [bulkStockQuantity, setBulkStockQuantity] = useState("");
  const [bulkPlacements, setBulkPlacements] = useState<string[]>([]);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [importResults, setImportResults] = useState<ImportResult[] | null>(null);
  const [importing, setImporting] = useState(false);
  const [csvHelpOpen, setCsvHelpOpen] = useState(false);
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  // Debounce the free-text search box before it hits the API.
  useEffect(() => {
    const timeout = setTimeout(() => {
      setPage(1);
      setSearch(searchInput);
    }, 250);
    return () => clearTimeout(timeout);
  }, [searchInput]);

  function buildParams(overrides: Record<string, string> = {}) {
    const params = new URLSearchParams({
      page: String(overrides.page ?? page),
      pageSize: String(PAGE_SIZE),
    });
    if (search) params.set("search", search);
    if (categoryFilter) params.set("category", categoryFilter);
    if (placementFilter) params.set("placement", placementFilter);
    if (stockFilter) params.set("inStock", stockFilter);
    for (const [key, value] of Object.entries(overrides)) params.set(key, value);
    return params;
  }

  function loadProducts() {
    apiFetch<Paginated<Product>>(`/api/products?${buildParams()}`)
      .then((result) => {
        setProducts(result.items);
        setTotal(result.total);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load products."));

    apiFetch<Paginated<Product>>(`/api/products?${buildParams({ page: "1", pageSize: "1", inStock: "false" })}`)
      .then((result) => setOutOfStockTotal(result.total))
      .catch(() => {});
  }

  useEffect(() => {
    loadProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, search, categoryFilter, stockFilter, placementFilter]);

  useEffect(() => {
    getCategories().then(setCategories);
    getPlacements().then(setPlacementOptions);
  }, []);

  function categoryName(slug: string) {
    return categories.find((c) => c.slug === slug)?.name ?? slug;
  }

  function updateFilter<T>(setter: (v: T) => void) {
    return (value: T) => {
      setPage(1);
      setter(value);
    };
  }

  function toggleSelected(id: string) {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  function toggleSelectAll() {
    if (!products) return;
    setSelected(selected.length === products.length ? [] : products.map((p) => p.id));
  }

  function togglePlacement(value: string) {
    setBulkPlacements((prev) => (prev.includes(value) ? prev.filter((p) => p !== value) : [...prev, value]));
  }

  async function applyBulkUpdate() {
    const update: Record<string, unknown> = {};
    const trimmedPrice = bulkPrice.trim();
    if (trimmedPrice) {
      const price = Number(trimmedPrice);
      if (!Number.isFinite(price) || price < 0) {
        setError("Enter a valid, non-negative price.");
        return;
      }
      update.price = price;
    }
    if (bulkCategory) update.categorySlugs = [bulkCategory];
    const trimmedStock = bulkStockQuantity.trim();
    if (trimmedStock) {
      const stockQuantity = Number(trimmedStock);
      if (!Number.isFinite(stockQuantity) || stockQuantity < 0) {
        setError("Enter a valid, non-negative stock quantity.");
        return;
      }
      update.stockQuantity = stockQuantity;
    }
    if (bulkPlacements.length > 0) update.placements = bulkPlacements;

    if (Object.keys(update).length === 0) {
      setError("Choose at least one field to bulk-update.");
      return;
    }

    setBulkBusy(true);
    setError(null);
    try {
      await apiFetch("/api/products/bulk", {
        method: "PATCH",
        body: JSON.stringify({ ids: selected, update }),
      });
      setSelected([]);
      setBulkPrice("");
      setBulkCategory("");
      setBulkStockQuantity("");
      setBulkPlacements([]);
      loadProducts();
    } catch {
      setError("Bulk update failed.");
    } finally {
      setBulkBusy(false);
    }
  }

  async function bulkDelete() {
    if (!confirm(`Delete ${selected.length} product(s)? This cannot be undone.`)) return;
    setBulkBusy(true);
    setError(null);
    try {
      await apiFetch("/api/products/bulk", {
        method: "DELETE",
        body: JSON.stringify({ ids: selected }),
      });
      setSelected([]);
      loadProducts();
    } catch {
      setError("Bulk delete failed.");
    } finally {
      setBulkBusy(false);
    }
  }

  async function bulkMarkOutOfStock() {
    setBulkBusy(true);
    setError(null);
    try {
      await apiFetch("/api/products/bulk", {
        method: "PATCH",
        body: JSON.stringify({ ids: selected, update: { stockQuantity: 0 } }),
      });
      setSelected([]);
      loadProducts();
    } catch {
      setError("Bulk update failed.");
    } finally {
      setBulkBusy(false);
    }
  }

  async function duplicateProduct(id: string) {
    try {
      const copy = await apiFetch<Product>(`/api/products/${id}/duplicate`, { method: "POST" });
      router.push(`/ad-techplugke/products/${copy.id}/edit`);
    } catch {
      setError("Failed to duplicate product.");
    }
  }

  async function deleteProduct(product: Product) {
    if (!confirm(`Delete "${product.name}"? This cannot be undone.`)) return;
    setMenuOpenId(null);
    try {
      await apiFetch(`/api/products/${product.id}`, { method: "DELETE" });
      loadProducts();
    } catch {
      setError("Failed to delete product.");
    }
  }

  async function toggleStock(product: Product) {
    setMenuOpenId(null);
    try {
      await apiFetch(`/api/products/${product.id}`, {
        method: "PUT",
        body: JSON.stringify({ stockQuantity: product.inStock ? 0 : Math.max(1, product.stockQuantity) }),
      });
      loadProducts();
    } catch {
      setError("Failed to update stock status.");
    }
  }

  async function handleImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    setImportResults(null);
    setError(null);
    try {
      const text = await file.text();
      const rows = parseCsv(text);
      const { results } = await apiFetch<{ results: ImportResult[] }>("/api/products/import", {
        method: "POST",
        body: JSON.stringify({ products: rows }),
      });
      setImportResults(results);
      loadProducts();
    } catch {
      setError("Import failed.");
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  const showingFrom = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const showingTo = Math.min(page * PAGE_SIZE, total);

  return (
    <div>
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Products</h1>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-500">
            {total} Total Product{total === 1 ? "" : "s"} • {outOfStockTotal} Out of Stock
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <button
              type="button"
              onClick={() => setCsvHelpOpen((v) => !v)}
              aria-label="CSV import format help"
              className="flex h-9 w-9 items-center justify-center text-slate-400 transition hover:text-slate-600"
            >
              <Info size={16} />
            </button>
            {csvHelpOpen && (
              <div className="absolute right-0 top-full z-20 mt-1 w-72 rounded-2xl border border-slate-100 bg-white p-4 text-xs text-slate-500 shadow-lg">
                CSV columns: name, brand, price, compareAtPrice, categorySlugs, images,
                colors, specs, warranty, description, inStock, badges, placements —
                separate multiple values within a cell with &ldquo;;&rdquo;.
              </div>
            )}
          </div>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={importing}
            className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
          >
            <Upload size={16} />
            {importing ? "Importing…" : "Import CSV"}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,text/csv"
            onChange={handleImportFile}
            className="hidden"
          />
          <Link
            href="/ad-techplugke/products/new"
            className="flex items-center gap-2 rounded-full bg-[#D0F244] px-6 py-2.5 text-sm font-bold text-slate-950 transition-transform hover:scale-105"
          >
            <Plus size={16} />
            Add Product
          </Link>
        </div>
      </div>

      {/* Search & filter toolbar */}
      <div className="mt-6 flex flex-wrap items-center gap-3">
        <div className="relative">
          <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search by name or brand"
            className="w-72 rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-4 text-sm outline-none focus:ring-2 focus:ring-[#D0F244]"
          />
        </div>

        <select
          value={categoryFilter}
          onChange={(e) => updateFilter(setCategoryFilter)(e.target.value)}
          className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-[#D0F244]"
        >
          <option value="">Category: All</option>
          {categories.map((c) => (
            <option key={c.slug} value={c.slug}>
              {c.name}
            </option>
          ))}
        </select>

        <select
          value={stockFilter}
          onChange={(e) => updateFilter(setStockFilter)(e.target.value as "" | "true" | "false")}
          className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-[#D0F244]"
        >
          <option value="">Stock: All</option>
          <option value="true">In stock</option>
          <option value="false">Out of stock</option>
        </select>

        <div className="flex flex-wrap gap-2">
          {placementOptions.map((opt) => (
            <button
              key={opt.slug}
              type="button"
              onClick={() => updateFilter(setPlacementFilter)(placementFilter === opt.slug ? "" : opt.slug)}
              className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                placementFilter === opt.slug
                  ? "border-[#D0F244] bg-[#D0F244] text-slate-950"
                  : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
              }`}
            >
              {opt.name}
            </button>
          ))}
        </div>
      </div>

      {importResults && (
        <div className="mt-4 rounded-2xl border border-slate-100 bg-white p-4 text-sm">
          <p className="font-medium">
            Imported {importResults.filter((r) => r.success).length} of {importResults.length} rows
          </p>
          <ul className="mt-2 flex flex-col gap-1">
            {importResults
              .filter((r) => !r.success)
              .map((r) => (
                <li key={r.row} className="text-sale">
                  Row {r.row}: {r.error}
                </li>
              ))}
          </ul>
        </div>
      )}

      {error && <p className="mt-4 text-sm text-sale">{error}</p>}

      {selected.length > 0 && (
        <div className="mt-4 flex flex-wrap items-end gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-4">
          <p className="w-full text-sm font-semibold text-slate-700">{selected.length} selected</p>
          <label className="flex flex-col gap-1 text-xs text-slate-500">
            Price
            <input
              type="number"
              value={bulkPrice}
              onChange={(e) => setBulkPrice(e.target.value)}
              className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs text-slate-500">
            Category (replaces existing)
            <select
              value={bulkCategory}
              onChange={(e) => setBulkCategory(e.target.value)}
              className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm"
            >
              <option value="">No change</option>
              {categories.map((c) => (
                <option key={c.slug} value={c.slug}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs text-slate-500">
            Stock quantity
            <input
              type="number"
              min={0}
              placeholder="No change"
              value={bulkStockQuantity}
              onChange={(e) => setBulkStockQuantity(e.target.value)}
              className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm"
            />
          </label>
          <div className="flex flex-col gap-1 text-xs text-slate-500">
            Placements
            <div className="flex flex-wrap gap-2">
              {placementOptions.map((opt) => (
                <label key={opt.slug} className="flex items-center gap-1">
                  <input
                    type="checkbox"
                    checked={bulkPlacements.includes(opt.slug)}
                    onChange={() => togglePlacement(opt.slug)}
                  />
                  {opt.name}
                </label>
              ))}
            </div>
          </div>
          <button
            onClick={applyBulkUpdate}
            disabled={bulkBusy}
            className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            Apply
          </button>
          <button
            onClick={bulkMarkOutOfStock}
            disabled={bulkBusy}
            className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 disabled:opacity-60"
          >
            Mark out of stock
          </button>
          <button
            onClick={bulkDelete}
            disabled={bulkBusy}
            className="rounded-full border border-rose-200 bg-white px-4 py-2 text-sm font-semibold text-sale disabled:opacity-60"
          >
            Delete selected
          </button>
        </div>
      )}

      {/* Table */}
      {!products ? (
        <p className="mt-6 text-sm text-slate-500">Loading…</p>
      ) : products.length === 0 ? (
        <div className="mt-10 rounded-3xl border border-slate-100 bg-white py-16 text-center shadow-sm">
          <p className="text-xl font-bold text-slate-900">No products found</p>
          <p className="mt-2 text-sm text-slate-500">Try adjusting your filters, or add your first product.</p>
        </div>
      ) : (
        <div className="mt-6 overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400">
                  <th className="py-3 pl-5 pr-2">
                    <input
                      type="checkbox"
                      checked={selected.length === products.length}
                      onChange={toggleSelectAll}
                      className="h-4 w-4 rounded accent-[#D0F244]"
                    />
                  </th>
                  <th className="py-3 pr-4 font-semibold">Product</th>
                  <th className="py-3 pr-4 font-semibold">Category</th>
                  <th className="py-3 pr-4 font-semibold">Price</th>
                  <th className="py-3 pr-4 font-semibold">Placements</th>
                  <th className="py-3 pr-4 font-semibold">Stock</th>
                  <th className="py-3 pr-5 font-semibold"></th>
                </tr>
              </thead>
              <tbody>
                {products.map((product) => (
                  <tr
                    key={product.id}
                    onClick={() => router.push(`/ad-techplugke/products/${product.id}/edit`)}
                    className="cursor-pointer border-b border-slate-100 transition-colors last:border-0 hover:bg-slate-50/80"
                  >
                    <td className="py-3 pl-5 pr-2" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selected.includes(product.id)}
                        onChange={() => toggleSelected(product.id)}
                        className="h-4 w-4 rounded accent-[#D0F244]"
                      />
                    </td>
                    <td className="py-3 pr-4">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-slate-100">
                          {product.images[0] && (
                            <div className="relative h-10 w-10">
                              <Image src={product.images[0]} alt="" fill className="object-cover" />
                            </div>
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-slate-900">{product.name}</p>
                          {product.brand && <span className="block text-xs text-slate-400">{product.brand}</span>}
                        </div>
                      </div>
                    </td>
                    <td className="py-3 pr-4">
                      <div className="flex flex-wrap gap-1">
                        {product.categorySlugs.map((slug) => (
                          <span
                            key={slug}
                            className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700"
                          >
                            {categoryName(slug)}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="py-3 pr-4">
                      <span className="text-sm font-bold text-slate-900">{formatKes(product.price)}</span>
                      {product.compareAtPrice && (
                        <span className="ml-2 text-xs text-slate-400 line-through">
                          {formatKes(product.compareAtPrice)}
                        </span>
                      )}
                    </td>
                    <td className="py-3 pr-4">
                      <div className="flex flex-wrap gap-1">
                        {product.placements && product.placements.length > 0 ? (
                          product.placements.map((p) => {
                            const badge = PLACEMENT_BADGES[p] ?? {
                              icon: "•",
                              label: p,
                              className: "bg-slate-100 text-slate-600 border-slate-200",
                            };
                            return (
                              <span
                                key={p}
                                className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${badge.className}`}
                              >
                                {badge.icon} {badge.label}
                              </span>
                            );
                          })
                        ) : (
                          <span className="text-xs text-slate-300">—</span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 pr-4">
                      {product.inStock ? (
                        <span className="flex w-fit items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                          <CheckCircle2 size={12} /> In Stock
                        </span>
                      ) : (
                        <span className="flex w-fit items-center gap-1.5 rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-xs font-semibold text-sale">
                          <XCircle size={12} /> Out of Stock
                        </span>
                      )}
                    </td>
                    <td className="py-3 pr-5" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1">
                        <Link
                          href={`/ad-techplugke/products/${product.id}/edit`}
                          aria-label="Edit product"
                          className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                        >
                          <Edit2 size={15} />
                        </Link>
                        <button
                          onClick={() => duplicateProduct(product.id)}
                          aria-label="Duplicate product"
                          className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                        >
                          <Copy size={15} />
                        </button>
                        <button
                          onClick={() => deleteProduct(product)}
                          aria-label="Delete product"
                          className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 transition hover:bg-rose-50 hover:text-sale"
                        >
                          <Trash2 size={15} />
                        </button>
                        <div className="relative">
                          <button
                            onClick={() => setMenuOpenId(menuOpenId === product.id ? null : product.id)}
                            aria-label="More options"
                            className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                          >
                            <MoreVertical size={15} />
                          </button>
                          {menuOpenId === product.id && (
                            <div className="absolute right-0 top-full z-20 mt-1 w-44 rounded-2xl border border-slate-100 bg-white py-1 text-sm shadow-lg">
                              <button
                                onClick={() => toggleStock(product)}
                                className="block w-full px-4 py-2 text-left text-slate-600 hover:bg-slate-50"
                              >
                                Mark {product.inStock ? "out of stock" : "in stock"}
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between border-t border-slate-100 px-5 py-4 text-sm">
            <p className="text-slate-500">
              Showing {showingFrom} to {showingTo} of {total} product{total === 1 ? "" : "s"}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="rounded-full border border-slate-200 px-4 py-1.5 font-medium text-slate-600 disabled:opacity-40"
              >
                Prev
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="rounded-full border border-slate-200 px-4 py-1.5 font-medium text-slate-600 disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
