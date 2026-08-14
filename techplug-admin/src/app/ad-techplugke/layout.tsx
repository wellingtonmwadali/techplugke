"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

const NAV_ITEMS = [
  { href: "/ad-techplugke/products", label: "Products" },
  { href: "/ad-techplugke/categories", label: "Categories" },
  { href: "/ad-techplugke/orders", label: "Orders" },
  { href: "/ad-techplugke/customers", label: "Customers" },
  { href: "/ad-techplugke/marketing", label: "Marketing" },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user, loading, isAdmin, isSuperAdmin } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (!loading && (!user || !isAdmin)) {
      router.push("/");
    }
  }, [loading, user, isAdmin, router]);

  if (loading || !user || !isAdmin) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center gap-4 px-4 py-24 text-center">
        <p className="text-sm text-ink/60">Loading…</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8 flex items-center justify-between gap-4">
        <Link href="/ad-techplugke" className="shrink-0 font-display text-2xl italic">
          TechPlug Admin
        </Link>

        {/* Full nav on large screens; collapses to a drawer below lg since 6-7 links plus
            "View store" don't fit a single row on tablet/mobile widths. */}
        <nav className="hidden items-center gap-6 text-sm font-medium lg:flex">
          {NAV_ITEMS.map((item) => (
            <Link key={item.href} href={item.href} className="hover:text-signal transition-colors">
              {item.label}
            </Link>
          ))}
          {isSuperAdmin && (
            <Link href="/ad-techplugke/settings" className="hover:text-signal transition-colors">
              Settings
            </Link>
          )}
          <Link
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-ink/60 hover:text-signal transition-colors"
          >
            View store
          </Link>
        </nav>

        <button
          className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-cream transition-colors lg:hidden"
          aria-label="Open menu"
          onClick={() => setMobileOpen(true)}
        >
          <Menu size={22} />
        </button>
      </div>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-ink/60" onClick={() => setMobileOpen(false)} />
          <div className="absolute right-0 top-0 h-full w-72 max-w-[85%] overflow-y-auto bg-white p-6 shadow-soft">
            <div className="mb-8 flex items-center justify-between">
              <span className="font-display text-xl italic">TechPlug Admin</span>
              <button
                aria-label="Close menu"
                onClick={() => setMobileOpen(false)}
                className="flex h-10 w-10 items-center justify-center"
              >
                <X size={22} />
              </button>
            </div>
            <nav className="flex flex-col gap-1 text-sm font-medium">
              {NAV_ITEMS.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className="rounded-xl px-3 py-3 hover:bg-cream transition-colors"
                >
                  {item.label}
                </Link>
              ))}
              {isSuperAdmin && (
                <Link
                  href="/ad-techplugke/settings"
                  onClick={() => setMobileOpen(false)}
                  className="rounded-xl px-3 py-3 hover:bg-cream transition-colors"
                >
                  Settings
                </Link>
              )}
              <Link
                href="/"
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setMobileOpen(false)}
                className="rounded-xl px-3 py-3 text-ink/60 hover:bg-cream transition-colors"
              >
                View store
              </Link>
            </nav>
          </div>
        </div>
      )}

      {children}
    </div>
  );
}
