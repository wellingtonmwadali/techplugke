"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { X, Trash2 } from "lucide-react";
import { getCategories, createCategory, updateCategory, deleteCategory } from "@/lib/categories";
import { getPlacements, createPlacement, updatePlacement, deletePlacement, type PlacementItem } from "@/lib/placements";
import { readImageAsDataUrl } from "@/lib/uploadImage";
import type { Category } from "@/lib/types";

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function CategoriesTab() {
  const [categories, setCategories] = useState<Category[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  function loadCategories() {
    getCategories()
      .then(setCategories)
      .catch((err) => setLoadError(err instanceof Error ? err.message : "Failed to load categories."));
  }

  useEffect(() => {
    loadCategories();
  }, []);

  async function handleDelete(category: Category, onDone?: () => void) {
    if (!confirm(`Delete "${category.name}"? This cannot be undone.`)) return;
    setLoadError(null);
    try {
      await deleteCategory(category.id);
      onDone?.();
      loadCategories();
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Failed to delete category.");
    }
  }

  const parentCategories = (categories ?? []).filter((c) => !c.parentSlug);
  const subcategories = (categories ?? []).filter((c) => c.parentSlug);

  return (
    <div className="flex flex-col gap-10">
      {loadError && <p className="text-sm text-sale">{loadError}</p>}

      <ParentCategoriesSection
        categories={categories}
        parentCategories={parentCategories}
        onChanged={loadCategories}
        onDelete={handleDelete}
      />

      <SubcategoriesSection
        parentCategories={parentCategories}
        subcategories={subcategories}
        onChanged={loadCategories}
        onDelete={handleDelete}
      />
    </div>
  );
}

function ParentCategoriesSection({
  categories,
  parentCategories,
  onChanged,
  onDelete,
}: {
  categories: Category[] | null;
  parentCategories: Category[];
  onChanged: () => void;
  onDelete: (category: Category, onDone?: () => void) => void;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [image, setImage] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function resetForm() {
    setEditingId(null);
    setName("");
    setSlug("");
    setSlugTouched(false);
    setImage(null);
  }

  function startEdit(category: Category) {
    setEditingId(category.id);
    setName(category.name);
    setSlug(category.slug);
    setSlugTouched(true);
    setImage(category.image);
    setError(null);
  }

  function handleNameChange(value: string) {
    setName(value);
    if (!slugTouched) setSlug(slugify(value));
  }

  async function handleImageSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      setImage(await readImageAsDataUrl(file));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to read image.");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError("Name is required.");
      return;
    }
    if (!image) {
      setError("An image is required.");
      return;
    }

    setSubmitting(true);
    try {
      if (editingId) {
        await updateCategory(editingId, { name, slug, image });
      } else {
        await createCategory({ name, slug, image });
      }
      resetForm();
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-lg font-bold tracking-tight">Categories</h2>
        <p className="mt-1 text-sm text-ink/60">
          Top-level categories, e.g. &ldquo;Laptops &amp; Computers&rdquo;, &ldquo;Phones &amp;
          Tablets&rdquo;. Create these first — they become the parent options when you add
          subcategories below.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4 rounded-3xl bg-white p-6 shadow-soft">
        <h3 className="font-semibold">{editingId ? "Edit category" : "New category"}</h3>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium">
              Name <span className="text-sale">*</span>
            </span>
            <input
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              required
              className="rounded-2xl border hairline bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-signal"
            />
          </label>
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium">
              Slug <span className="text-sale">*</span>
            </span>
            <input
              value={slug}
              onChange={(e) => {
                setSlugTouched(true);
                setSlug(e.target.value);
              }}
              required
              className="rounded-2xl border hairline bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-signal"
            />
          </label>
        </div>

        <div>
          <p className="text-sm font-medium">Image</p>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            {image && (
              <div className="relative h-24 w-24 overflow-hidden rounded-2xl bg-cream">
                <Image src={image} alt="" fill className="object-cover" />
                <button
                  type="button"
                  onClick={() => setImage(null)}
                  aria-label="Remove image"
                  className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-ink/70 text-white"
                >
                  <X size={12} />
                </button>
              </div>
            )}
            <input
              type="file"
              accept="image/*"
              onChange={handleImageSelect}
              disabled={uploading}
              className="text-sm"
            />
          </div>
          {uploading && <p className="mt-1 text-xs text-ink/60">Uploading…</p>}
        </div>

        {error && <p className="text-sm text-sale">{error}</p>}

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={submitting || uploading}
            className="rounded-full bg-signal px-6 py-2.5 text-sm font-semibold text-ink shadow-soft disabled:opacity-60"
          >
            {submitting ? "Saving…" : editingId ? "Save changes" : "Create category"}
          </button>
          {editingId && (
            <button
              type="button"
              onClick={resetForm}
              className="rounded-full border hairline px-6 py-2.5 text-sm font-semibold"
            >
              Cancel
            </button>
          )}
        </div>
      </form>

      {!categories ? (
        <p className="text-sm text-ink/60">Loading…</p>
      ) : parentCategories.length === 0 ? (
        <p className="text-sm text-ink/60">No categories yet — create one above.</p>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {parentCategories.map((category) => (
            <CategoryCard
              key={category.id}
              category={category}
              onEdit={startEdit}
              onDelete={(c) => onDelete(c, () => editingId === c.id && resetForm())}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function SubcategoriesSection({
  parentCategories,
  subcategories,
  onChanged,
  onDelete,
}: {
  parentCategories: Category[];
  subcategories: Category[];
  onChanged: () => void;
  onDelete: (category: Category, onDone?: () => void) => void;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [image, setImage] = useState<string | null>(null);
  const [parentSlug, setParentSlug] = useState("");
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function resetForm() {
    setEditingId(null);
    setName("");
    setSlug("");
    setSlugTouched(false);
    setImage(null);
    setParentSlug("");
  }

  function startEdit(category: Category) {
    setEditingId(category.id);
    setName(category.name);
    setSlug(category.slug);
    setSlugTouched(true);
    setImage(category.image);
    setParentSlug(category.parentSlug ?? "");
    setError(null);
  }

  function handleNameChange(value: string) {
    setName(value);
    if (!slugTouched) setSlug(slugify(value));
  }

  async function handleImageSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      setImage(await readImageAsDataUrl(file));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to read image.");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError("Name is required.");
      return;
    }
    if (!parentSlug) {
      setError("A parent category is required.");
      return;
    }
    if (!image) {
      setError("An image is required.");
      return;
    }

    setSubmitting(true);
    try {
      if (editingId) {
        await updateCategory(editingId, { name, slug, image, parentSlug });
      } else {
        await createCategory({ name, slug, image, parentSlug });
      }
      resetForm();
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-lg font-bold tracking-tight">Subcategories</h2>
        <p className="mt-1 text-sm text-ink/60">
          Brands or sub-groupings within a category, e.g. &ldquo;Dell&rdquo;, &ldquo;HP&rdquo;,
          &ldquo;Lenovo&rdquo; under &ldquo;Laptops &amp; Computers&rdquo;.
        </p>
      </div>

      {parentCategories.length === 0 ? (
        <p className="rounded-3xl bg-white p-6 text-sm text-ink/60 shadow-soft">
          Create a category above first — subcategories need a parent to belong to.
        </p>
      ) : (
        <>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4 rounded-3xl bg-white p-6 shadow-soft">
            <h3 className="font-semibold">{editingId ? "Edit subcategory" : "New subcategory"}</h3>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="flex flex-col gap-1.5 text-sm">
                <span className="font-medium">
                  Name <span className="text-sale">*</span>
                </span>
                <input
                  value={name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  required
                  className="rounded-2xl border hairline bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-signal"
                />
              </label>
              <label className="flex flex-col gap-1.5 text-sm">
                <span className="font-medium">
                  Slug <span className="text-sale">*</span>
                </span>
                <input
                  value={slug}
                  onChange={(e) => {
                    setSlugTouched(true);
                    setSlug(e.target.value);
                  }}
                  required
                  className="rounded-2xl border hairline bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-signal"
                />
              </label>
            </div>

            <label className="flex flex-col gap-1.5 text-sm sm:max-w-xs">
              <span className="font-medium">
                Parent category <span className="text-sale">*</span>
              </span>
              <select
                value={parentSlug}
                onChange={(e) => setParentSlug(e.target.value)}
                required
                className="rounded-2xl border hairline bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-signal"
              >
                <option value="" disabled>
                  Select a category…
                </option>
                {parentCategories.map((c) => (
                  <option key={c.id} value={c.slug}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>

            <div>
              <p className="text-sm font-medium">Image</p>
              <div className="mt-2 flex flex-wrap items-center gap-3">
                {image && (
                  <div className="relative h-24 w-24 overflow-hidden rounded-2xl bg-cream">
                    <Image src={image} alt="" fill className="object-cover" />
                    <button
                      type="button"
                      onClick={() => setImage(null)}
                      aria-label="Remove image"
                      className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-ink/70 text-white"
                    >
                      <X size={12} />
                    </button>
                  </div>
                )}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageSelect}
                  disabled={uploading}
                  className="text-sm"
                />
              </div>
              {uploading && <p className="mt-1 text-xs text-ink/60">Uploading…</p>}
            </div>

            {error && <p className="text-sm text-sale">{error}</p>}

            <div className="flex items-center gap-3">
              <button
                type="submit"
                disabled={submitting || uploading}
                className="rounded-full bg-signal px-6 py-2.5 text-sm font-semibold text-ink shadow-soft disabled:opacity-60"
              >
                {submitting ? "Saving…" : editingId ? "Save changes" : "Create subcategory"}
              </button>
              {editingId && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="rounded-full border hairline px-6 py-2.5 text-sm font-semibold"
                >
                  Cancel
                </button>
              )}
            </div>
          </form>

          {subcategories.length === 0 ? (
            <p className="text-sm text-ink/60">No subcategories yet — create one above.</p>
          ) : (
            <div className="flex flex-col gap-6">
              {parentCategories.map((parent) => {
                const children = subcategories.filter((c) => c.parentSlug === parent.slug);
                if (children.length === 0) return null;
                return (
                  <div key={parent.id}>
                    <p className="text-sm font-semibold text-ink/70">{parent.name}</p>
                    <div className="mt-3 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                      {children.map((child) => (
                        <CategoryCard
                          key={child.id}
                          category={child}
                          onEdit={startEdit}
                          onDelete={(c) => onDelete(c, () => editingId === c.id && resetForm())}
                        />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function CategoryCard({
  category,
  onEdit,
  onDelete,
}: {
  category: Category;
  onEdit: (category: Category) => void;
  onDelete: (category: Category) => void;
}) {
  return (
    <div className="rounded-3xl bg-white p-4 shadow-soft">
      <div className="relative aspect-square w-full overflow-hidden rounded-2xl bg-cream">
        <Image src={category.image} alt={category.name} fill className="object-cover" />
      </div>
      <p className="mt-3 text-sm font-semibold">{category.name}</p>
      <p className="text-xs text-ink/50">{category.slug}</p>
      <div className="mt-3 flex gap-3 text-xs font-medium">
        <button onClick={() => onEdit(category)} className="text-ink/70 hover:text-ink">
          Edit
        </button>
        <button onClick={() => onDelete(category)} className="text-sale">
          Delete
        </button>
      </div>
    </div>
  );
}

function PlacementsTab() {
  const [placements, setPlacements] = useState<PlacementItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  function load() {
    getPlacements()
      .then(setPlacements)
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load placements."));
  }

  useEffect(load, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      await createPlacement(name.trim());
      setName("");
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create placement.");
    } finally {
      setSubmitting(false);
    }
  }

  function startEdit(placement: PlacementItem) {
    setEditingId(placement.id);
    setEditingName(placement.name);
    setError(null);
  }

  async function saveEdit(id: string) {
    if (!editingName.trim()) return;
    setBusyId(id);
    setError(null);
    try {
      const updated = await updatePlacement(id, editingName.trim());
      setPlacements((prev) => (prev ? prev.map((p) => (p.id === id ? updated : p)) : prev));
      setEditingId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update placement.");
    } finally {
      setBusyId(null);
    }
  }

  async function remove(placement: PlacementItem) {
    if (
      !confirm(
        `Delete "${placement.name}"? Its homepage section will disappear, and any products assigned to it will silently lose that assignment. This cannot be undone.`
      )
    ) {
      return;
    }
    setBusyId(placement.id);
    setError(null);
    try {
      await deletePlacement(placement.id);
      setPlacements((prev) => (prev ? prev.filter((p) => p.id !== placement.id) : prev));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete placement.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="rounded-3xl bg-white p-6 shadow-soft">
        <h2 className="font-semibold">New placement</h2>
        <p className="mt-1 text-sm text-ink/60">
          Where a product can be featured on the homepage — e.g. &ldquo;Top Deals&rdquo; or
          &ldquo;Men&apos;s Fashion&rdquo;. Each one becomes a checkbox on the product form and its
          own homepage section (only shown once it has at least one product assigned).
        </p>
        <form onSubmit={handleCreate} className="mt-4 flex gap-3">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Back to School"
            required
            className="flex-1 rounded-2xl border hairline bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-signal"
          />
          <button
            type="submit"
            disabled={submitting}
            className="rounded-full bg-signal px-6 py-2.5 text-sm font-semibold text-ink shadow-soft disabled:opacity-60"
          >
            {submitting ? "Adding…" : "Add placement"}
          </button>
        </form>
        {error && <p className="mt-3 text-sm text-sale">{error}</p>}
      </div>

      {!placements ? (
        <p className="text-sm text-ink/60">Loading…</p>
      ) : placements.length === 0 ? (
        <p className="text-sm text-ink/60">No placements yet — add one above.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {placements.map((placement) => (
            <div
              key={placement.id}
              className="flex items-center justify-between gap-3 rounded-2xl bg-white p-4 shadow-soft"
            >
              {editingId === placement.id ? (
                <input
                  value={editingName}
                  onChange={(e) => setEditingName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && saveEdit(placement.id)}
                  autoFocus
                  className="flex-1 rounded-lg border hairline bg-white px-3 py-1.5 text-sm"
                />
              ) : (
                <div>
                  <p className="text-sm font-semibold">{placement.name}</p>
                  <p className="text-xs text-ink/50">{placement.slug}</p>
                </div>
              )}
              <div className="flex gap-3 text-xs font-medium">
                {editingId === placement.id ? (
                  <>
                    <button
                      onClick={() => saveEdit(placement.id)}
                      disabled={busyId === placement.id}
                      className="text-ink/70 hover:text-ink"
                    >
                      Save
                    </button>
                    <button onClick={() => setEditingId(null)} className="text-ink/50">
                      Cancel
                    </button>
                  </>
                ) : (
                  <>
                    <button onClick={() => startEdit(placement)} className="text-ink/70 hover:text-ink">
                      Rename
                    </button>
                    <button
                      onClick={() => remove(placement)}
                      disabled={busyId === placement.id}
                      className="flex items-center gap-1 text-sale disabled:opacity-60"
                    >
                      <Trash2 size={13} /> Delete
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function AdminCategoriesPage() {
  const [tab, setTab] = useState<"categories" | "placements">("categories");

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Categories</h1>
      </div>

      <div className="flex gap-2 border-b hairline">
        <button
          onClick={() => setTab("categories")}
          className={`px-4 py-2.5 text-sm font-semibold transition-colors ${
            tab === "categories" ? "border-b-2 border-signal text-ink" : "text-ink/50 hover:text-ink"
          }`}
        >
          Categories
        </button>
        <button
          onClick={() => setTab("placements")}
          className={`px-4 py-2.5 text-sm font-semibold transition-colors ${
            tab === "placements" ? "border-b-2 border-signal text-ink" : "text-ink/50 hover:text-ink"
          }`}
        >
          Placements
        </button>
      </div>

      {tab === "categories" ? <CategoriesTab /> : <PlacementsTab />}
    </div>
  );
}
