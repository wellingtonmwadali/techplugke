"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck, Truck, Tag, Cpu, Palette } from "lucide-react";
import { Product } from "@/lib/types";
import { formatKes } from "@/lib/format";
import { useCart } from "@/context/CartContext";
import { availableValuesFor, cheapestVariant, findVariant } from "@/lib/variants";

export default function ProductBuyBox({ product }: { product: Product }) {
  const [color, setColor] = useState<string | undefined>(product.colors[0]);
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>(() => {
    const cheapest = cheapestVariant(product);
    return cheapest ? { ...cheapest.options } : {};
  });
  const [added, setAdded] = useState(false);
  const { addItem } = useCart();
  const router = useRouter();

  const needsColor = product.colors.length > 0;
  const hasVariants = Boolean(product.variantOptions && product.variantOptions.length > 0);
  const activeVariant = hasVariants ? findVariant(product, selectedOptions) : undefined;
  // Every dimension needs a value chosen (and that combination needs a priced variant behind
  // it) before checkout — a partial selection like "RAM: 16GB" with Storage unset isn't
  // purchasable, since there's no single price for it.
  const variantComplete = !hasVariants || Boolean(activeVariant);

  const displayPrice = activeVariant?.price ?? product.price;
  const displayCompareAtPrice = activeVariant ? activeVariant.compareAtPrice : product.compareAtPrice;

  const canAdd =
    (!needsColor || color !== undefined) && variantComplete && product.inStock;

  function selectOption(name: string, value: string) {
    setSelectedOptions((prev) => {
      const next = { ...prev, [name]: value };
      // If that choice makes another dimension's current value impossible (e.g. picking
      // RAM: 8GB when the shopper had Storage: 512GB selected, but 8GB only ever ships with
      // 256GB), fall back that dimension to whatever's still available instead of leaving an
      // invalid combination on screen.
      for (const dim of product.variantOptions ?? []) {
        if (dim.name === name) continue;
        const available = availableValuesFor(product, dim.name, next);
        if (next[dim.name] && !available.includes(next[dim.name])) {
          next[dim.name] = available[0] ?? next[dim.name];
        }
      }
      return next;
    });
  }

  const handleAdd = () => {
    if (!canAdd) return;
    addItem(product, color ?? "", hasVariants ? selectedOptions : undefined, 1);
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  const handleBuyNow = () => {
    if (!canAdd) return;
    addItem(product, color ?? "", hasVariants ? selectedOptions : undefined, 1);
    router.push("/checkout");
  };

  const specs = [
    { icon: Tag, label: "Brand", value: product.brand ?? "—" },
    { icon: Cpu, label: "Specs", value: product.specs ?? "—" },
    { icon: Palette, label: "Colors", value: needsColor ? `${product.colors.length} options` : "—" },
    { icon: ShieldCheck, label: "Warranty", value: product.warranty ?? "—" },
  ];

  return (
    <div className="flex flex-col">
      <p className="text-xs uppercase tracking-wide text-ink/50">{product.brand}</p>
      <h1 className="mt-1 font-bold tracking-tight text-3xl">{product.name}</h1>

      <div className="mt-4 flex items-center gap-3">
        <span className="text-2xl font-semibold">{formatKes(displayPrice)}</span>
        {displayCompareAtPrice && (
          <span className="text-base text-ink/40 line-through">{formatKes(displayCompareAtPrice)}</span>
        )}
      </div>

      {product.badges && product.badges.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {product.badges.map((badge) => (
            <span key={badge} className="rounded-full bg-leather/10 px-3 py-1 text-xs font-medium text-leather">
              {badge}
            </span>
          ))}
        </div>
      )}

      <p className="mt-6 text-sm leading-relaxed text-ink/70">{product.description}</p>

      {needsColor && (
        <div className="mt-6">
          <p className="text-sm font-medium">Color: {color}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {product.colors.map((c) => (
              <button
                key={c}
                onClick={() => setColor(c)}
                className={`rounded-full border px-4 py-1.5 text-sm transition ${
                  color === c ? "border-ink bg-ink text-white" : "hairline hover:bg-cream"
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>
      )}

      {hasVariants &&
        product.variantOptions!.map((dimension) => {
          const available = availableValuesFor(product, dimension.name, selectedOptions);
          return (
            <div key={dimension.name} className="mt-6">
              <p className="text-sm font-medium">
                {dimension.name}
                {selectedOptions[dimension.name] ? `: ${selectedOptions[dimension.name]}` : ""}
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {dimension.values.map((value) => {
                  const isAvailable = available.includes(value);
                  const isSelected = selectedOptions[dimension.name] === value;
                  return (
                    <button
                      key={value}
                      onClick={() => isAvailable && selectOption(dimension.name, value)}
                      disabled={!isAvailable}
                      className={`rounded-full border px-4 py-1.5 text-sm transition ${
                        isSelected
                          ? "border-ink bg-ink text-white"
                          : isAvailable
                            ? "hairline hover:bg-cream"
                            : "hairline cursor-not-allowed text-ink/30 line-through"
                      }`}
                    >
                      {value}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}

      <div className="mt-8 grid grid-cols-2 gap-3">
        <button
          onClick={handleAdd}
          disabled={!canAdd}
          className="rounded-full bg-signal py-3.5 text-sm font-semibold text-ink shadow-soft transition hover:brightness-95 disabled:cursor-not-allowed disabled:bg-line disabled:text-ink/40 disabled:shadow-none"
        >
          {!product.inStock ? "Out of stock" : added ? "Added to bag" : "Add to bag"}
        </button>
        <button
          onClick={handleBuyNow}
          disabled={!canAdd}
          className="rounded-full bg-royal py-3.5 text-sm font-semibold text-white shadow-soft transition hover:brightness-110 disabled:cursor-not-allowed disabled:bg-line disabled:text-ink/40 disabled:shadow-none"
        >
          Buy now
        </button>
      </div>

      <div className="mt-8 grid grid-cols-2 gap-3">
        {specs.map(({ icon: Icon, label, value }) => (
          <div key={label} className="flex items-center gap-3 rounded-2xl bg-white p-4 shadow-soft">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-signal/40">
              <Icon size={16} />
            </span>
            <div>
              <p className="text-[11px] uppercase tracking-wide text-ink/50">{label}</p>
              <p className="text-sm font-medium">{value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 text-center text-xs text-ink/60">
        <div className="flex flex-col items-center gap-1.5 rounded-2xl bg-white p-4 shadow-soft">
          <ShieldCheck size={18} />
          Genuine product
        </div>
        <div className="flex flex-col items-center gap-1.5 rounded-2xl bg-white p-4 shadow-soft">
          <Truck size={18} />
          Countrywide delivery
        </div>
      </div>
    </div>
  );
}
