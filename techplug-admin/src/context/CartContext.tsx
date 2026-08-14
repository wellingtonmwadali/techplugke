"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { CartLine, Product } from "@/lib/types";
import { getProducts } from "@/lib/products";

type CartContextValue = {
  lines: CartLine[];
  isOpen: boolean;
  openCart: () => void;
  closeCart: () => void;
  addItem: (product: Product, color: string, quantity?: number) => void;
  removeItem: (productId: string, color: string) => void;
  updateQuantity: (productId: string, color: string, quantity: number) => void;
  clearCart: () => void;
  getProduct: (productId: string) => Product | undefined;
  itemCount: number;
  subtotal: number;
};

const CartContext = createContext<CartContextValue | undefined>(undefined);
const STORAGE_KEY = "techplug-cart";

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [productsById, setProductsById] = useState<Record<string, Product>>({});

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) setLines(JSON.parse(raw));
    } catch {
      // ignore malformed storage
    } finally {
      setHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(lines));
    } catch {
      // Storage unavailable (private browsing, quota exceeded) — cart still works for
      // this session via in-memory state, it just won't persist across reloads.
    }
  }, [lines, hydrated]);

  useEffect(() => {
    function handleStorage(e: StorageEvent) {
      if (e.key !== STORAGE_KEY) return;
      try {
        setLines(e.newValue ? JSON.parse(e.newValue) : []);
      } catch {
        // ignore malformed storage from the other tab
      }
    }
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  useEffect(() => {
    const ids = Array.from(new Set(lines.map((l) => l.productId))).filter(
      (id) => !productsById[id]
    );
    if (ids.length === 0) return;

    getProducts({ ids })
      .then((fetched) => {
        setProductsById((prev) => {
          const next = { ...prev };
          for (const product of fetched) next[product.id] = product;
          return next;
        });
      })
      .catch(() => {
        // Network hiccup — those lines just stay unresolved until `lines` changes again
        // (e.g. adding another item) re-triggers this effect and retries them too.
      });
    // Only re-run when the set of cart line ids changes, not when productsById itself changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lines]);

  const addItem = useCallback(
    (product: Product, color: string, quantity = 1) => {
      setProductsById((prev) => ({ ...prev, [product.id]: product }));
      setLines((prev) => {
        const existing = prev.find(
          (l) => l.productId === product.id && l.color === color
        );
        if (existing) {
          return prev.map((l) =>
            l === existing ? { ...l, quantity: l.quantity + quantity } : l
          );
        }
        return [...prev, { productId: product.id, color, quantity }];
      });
      setIsOpen(true);
    },
    []
  );

  const removeItem = useCallback((productId: string, color: string) => {
    setLines((prev) =>
      prev.filter((l) => !(l.productId === productId && l.color === color))
    );
  }, []);

  const updateQuantity = useCallback(
    (productId: string, color: string, quantity: number) => {
      setLines((prev) =>
        prev
          .map((l) =>
            l.productId === productId && l.color === color
              ? { ...l, quantity }
              : l
          )
          .filter((l) => l.quantity > 0)
      );
    },
    []
  );

  const clearCart = useCallback(() => {
    setLines([]);
  }, []);

  const getProduct = useCallback((productId: string) => productsById[productId], [productsById]);

  const itemCount = useMemo(
    () =>
      lines.reduce((sum, l) => (productsById[l.productId] ? sum + l.quantity : sum), 0),
    [lines, productsById]
  );

  const subtotal = useMemo(() => {
    return lines.reduce((sum, l) => {
      const product = productsById[l.productId];
      return sum + (product ? product.price * l.quantity : 0);
    }, 0);
  }, [lines, productsById]);

  const value: CartContextValue = {
    lines,
    isOpen,
    openCart: () => setIsOpen(true),
    closeCart: () => setIsOpen(false),
    addItem,
    removeItem,
    updateQuantity,
    clearCart,
    getProduct,
    itemCount,
    subtotal,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
