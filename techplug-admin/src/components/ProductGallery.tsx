"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight, X, ZoomIn } from "lucide-react";
import { Product } from "@/lib/types";

export default function ProductGallery({ product }: { product: Product }) {
  const [active, setActive] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  useEffect(() => {
    if (!lightboxOpen) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setLightboxOpen(false);
      if (e.key === "ArrowLeft") setActive((i) => (i - 1 + product.images.length) % product.images.length);
      if (e.key === "ArrowRight") setActive((i) => (i + 1) % product.images.length);
    }
    document.addEventListener("keydown", handleKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKey);
      document.body.style.overflow = "";
    };
  }, [lightboxOpen, product.images.length]);

  return (
    <div className="flex flex-col gap-3">
      <button
        onClick={() => setLightboxOpen(true)}
        aria-label="Open full-size image"
        className="group relative aspect-square overflow-hidden rounded-3xl bg-[#F8F8F6] p-8 shadow-soft transition-all hover:shadow-lg"
      >
        <motion.div whileHover={{ scale: 1.04 }} transition={{ duration: 0.3 }} className="relative h-full w-full">
          <Image
            src={product.images[active]}
            alt={product.name}
            fill
            className="object-contain drop-shadow-xl"
            priority
          />
        </motion.div>
        <span className="absolute bottom-3 right-3 flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-ink opacity-0 shadow-soft transition-opacity group-hover:opacity-100">
          <ZoomIn size={18} />
        </span>
      </button>
      {product.images.length > 1 && (
        <div className="flex gap-3">
          {product.images.map((img, i) => (
            <button
              key={img}
              onClick={() => setActive(i)}
              aria-label={`Show image ${i + 1}`}
              className={`relative h-20 w-20 overflow-hidden rounded-2xl border-2 bg-[#F8F8F6] p-2 ${
                active === i ? "border-signal" : "border-transparent"
              }`}
            >
              <Image src={img} alt="" fill className="object-contain p-1" />
            </button>
          ))}
        </div>
      )}

      {lightboxOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`${product.name} image ${active + 1} of ${product.images.length}`}
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink/95 p-4"
        >
          <button
            onClick={() => setLightboxOpen(false)}
            aria-label="Close"
            className="absolute right-4 top-4 flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
          >
            <X size={22} />
          </button>

          {product.images.length > 1 && (
            <>
              <button
                onClick={() => setActive((i) => (i - 1 + product.images.length) % product.images.length)}
                aria-label="Previous image"
                className="absolute left-4 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
              >
                <ChevronLeft size={24} />
              </button>
              <button
                onClick={() => setActive((i) => (i + 1) % product.images.length)}
                aria-label="Next image"
                className="absolute right-4 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
              >
                <ChevronRight size={24} />
              </button>
            </>
          )}

          <div className="relative h-full max-h-[80vh] w-full max-w-3xl">
            <Image src={product.images[active]} alt={product.name} fill className="object-contain" />
          </div>
        </div>
      )}
    </div>
  );
}
