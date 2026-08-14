# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository layout

This repo contains two projects for **TechPlug Kenya**, an electronics retailer:

- `techplug-admin/` — Next.js app serving both the **customer-facing storefront** (`/`,
  `/category/[slug]`, `/product/[slug]`, `/checkout`, `/account`, `/wishlist`) and the
  **admin panel**, mounted at `/ad-techplugke` (products, categories, orders, customers,
  marketing, settings). `package.json` name is `techplug-admin`.
- `techplug-api/` — Express + MongoDB (Mongoose) backend. `package.json` name is
  `techplug-api`.

## Commands

```bash
# Backend
cd techplug-api
npm install
npm run dev            # nodemon + tsx, http://localhost:4000
npm run build           # tsc -> dist/
npm run start           # node dist/index.js
npm run seed-categories  # seed Category collection (idempotent)
npm run seed             # placeholder — catalog is populated via the admin panel, not seeded
npm run make-admin       # promote a Firebase user to admin/super_admin

# Frontend
cd techplug-admin
npm install
npm run dev      # start dev server at http://localhost:3000
npm run build    # production build
npm run start    # serve production build
npm run lint     # eslint (eslint-config-next core-web-vitals + typescript)
```

There is no test suite configured in either project.

## Architecture

**Real backend, not static mock data.** `techplug-api` is an Express/Mongoose service
backed by MongoDB Atlas (`dbName: "techplug"`, set in `techplug-api/src/db/mongoose.ts`).
Auth is Firebase (`FIREBASE_*` env vars, `techplug-admin/src/lib/firebase.ts` +
`techplug-api/src/middleware/authenticate.ts`). Checkout accepts real M-Pesa Till Number
payments via Safaricom's Daraja STK push (`techplug-api/src/routes/payments.ts`,
`techplug-admin/src/components/MpesaCheckoutModal.tsx`) — this is not a mock confirmation
flow.

- `techplug-admin/src/app/` — Next.js App Router routes. Storefront routes live at the
  top level; the whole admin panel lives under `src/app/ad-techplugke/` and is gated by
  `useAuth().isAdmin` in `ad-techplugke/layout.tsx` (redirects to `/` otherwise).
- `techplug-admin/src/context/CartContext.tsx` — cart state via React context, persisted
  to `localStorage` under key `techplug-cart`. Cart lines are keyed by
  `(productId, color)` — there is no shoe-style "size" concept; electronics variants are
  a plain `colors: string[]` array plus free-text `specs`/`warranty` fields on `Product`.
  `useCart()` must be called within `CartProvider` (wraps the whole app in `layout.tsx`)
  or it throws. `WishlistContext.tsx` follows the same pattern under
  `techplug-wishlist`.
- `techplug-admin/src/lib/data.ts` — static category/nav taxonomy and homepage hero
  slide copy (Phones & Tablets, Laptops & Computers, TV & Home Entertainment, Audio,
  Gaming, Accessories). Actual product data lives in MongoDB — see
  `techplug-admin/src/lib/products.ts` for fetch helpers hitting `techplug-api`.
- `techplug-admin/src/lib/types.ts` — `Category`, `Product`, `CartLine` types, mirroring
  `techplug-api/src/models/`.
- `techplug-api/src/models/Product.ts` — `brand`, `price`, `categorySlugs`, `images`,
  `colors`, `specs`, `warranty`, `description`, `stockQuantity` (drives the `inStock`
  virtual), `badges`, `placements`. No shoe-style `sizes` field.
- `techplug-api/src/routes/` — one router per resource (`products`, `categories`,
  `orders`, `payments`, `users`, `team`, `settings`, `marketing`, `placements`, `auth`).
  Admin-only routes are gated with `authenticate` + `requireAdmin` middleware.
- `techplug-admin/src/components/` — UI components (cart drawer, product gallery, category
  filter bar, etc.). `CategoryProductGrid`'s filter bar is Brand / Price / Color (wired to
  real product data, unlike a placeholder).

### Fonts

`techplug-admin/src/app/layout.tsx` loads Plus Jakarta Sans via `next/font/google`
(self-hosted) and exposes it as `--font-jakarta`; `globals.css` maps both `--font-sans`
and `--font-display` to it.

### Design tokens

Defined in `techplug-admin/src/app/globals.css` (soft-UI / bento layout, dark-blue-and-white
theme):
- Ink `#0b1120` — primary dark surface (header, category section, footer), text color
- Cream `#f7f9fc` — body background (near-white)
- Signal (blue) `#2563eb` — primary CTA accent
- Royal `#1e3a8a` — secondary accent (Buy Now button, badges, avatar-count pill)
- Leather `#475569` — trust badge accent (slate, despite the token name — kept for
  minimal diff against the original soft-UI token set)
- Sale (red) `#c8442f` — discount/error states
- `.shadow-soft` utility (`--shadow-soft`) — the soft drop-shadow used on all rounded-3xl
  cards; prefer it over ad hoc `shadow-*` utilities for new cards.

### Known placeholders to swap before launch

- Images use `picsum.photos`/`images.unsplash.com` seeded placeholders;
  `next.config.ts`'s `images.remotePatterns` is scoped to those hosts and will need
  updating for a real image host/CDN once real product photography is uploaded via the
  admin panel.
- `public/logo.png` and `src/app/icon.png` are still generic placeholders — need real
  TechPlug Kenya logo/favicon assets.
- M-Pesa Till Number (`8744842`, referenced in `Footer.tsx`, `Header.tsx`,
  `MpesaCheckoutModal.tsx`) is unconfirmed — carried over from the previous brand and
  needs verifying before launch.
- Social links in `Footer.tsx` are `href="#"` placeholders.
- Home page hero (`src/components/HeroBento.tsx`) "5,000+ happy customers" / "4.6 average
  rating" social-proof card — fabricated marketing copy, not backed by real review/customer
  data. Replace once real testimonials/review data exists.
- `ProductCard`'s star rating (`src/components/ProductCard.tsx`, `placeholderRating()`) is a
  deterministic hash of the product id, not a real rating — there is no rating field in the
  `Product` type or API. Replace once a real ratings/reviews backend exists.
- `techplug-api/.env.example` contains a real (uncredentialed-looking but live)
  MongoDB Atlas connection string rather than a placeholder — treat it as compromised,
  rotate the credential in Atlas, and scrub it from the file and git history before this
  repo is shared or made public.
- The product catalog is intentionally empty out of the box — `techplug-api/src/scripts/seed.ts`
  no longer seeds sample products (electronics catalog is entered via the
  `/ad-techplugke` admin panel). `seed-categories` still seeds the structural category
  taxonomy since nav/filtering code depends on categories existing.
