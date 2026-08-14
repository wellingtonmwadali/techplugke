"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { Plus, Star } from "lucide-react";
import { Product } from "@/lib/types";
import { formatKes } from "@/lib/format";
import { useCart } from "@/context/CartContext";
import WishlistButton from "./WishlistButton";

// Deterministic placeholder rating (no rating field exists in the product schema/API yet).
// See CLAUDE.md "Known placeholders to swap before launch".
function placeholderRating(id: string) {
  const hash = id.split("").reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  return (4.2 + (hash % 9) / 10).toFixed(1);
}

export default function ProductCard({ product }: { product: Product }) {
  const { addItem } = useCart();
  const discount = product.compareAtPrice
    ? Math.round(100 - (product.price / product.compareAtPrice) * 100)
    : null;

  function handleQuickAdd(e: React.MouseEvent) {
    e.preventDefault();
    if (!product.inStock) return;
    addItem(product, product.colors[0] ?? "", 1);
  }

  return (
    <div className="group relative overflow-hidden rounded-3xl bg-white p-0 shadow-sm transition-shadow hover:shadow-lg">
      <Link href={`/product/${product.slug}`} className="block">
        {/* Full-bleed media area — image fills edge-to-edge, no inner padding wrapper */}
        <div className="relative aspect-square w-full overflow-hidden rounded-t-3xl">
          <motion.div whileHover={{ scale: 1.04 }} transition={{ duration: 0.3 }} className="relative h-full w-full">
            <Image
              src={product.images[0]}
              alt={product.name}
              fill
              className="h-full w-full object-cover"
              sizes="(min-width: 1024px) 22vw, (min-width: 640px) 45vw, 90vw"
            />
          </motion.div>

          {discount && (
            <span className="absolute top-3 left-3 z-10 rounded-full bg-sale px-2.5 py-1 text-[11px] font-semibold text-white shadow-soft">
              -{discount}%
            </span>
          )}
          {!product.inStock && (
            <span className="absolute bottom-3 left-3 z-10 rounded-full bg-white px-2.5 py-1 text-[11px] font-medium text-ink/60 shadow-soft">
              Out of stock
            </span>
          )}
          {product.inStock && (
            <button
              aria-label="Quick add to cart"
              onClick={handleQuickAdd}
              className="absolute bottom-3 right-3 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-signal text-ink opacity-0 shadow-soft transition-opacity duration-200 group-hover:opacity-100"
            >
              <Plus size={18} />
            </button>
          )}
        </div>

        {/* Meta — sits below the full-bleed image, owns its own padding */}
        <div className="space-y-1 rounded-b-3xl bg-white p-4">
          <p className="text-[11px] uppercase tracking-wide text-ink/50">{product.brand}</p>
          <p className="text-sm font-medium leading-snug line-clamp-2">{product.name}</p>
          <div className="flex items-center gap-1 text-xs text-ink/60">
            <Star size={12} className="fill-signal text-signal" />
            {placeholderRating(product.id)}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold">{formatKes(product.price)}</span>
            {product.compareAtPrice && (
              <span className="text-xs text-ink/40 line-through">{formatKes(product.compareAtPrice)}</span>
            )}
          </div>
        </div>
      </Link>

      <WishlistButton productId={product.id} />
    </div>
  );
}
