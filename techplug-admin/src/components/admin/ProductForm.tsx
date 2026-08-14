"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { UploadCloud, X, Star, Trash2 } from "lucide-react";
import { getCategories } from "@/lib/categories";
import { apiFetch } from "@/lib/api";
import { readImageAsDataUrl } from "@/lib/uploadImage";
import { getPlacements, type PlacementItem } from "@/lib/placements";
import type { Category, ImageBackground, Product } from "@/lib/types";

const BACKGROUND_OPTIONS: { value: ImageBackground; label: string }[] = [
  { value: "transparent", label: "Transparent PNG Cutout" },
  { value: "studio", label: "Studio Solid Canvas" },
  { value: "lifestyle", label: "Lifestyle Photo" },
];

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export default function ProductForm({ product }: { product?: Product }) {
  const router = useRouter();
  const isEdit = Boolean(product);

  const [name, setName] = useState(product?.name ?? "");
  const [slug, setSlug] = useState(product?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(isEdit);
  const [brand, setBrand] = useState(product?.brand ?? "");
  const [price, setPrice] = useState(product ? String(product.price) : "");
  const [compareAtPrice, setCompareAtPrice] = useState(
    product?.compareAtPrice ? String(product.compareAtPrice) : ""
  );
  const [categories, setCategories] = useState<Category[]>([]);
  const [placementOptions, setPlacementOptions] = useState<PlacementItem[]>([]);
  const [categorySlugs, setCategorySlugs] = useState<string[]>(product?.categorySlugs ?? []);
  const [colorTags, setColorTags] = useState<string[]>(product?.colors ?? []);
  const [specs, setSpecs] = useState(product?.specs ?? "");
  const [warranty, setWarranty] = useState(product?.warranty ?? "");
  const [badgesText, setBadgesText] = useState(product?.badges?.join(", ") ?? "");
  const [description, setDescription] = useState(product?.description ?? "");
  const [stockQuantity, setStockQuantity] = useState(
    product ? String(product.stockQuantity) : "0"
  );
  const [placements, setPlacements] = useState<string[]>(product?.placements ?? []);
  const [images, setImages] = useState<string[]>(product?.images ?? []);
  const [imageBackgrounds, setImageBackgrounds] = useState<ImageBackground[]>(
    (product?.images ?? []).map((_, i) => product?.imageBackgrounds?.[i] ?? "studio")
  );
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getCategories().then(setCategories);
    getPlacements().then(setPlacementOptions);
  }, []);

  function handleNameChange(value: string) {
    setName(value);
    if (!slugTouched) setSlug(slugify(value));
  }

  function togglePlacement(value: string) {
    setPlacements((prev) => (prev.includes(value) ? prev.filter((p) => p !== value) : [...prev, value]));
  }

  function toggleCategory(value: string) {
    setCategorySlugs((prev) => (prev.includes(value) ? prev.filter((c) => c !== value) : [...prev, value]));
  }

  async function processFiles(files: File[]) {
    const imageFiles = files.filter((f) => f.type.startsWith("image/"));
    if (imageFiles.length === 0) return;
    setUploading(true);
    setError(null);
    try {
      const dataUrls = await Promise.all(imageFiles.map(readImageAsDataUrl));
      setImages((prev) => [...prev, ...dataUrls]);
      setImageBackgrounds((prev) => [...prev, ...dataUrls.map(() => "studio" as ImageBackground)]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to read one or more images.");
    } finally {
      setUploading(false);
    }
  }

  function handleImageSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    void processFiles(files);
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragActive(false);
    void processFiles(Array.from(e.dataTransfer.files));
  }

  function setCoverImage(index: number) {
    setImages((prev) => {
      const next = [...prev];
      const [item] = next.splice(index, 1);
      next.unshift(item);
      return next;
    });
    setImageBackgrounds((prev) => {
      const next = [...prev];
      const [item] = next.splice(index, 1);
      next.unshift(item);
      return next;
    });
  }

  function setImageBackgroundAt(index: number, value: ImageBackground) {
    setImageBackgrounds((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  }

  function removeImageAt(index: number) {
    setImages((prev) => prev.filter((_, i) => i !== index));
    setImageBackgrounds((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (images.length === 0) {
      setError("At least one image is required.");
      return;
    }
    if (categorySlugs.length === 0) {
      setError("At least one category is required.");
      return;
    }
    const totalImageChars = images.reduce((sum, img) => sum + img.length, 0);
    if (totalImageChars > 12_000_000) {
      setError("Images are too large combined — remove one or use smaller files.");
      return;
    }

    setSubmitting(true);
    const payload = {
      name,
      slug,
      brand,
      price: Number(price),
      compareAtPrice: compareAtPrice ? Number(compareAtPrice) : undefined,
      categorySlugs,
      images,
      imageBackgrounds,
      colors: colorTags,
      specs: specs || undefined,
      warranty: warranty || undefined,
      badges: badgesText
        .split(",")
        .map((b) => b.trim())
        .filter(Boolean),
      description,
      stockQuantity: Math.max(0, Number(stockQuantity) || 0),
      placements,
    };

    try {
      if (isEdit && product) {
        await apiFetch(`/api/products/${product.id}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
      } else {
        await apiFetch("/api/products", {
          method: "POST",
          body: JSON.stringify(payload),
        });
      }
      router.push("/ad-techplugke/products");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!product || !confirm(`Delete "${product.name}"? This cannot be undone.`)) return;
    setSubmitting(true);
    try {
      await apiFetch(`/api/products/${product.id}`, { method: "DELETE" });
      router.push("/ad-techplugke/products");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete product.");
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-4xl rounded-3xl border border-slate-100 bg-white p-8 shadow-sm">
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{isEdit ? "Edit Product" : "Add New Product"}</h1>
          <p className="mt-1 text-sm text-slate-500">
            Manage product details, pricing, inventory, and storefront display settings.
          </p>
        </div>
        {isEdit && (
          <button
            type="button"
            onClick={handleDelete}
            disabled={submitting}
            className="shrink-0 text-sm font-semibold text-sale hover:underline disabled:opacity-60"
          >
            Delete product
          </button>
        )}
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-8">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Name" required value={name} onChange={handleNameChange} />
          <Field
            label="Slug"
            required
            value={slug}
            onChange={(v) => {
              setSlugTouched(true);
              setSlug(v);
            }}
          />
          <Field label="Brand" value={brand} onChange={setBrand} />
          <div>
            <FieldLabel>Stock quantity</FieldLabel>
            <input
              type="number"
              value={stockQuantity}
              onChange={(e) => setStockQuantity(e.target.value)}
              className={inputClass}
            />
          </div>
        </div>

        {/* Structured currency row */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <FieldLabel required>Price</FieldLabel>
            <div className="relative">
              <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm font-semibold text-slate-400">
                Ksh
              </span>
              <input
                type="number"
                required
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className={`${inputClass} pl-12`}
              />
            </div>
          </div>
          <div>
            <FieldLabel>Compare-at price</FieldLabel>
            <div className="relative">
              <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm font-semibold text-slate-400">
                Ksh
              </span>
              <input
                type="number"
                value={compareAtPrice}
                onChange={(e) => setCompareAtPrice(e.target.value)}
                className={`${inputClass} pl-12`}
              />
            </div>
          </div>
        </div>

        {/* Tag/chip inputs */}
        <div className="grid gap-4 sm:grid-cols-2">
          <TagInput label="Colors" tags={colorTags} onChange={setColorTags} placeholder="e.g. Black" />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <FieldLabel>Specs</FieldLabel>
            <input
              value={specs}
              onChange={(e) => setSpecs(e.target.value)}
              placeholder="e.g. 8GB RAM, 256GB SSD"
              className={inputClass}
            />
          </div>
          <div>
            <FieldLabel>Warranty</FieldLabel>
            <input
              value={warranty}
              onChange={(e) => setWarranty(e.target.value)}
              placeholder="e.g. 12 months"
              className={inputClass}
            />
          </div>
        </div>

        <div>
          <FieldLabel>Badges (comma separated)</FieldLabel>
          <input
            value={badgesText}
            onChange={(e) => setBadgesText(e.target.value)}
            className={inputClass}
          />
        </div>

        {/* Media upload */}
        <div>
          <FieldLabel required>Product images</FieldLabel>
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragActive(true);
            }}
            onDragLeave={() => setDragActive(false)}
            onDrop={handleDrop}
            onClick={() => document.getElementById("product-image-input")?.click()}
            className={`cursor-pointer rounded-2xl border-2 border-dashed p-8 text-center transition-colors ${
              dragActive ? "border-slate-400 bg-[#F8F8F6]" : "border-slate-200 bg-[#F8F8F6] hover:border-slate-400"
            }`}
          >
            <UploadCloud size={28} className="mx-auto text-[#8ba832]" />
            <p className="mt-3 text-sm font-medium text-slate-700">
              Drag &amp; drop product images here, or click to browse
            </p>
            <p className="mt-1 text-xs text-slate-400">PNG, JPG, WebP up to 10MB</p>
            <input
              id="product-image-input"
              type="file"
              accept="image/*"
              multiple
              onChange={handleImageSelect}
              disabled={uploading}
              className="hidden"
            />
          </div>
          {uploading && <p className="mt-2 text-xs text-slate-500">Uploading…</p>}

          {images.length > 0 && (
            <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {images.map((url, i) => (
                <div key={url + i} className="rounded-xl border border-slate-100 bg-white p-2 shadow-sm">
                  <div className="relative aspect-square overflow-hidden rounded-xl bg-[#F8F8F6]">
                    <Image src={url} alt="" fill className="object-cover" />
                    <button
                      type="button"
                      onClick={() => removeImageAt(i)}
                      aria-label="Remove image"
                      className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-white/90 text-slate-600 shadow-sm hover:text-sale"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => setCoverImage(i)}
                    className={`mt-2 flex w-full items-center justify-center gap-1 rounded-full px-2 py-1.5 text-[11px] font-bold transition ${
                      i === 0
                        ? "bg-[#D0F244] text-slate-950"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    <Star size={11} fill={i === 0 ? "currentColor" : "none"} />
                    {i === 0 ? "Cover image" : "Set as cover"}
                  </button>

                  <select
                    value={imageBackgrounds[i] ?? "studio"}
                    onChange={(e) => setImageBackgroundAt(i, e.target.value as ImageBackground)}
                    className="mt-2 w-full rounded-full bg-slate-100 px-2 py-1.5 text-[11px] font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-[#D0F244]"
                  >
                    {BACKGROUND_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <FieldLabel required>Categories</FieldLabel>
          {categories.length === 0 ? (
            <p className="text-xs text-slate-400">
              No categories yet — create one under{" "}
              <a href="/ad-techplugke/categories" className="underline">
                Categories
              </a>
              .
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {categories.map((c) => (
                <PillToggle key={c.slug} checked={categorySlugs.includes(c.slug)} onChange={() => toggleCategory(c.slug)}>
                  {c.name}
                </PillToggle>
              ))}
            </div>
          )}
        </div>

        <div>
          <FieldLabel>Show on homepage in</FieldLabel>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {placementOptions.map((opt) => (
              <PillToggle key={opt.slug} checked={placements.includes(opt.slug)} onChange={() => togglePlacement(opt.slug)}>
                {opt.name}
              </PillToggle>
            ))}
          </div>
        </div>

        <div>
          <FieldLabel>Description</FieldLabel>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            className={inputClass}
          />
        </div>

        {error && <p className="text-sm text-sale">{error}</p>}

        {/* Footer action bar */}
        <div className="-mx-8 -mb-8 flex items-center justify-end gap-3 rounded-b-3xl border-t border-slate-100 bg-white px-8 py-5">
          <button
            type="button"
            onClick={() => router.push("/ad-techplugke/products")}
            className="rounded-full px-6 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-100"
          >
            Discard Draft
          </button>
          <button
            type="submit"
            disabled={submitting || uploading}
            className="flex items-center gap-2 rounded-full bg-[#D0F244] px-8 py-3 text-sm font-bold text-slate-950 transition-transform hover:scale-105 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:scale-100"
          >
            {submitting ? "Saving…" : isEdit ? "Save changes" : "Create Product"}
          </button>
        </div>
      </form>
    </div>
  );
}

const inputClass =
  "w-full rounded-xl border-0 bg-[#F8F8F6] px-4 py-3 text-sm font-medium text-slate-900 outline-none transition-all focus:bg-white focus:ring-2 focus:ring-[#D0F244]";

function FieldLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-700">
      {children}
      {required && <span className="text-sale"> *</span>}
    </label>
  );
}

function Field({
  label,
  value,
  onChange,
  required,
  type = "text",
  className = "",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  type?: string;
  className?: string;
}) {
  return (
    <div className={className}>
      <FieldLabel required={required}>{label}</FieldLabel>
      <input
        type={type}
        required={required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={inputClass}
      />
    </div>
  );
}

function PillToggle({
  checked,
  onChange,
  children,
}: {
  checked: boolean;
  onChange: () => void;
  children: React.ReactNode;
}) {
  return (
    <label className="relative block">
      <input type="checkbox" checked={checked} onChange={onChange} className="peer sr-only" />
      <span className="flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 bg-white p-3 text-sm font-medium text-slate-600 transition-colors peer-checked:border-[#D0F244] peer-checked:bg-[#D0F244] peer-checked:text-slate-950 peer-focus-visible:ring-2 peer-focus-visible:ring-[#D0F244]">
        {children}
      </span>
    </label>
  );
}

function TagInput({
  label,
  tags,
  onChange,
  placeholder,
  hint,
}: {
  label: string;
  tags: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
  hint?: string;
}) {
  const [draft, setDraft] = useState("");

  function commit() {
    const value = draft.trim();
    if (!value) return;
    if (!tags.includes(value)) onChange([...tags, value]);
    setDraft("");
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      commit();
    } else if (e.key === "Backspace" && draft === "" && tags.length > 0) {
      onChange(tags.slice(0, -1));
    }
  }

  return (
    <div>
      <FieldLabel>{label}</FieldLabel>
      <div className="flex flex-wrap items-center gap-2 rounded-xl bg-[#F8F8F6] px-3 py-2.5 transition-all focus-within:bg-white focus-within:ring-2 focus-within:ring-[#D0F244]">
        {tags.map((tag) => (
          <span
            key={tag}
            className="flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700"
          >
            {tag}
            <button
              type="button"
              onClick={() => onChange(tags.filter((t) => t !== tag))}
              aria-label={`Remove ${tag}`}
              className="text-slate-400 hover:text-slate-700"
            >
              <X size={11} />
            </button>
          </span>
        ))}
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={commit}
          placeholder={tags.length === 0 ? placeholder : ""}
          className="min-w-[80px] flex-1 bg-transparent py-1 text-sm font-medium text-slate-900 outline-none"
        />
      </div>
      {hint && <p className="mt-1 text-[11px] text-slate-400">{hint}</p>}
    </div>
  );
}
