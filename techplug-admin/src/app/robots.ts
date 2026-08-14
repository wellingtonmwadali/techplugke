import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/siteUrl";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // /ad-techplugke is the admin panel (despite the app's directory name, this project is the
      // storefront) — no SEO value and shouldn't be crawlable. /checkout, /account, /wishlist
      // are per-visitor/auth-gated with no indexable content either.
      disallow: ["/ad-techplugke/", "/checkout", "/account", "/wishlist"],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
