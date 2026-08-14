"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  Search,
  ShoppingBag,
  User,
  Menu,
  X,
  ChevronDown,
  ShieldCheck,
  Truck,
  Wallet,
  Phone,
  HelpCircle,
  ShieldHalf,
  Heart,
  ArrowUpRight,
} from "lucide-react";
import { sidebarCategories } from "@/lib/data";
import { useCart } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";
import { useWishlist } from "@/context/WishlistContext";
import CartDrawer from "./CartDrawer";
import SearchBar from "./SearchBar";
import SiteLogo from "./SiteLogo";

export default function Header() {
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const accountMenuRef = useRef<HTMLDivElement>(null);
  const { itemCount, openCart } = useCart();
  const { user, isAdmin, signOutUser } = useAuth();
  const { productIds: wishlistIds } = useWishlist();

  async function handleSignOut() {
    setAccountMenuOpen(false);
    await signOutUser();
    router.push("/");
  }

  useEffect(() => {
    if (!accountMenuOpen) return;

    function handleClickOutside(e: MouseEvent) {
      if (accountMenuRef.current && !accountMenuRef.current.contains(e.target as Node)) {
        setAccountMenuOpen(false);
      }
    }
    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape") setAccountMenuOpen(false);
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [accountMenuOpen]);

  return (
    <>
      <div className="hidden bg-cream pt-3 sm:block">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-6 rounded-full bg-signal px-6 py-2 text-xs font-semibold text-ink shadow-soft sm:px-8 lg:px-10">
          <div className="flex items-center gap-6">
            <span className="flex items-center gap-1.5">
              <ShieldCheck size={16} /> Quality Products
            </span>
            <span className="flex items-center gap-1.5">
              <Truck size={16} /> Countrywide Delivery
            </span>
            <span className="flex items-center gap-1.5">
              <Wallet size={16} /> Pay via Till: 8744842
            </span>
            <a href="tel:+254750032818" className="flex items-center gap-1.5 hover:underline">
              <Phone size={16} /> Call or WhatsApp 0750 032 818
            </a>
          </div>
          <Link
            href="/category/new"
            className="inline-flex items-center gap-1 rounded-full bg-ink px-4 py-1.5 text-white hover:brightness-110 transition"
          >
            Shop Now <ArrowUpRight size={14} />
          </Link>
        </div>
      </div>

      <div className="hidden bg-cream sm:block">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-1.5 text-xs text-ink/70 sm:px-6 lg:px-8">
          <Link href="/category/bulk-orders" className="hover:text-ink transition-colors">
            Bulk Orders
          </Link>
          <span className="uppercase tracking-wide text-ink/50">Walk with intention</span>
        </div>
      </div>

      <header className="sticky top-0 z-40 bg-cream px-3 pb-3 sm:px-4">
        <div className="mx-auto flex max-w-7xl items-center gap-4 rounded-3xl bg-white px-4 py-3 text-ink shadow-soft sm:px-6">
          <button
            className="flex h-11 w-11 items-center justify-center -ml-2.5 lg:hidden"
            aria-label="Open menu"
            onClick={() => setMobileOpen(true)}
          >
            <Menu size={24} />
          </button>

          <SiteLogo />

          <SearchBar />

          <div className="ml-auto flex items-center gap-2 shrink-0">
            <Link
              href="/search"
              aria-label="Search"
              className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-cream transition-colors lg:hidden"
            >
              <Search size={20} />
            </Link>
            {isAdmin && (
              <Link
                href="/ad-techplugke"
                className="hidden items-center gap-1 rounded-full px-3 py-2 text-sm font-medium hover:bg-cream transition-colors sm:flex"
              >
                <ShieldHalf size={20} />
                Admin
              </Link>
            )}
            <Link
              href="/wishlist"
              aria-label={`Wishlist, ${wishlistIds.length} items`}
              className="relative hidden h-10 w-10 items-center justify-center rounded-full hover:bg-cream transition-colors sm:flex"
            >
              <Heart size={20} />
              {wishlistIds.length > 0 && (
                <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-royal text-[10px] font-bold text-white shadow-soft">
                  {wishlistIds.length}
                </span>
              )}
            </Link>
            {user ? (
              <div className="relative hidden sm:block" ref={accountMenuRef}>
                <button
                  onClick={() => setAccountMenuOpen((open) => !open)}
                  aria-haspopup="menu"
                  aria-expanded={accountMenuOpen}
                  className="flex items-center gap-2 rounded-full py-1.5 pl-1.5 pr-3 text-sm font-medium hover:bg-cream transition-colors"
                >
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-ink text-xs font-semibold text-white">
                    {(user.displayName || user.email || "?").charAt(0).toUpperCase()}
                  </span>
                  {user.displayName?.split(" ")[0] || "Account"}
                  <ChevronDown size={14} />
                </button>
                {accountMenuOpen && (
                  <div
                    role="menu"
                    className="absolute right-0 top-full mt-2 min-w-[180px] rounded-2xl border border-line bg-white py-2 text-ink shadow-soft"
                  >
                    <Link
                      href="/account"
                      role="menuitem"
                      className="block px-4 py-2 text-sm hover:bg-cream"
                      onClick={() => setAccountMenuOpen(false)}
                    >
                      My Account
                    </Link>
                    <button
                      onClick={handleSignOut}
                      role="menuitem"
                      className="block w-full px-4 py-2 text-left text-sm hover:bg-cream"
                    >
                      Sign Out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Link
                href="/account"
                className="hidden items-center gap-2 rounded-full py-1.5 pl-1.5 pr-3 text-sm font-medium hover:bg-cream transition-colors sm:flex"
              >
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-ink text-white">
                  <User size={16} />
                </span>
                Account
                <ChevronDown size={14} />
              </Link>
            )}
            <Link
              href="#"
              className="hidden items-center gap-1 rounded-full px-3 py-2 text-sm font-medium hover:bg-cream transition-colors sm:flex"
            >
              <HelpCircle size={20} />
              Help
              <ChevronDown size={14} />
            </Link>
            <button
              aria-label={`Open cart, ${itemCount} items`}
              onClick={openCart}
              className="relative flex h-10 items-center gap-2 rounded-full bg-signal px-4 text-sm font-semibold text-ink shadow-soft hover:brightness-95 transition"
            >
              <ShoppingBag size={18} />
              <span className="hidden sm:inline">Cart</span>
              {itemCount > 0 && (
                <span className="absolute -top-2 -right-2 flex h-5 w-5 items-center justify-center rounded-full bg-royal text-[10px] font-bold text-white shadow-soft">
                  {itemCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-ink/60" onClick={() => setMobileOpen(false)} />
          <div className="absolute left-0 top-0 h-full w-80 max-w-[85%] rounded-r-3xl bg-white p-6 shadow-soft overflow-y-auto">
            <div className="flex items-center justify-between mb-8">
              <SiteLogo />
              <button
                aria-label="Close menu"
                onClick={() => setMobileOpen(false)}
                className="flex h-11 w-11 items-center justify-center -mr-2.5"
              >
                <X size={24} />
              </button>
            </div>
            <div className="mb-4 border-b border-line pb-4">
              {user ? (
                <div className="flex items-center justify-between">
                  <Link
                    href="/account"
                    className="text-sm font-medium"
                    onClick={() => setMobileOpen(false)}
                  >
                    {user.displayName?.split(" ")[0] || "My Account"}
                  </Link>
                  <button
                    onClick={() => {
                      setMobileOpen(false);
                      handleSignOut();
                    }}
                    className="text-sm text-ink/60 underline"
                  >
                    Sign Out
                  </button>
                </div>
              ) : (
                <Link
                  href="/account"
                  className="text-sm font-medium"
                  onClick={() => setMobileOpen(false)}
                >
                  Sign In / Create Account
                </Link>
              )}
              {isAdmin && (
                <Link
                  href="/ad-techplugke"
                  className="mt-2 flex items-center gap-1.5 text-sm font-medium text-signal"
                  onClick={() => setMobileOpen(false)}
                >
                  <ShieldHalf size={16} />
                  Admin panel
                </Link>
              )}
              <Link
                href="/wishlist"
                className="mt-2 flex items-center gap-1.5 text-sm font-medium"
                onClick={() => setMobileOpen(false)}
              >
                <Heart size={16} />
                Wishlist {wishlistIds.length > 0 && `(${wishlistIds.length})`}
              </Link>
            </div>
            <nav className="flex flex-col">
              {sidebarCategories.map((item) => (
                <Link
                  key={item.slug}
                  href={`/category/${item.slug}`}
                  className="border-b border-line py-3 text-sm font-medium"
                  onClick={() => setMobileOpen(false)}
                >
                  {item.name}
                </Link>
              ))}
            </nav>
          </div>
        </div>
      )}

      <CartDrawer />
    </>
  );
}
