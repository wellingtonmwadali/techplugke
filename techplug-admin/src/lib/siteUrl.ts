// Public storefront origin — used to build absolute canonical/OG URLs and the sitemap.
// Distinct from NEXT_PUBLIC_API_URL (the backend). Set NEXT_PUBLIC_SITE_URL in production to
// the real storefront domain once one exists (see CLAUDE.md's pre-launch placeholder notes).
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/+$/, "");
