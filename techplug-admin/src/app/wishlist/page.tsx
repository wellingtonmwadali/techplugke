"use client";

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { useEffect, useState } from "react";
import { useWishlist } from "@/context/WishlistContext";
import { getProducts } from "@/lib/products";
import ProductCard from "@/components/ProductCard";
import type { Product } from "@/lib/types";

export default function WishlistPage() {
  const { productIds, pruneToExisting } = useWishlist();
  const [products, setProducts] = useState<Product[] | null>(null);

  useEffect(() => {
    if (productIds.length === 0) {
      setProducts([]);
      return;
    }
    getProducts({ ids: productIds }).then((results) => {
      setProducts(results);
      if (results.length < productIds.length) {
        pruneToExisting(results.map((p) => p.id));
      }
    });
    // pruneToExisting is stable (useCallback with no deps) — omitting it avoids a loop where
    // pruning triggers this effect again via the productIds it depends on.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productIds]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="font-bold tracking-tight text-3xl">Wishlist</h1>

      {!products ? (
        <p className="mt-6 text-sm text-ink/60">Loading…</p>
      ) : products.length === 0 ? (
        <div className="mt-16 text-center">
          <p className="font-bold tracking-tight text-xl">Nothing saved yet</p>
          <p className="mt-2 text-sm text-ink/60">Tap the heart on any product to save it here.</p>
          <Link
            href="/"
            className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-signal px-6 py-2.5 text-sm font-semibold text-ink shadow-soft transition hover:brightness-95"
          >
            Start shopping <ArrowUpRight size={16} />
          </Link>
        </div>
      ) : (
        <div className="mt-8 grid grid-cols-2 gap-x-5 gap-y-10 sm:grid-cols-3 lg:grid-cols-4">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </div>
  );
}
