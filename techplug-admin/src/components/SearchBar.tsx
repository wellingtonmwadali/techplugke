"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Search } from "lucide-react";
import { getProducts } from "@/lib/products";
import { formatKes } from "@/lib/format";
import type { Product } from "@/lib/types";

export default function SearchBar() {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<Product[]>([]);
  const [open, setOpen] = useState(false);
  const requestIdRef = useRef(0);

  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      setSuggestions([]);
      return;
    }
    const timeout = setTimeout(() => {
      const requestId = ++requestIdRef.current;
      getProducts({ search: trimmed }).then((results) => {
        // Ignore this response if a newer request has been issued since — rapid typing can
        // otherwise let an earlier (slower) request resolve after a later one and clobber it.
        if (requestId !== requestIdRef.current) return;
        setSuggestions(results.slice(0, 5));
        setOpen(true);
      });
    }, 250);
    return () => clearTimeout(timeout);
  }, [query]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function goToResults() {
    const trimmed = query.trim();
    if (!trimmed) return;
    setOpen(false);
    router.push(`/search?q=${encodeURIComponent(trimmed)}`);
  }

  return (
    <div ref={containerRef} className="relative hidden flex-1 lg:block">
      <form
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          goToResults();
        }}
        className="flex items-center rounded-full bg-cream"
      >
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => query.trim() && setOpen(true)}
          placeholder="Search phones, laptops, brands and categories"
          aria-label="Search"
          autoComplete="off"
          className="w-full bg-transparent px-5 py-2.5 text-sm outline-none placeholder:text-ink/40"
        />
        <button
          type="submit"
          aria-label="Search"
          className="flex h-10 w-12 shrink-0 items-center justify-center rounded-full bg-signal text-ink mr-1"
        >
          <Search size={18} />
        </button>
      </form>

      {open && suggestions.length > 0 && (
        <div
          role="listbox"
          className="absolute left-0 right-0 top-full z-30 mt-2 rounded-2xl bg-white py-2 shadow-soft"
        >
          {suggestions.map((product) => (
            <Link
              key={product.id}
              href={`/product/${product.slug}`}
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 px-4 py-2 hover:bg-cream"
            >
              <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-md bg-cream">
                <Image src={product.images[0]} alt="" fill className="object-cover" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{product.name}</p>
                <p className="text-xs text-ink/60">{formatKes(product.price)}</p>
              </div>
            </Link>
          ))}
          <button
            onClick={goToResults}
            className="block w-full px-4 py-2 text-left text-sm font-medium text-signal hover:bg-cream"
          >
            See all results for &ldquo;{query}&rdquo;
          </button>
        </div>
      )}
    </div>
  );
}
