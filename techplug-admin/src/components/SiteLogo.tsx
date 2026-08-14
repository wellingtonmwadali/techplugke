"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { getPublicSettings } from "@/lib/settings";

// Shared between Header and Footer so both always render the same logo — sourced from Settings
// (admin-uploaded, see ad-techplugke/settings) with a fallback to the static /logo.png shipped in
// the storefront when no custom logo has been uploaded yet.
export default function SiteLogo({ className = "" }: { className?: string }) {
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [shopName, setShopName] = useState("TechPlug Kenya");

  useEffect(() => {
    getPublicSettings()
      .then((s) => {
        setShopName(s.shopName || "TechPlug Kenya");
        setLogoUrl(s.logoUrl || null);
      })
      .catch(() => {});
  }, []);

  return (
    <Link href="/" aria-label={shopName} className={`shrink-0 ${className}`}>
      <Image
        src={logoUrl || "/logo.png"}
        alt={shopName}
        width={160}
        height={160}
        unoptimized={!!logoUrl}
        className="h-9 w-auto object-contain"
      />
    </Link>
  );
}
