"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";

type WishlistContextValue = {
  productIds: string[];
  has: (productId: string) => boolean;
  toggle: (productId: string) => void;
  pruneToExisting: (existingIds: string[]) => void;
};

const WishlistContext = createContext<WishlistContextValue | undefined>(undefined);
const STORAGE_KEY = "techplug-wishlist";

export function WishlistProvider({ children }: { children: React.ReactNode }) {
  const [productIds, setProductIds] = useState<string[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) setProductIds(JSON.parse(raw));
    } catch {
      // ignore malformed storage
    } finally {
      setHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(productIds));
    } catch {
      // Storage unavailable (private browsing, quota exceeded) — wishlist still works for
      // this session via in-memory state, it just won't persist across reloads.
    }
  }, [productIds, hydrated]);

  useEffect(() => {
    function handleStorage(e: StorageEvent) {
      if (e.key !== STORAGE_KEY) return;
      try {
        setProductIds(e.newValue ? JSON.parse(e.newValue) : []);
      } catch {
        // ignore malformed storage from the other tab
      }
    }
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  const has = useCallback((productId: string) => productIds.includes(productId), [productIds]);

  const toggle = useCallback((productId: string) => {
    setProductIds((prev) =>
      prev.includes(productId) ? prev.filter((id) => id !== productId) : [...prev, productId]
    );
  }, []);

  // Drops wishlist entries for products that no longer exist (e.g. deleted from the
  // catalog) — called after fetching wishlist products, using the ids that actually resolved.
  const pruneToExisting = useCallback((existingIds: string[]) => {
    const existing = new Set(existingIds);
    setProductIds((prev) => prev.filter((id) => existing.has(id)));
  }, []);

  return (
    <WishlistContext.Provider value={{ productIds, has, toggle, pruneToExisting }}>
      {children}
    </WishlistContext.Provider>
  );
}

export function useWishlist() {
  const ctx = useContext(WishlistContext);
  if (!ctx) throw new Error("useWishlist must be used within WishlistProvider");
  return ctx;
}
