"use client";

import Link from "next/link";
import Image from "next/image";
import { X, Minus, Plus, Trash2, ArrowUpRight } from "lucide-react";
import { useCart } from "@/context/CartContext";
import { formatKes } from "@/lib/format";
import { describeVariantOptions, resolvePrice } from "@/lib/variants";

const FREE_SHIPPING_THRESHOLD = 5000;

export default function CartDrawer() {
  const { lines, isOpen, closeCart, updateQuantity, removeItem, subtotal, getProduct } = useCart();

  const remaining = Math.max(0, FREE_SHIPPING_THRESHOLD - subtotal);
  const progress = Math.min(100, (subtotal / FREE_SHIPPING_THRESHOLD) * 100);

  return (
    <div
      className={`fixed inset-0 z-50 transition-opacity ${
        isOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
      }`}
      aria-hidden={!isOpen}
    >
      <div className="absolute inset-0 bg-ink/50" onClick={closeCart} />
      <div
        className={`absolute right-0 top-0 flex h-full w-full max-w-md flex-col rounded-l-3xl bg-white shadow-soft transition-transform duration-300 ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between border-b hairline px-5 py-4">
          <h2 className="font-semibold text-lg">Your bag ({lines.length})</h2>
          <button
            aria-label="Close cart"
            onClick={closeCart}
            className="flex h-11 w-11 items-center justify-center -mr-2.5"
          >
            <X size={22} />
          </button>
        </div>

        {lines.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
            <p className="font-bold tracking-tight text-xl">Your bag is empty</p>
            <p className="text-sm text-ink/60">Add a pair and it&apos;ll show up here.</p>
            <Link
              href="/"
              onClick={closeCart}
              className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-signal px-6 py-2 text-sm font-semibold text-ink shadow-soft transition hover:brightness-95"
            >
              Start shopping <ArrowUpRight size={16} />
            </Link>
          </div>
        ) : (
          <>
            <div className="border-b hairline px-5 py-3">
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-line">
                <div
                  className="h-full rounded-full bg-signal transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="mt-2 text-xs text-ink/70">
                {remaining > 0
                  ? `${formatKes(remaining)} away from free shipping`
                  : "You've unlocked free shipping"}
              </p>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4">
              <ul className="flex flex-col gap-5">
                {lines.map((line) => {
                  const product = getProduct(line.productId);
                  if (!product) return null;
                  return (
                    <li
                      key={`${line.productId}-${line.color}-${describeVariantOptions(line.variantOptions)}`}
                      className="flex gap-4 rounded-2xl bg-cream/60 p-3"
                    >
                      <div className="relative h-24 w-20 shrink-0 overflow-hidden rounded-xl bg-white">
                        <Image src={product.images[0]} alt={product.name} fill className="object-cover" />
                      </div>
                      <div className="flex flex-1 flex-col">
                        <div className="flex justify-between gap-2">
                          <p className="text-sm font-medium leading-tight">{product.name}</p>
                          <button
                            aria-label="Remove item"
                            onClick={() => removeItem(line.productId, line.color, line.variantOptions)}
                            className="flex h-9 w-9 items-center justify-center -mr-2 -mt-1 text-ink/40 hover:text-sale"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                        <p className="text-xs text-ink/60">
                          {[line.color, describeVariantOptions(line.variantOptions)].filter(Boolean).join(" · ")}
                        </p>
                        <div className="mt-auto flex items-center justify-between">
                          <div className="flex items-center gap-3 rounded-full border hairline bg-white px-2 py-1">
                            <button
                              aria-label="Decrease quantity"
                              onClick={() =>
                                updateQuantity(line.productId, line.color, line.variantOptions, line.quantity - 1)
                              }
                              className="flex h-8 w-8 items-center justify-center"
                            >
                              <Minus size={14} />
                            </button>
                            <span className="w-4 text-center text-sm">{line.quantity}</span>
                            <button
                              aria-label="Increase quantity"
                              onClick={() =>
                                updateQuantity(line.productId, line.color, line.variantOptions, line.quantity + 1)
                              }
                              className="flex h-8 w-8 items-center justify-center"
                            >
                              <Plus size={14} />
                            </button>
                          </div>
                          <p className="text-sm font-medium">
                            {formatKes(resolvePrice(product, line.variantOptions) * line.quantity)}
                          </p>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>

            <div className="border-t hairline px-5 py-4">
              <div className="mb-4 flex items-center justify-between text-sm">
                <span className="text-ink/70">Subtotal</span>
                <span className="font-semibold text-lg">{formatKes(subtotal)}</span>
              </div>
              <Link
                href="/checkout"
                onClick={closeCart}
                className="block w-full rounded-full bg-signal py-3 text-center text-sm font-semibold text-ink hover:brightness-95 transition"
              >
                Checkout
              </Link>
              <p className="mt-2 text-center text-xs text-ink/50">Shipping and taxes calculated at checkout</p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
