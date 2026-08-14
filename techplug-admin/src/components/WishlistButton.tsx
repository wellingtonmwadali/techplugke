"use client";

import { Heart } from "lucide-react";
import { useWishlist } from "@/context/WishlistContext";

export default function WishlistButton({ productId }: { productId: string }) {
  const { has, toggle } = useWishlist();
  const wishlisted = has(productId);

  return (
    <button
      aria-label={wishlisted ? "Remove from wishlist" : "Add to wishlist"}
      aria-pressed={wishlisted}
      onClick={() => toggle(productId)}
      className="absolute top-2 right-2 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-white/90 shadow-sm"
    >
      <Heart size={16} fill={wishlisted ? "#c8442f" : "none"} color={wishlisted ? "#c8442f" : "#0a0a0a"} />
    </button>
  );
}
