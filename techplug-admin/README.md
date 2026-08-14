# TechPlug Kenya — Storefront & Admin

Customer-facing storefront and admin panel for TechPlug Kenya, an electronics retailer
(phones, laptops, TVs, audio, gaming, accessories). Built with Next.js (App Router) +
TypeScript + Tailwind CSS, backed by the `techplug-api` Express/MongoDB service in the
sibling project.

**This is not frontend-only.** Product/category/order data lives in MongoDB via
`techplug-api`, auth is Firebase, and checkout processes real M-Pesa Till Number payments
through Safaricom's Daraja STK push. Run `techplug-api` alongside this project for the app
to be fully functional (see its README/`.env.example` for setup).

## Getting started

```bash
npm install
npm run dev
```

Visit http://localhost:3000. You'll need `techplug-api` running (default
`http://localhost:4000`) and `NEXT_PUBLIC_API_URL`/Firebase env vars set — see
`.env.example` if present, or `src/lib/api.ts` and `src/lib/firebase.ts` for the expected
variables.

## What's built

- **Home** (`/`) — hero bento, "Shop By Category", best sellers grid, newsletter signup
- **Category listing** (`/category/[slug]`) — product grid with a filter bar (Brand /
  Price / Color, wired to real product data)
- **Product detail** (`/product/[slug]`) — image gallery, color selector, specs/warranty
  display, add-to-bag, trust badges, related products
- **Cart** — slide-in drawer, editable quantities, free-shipping progress bar, persists
  via `localStorage` (`techplug-cart`)
- **Checkout** (`/checkout`) — guest-first, M-Pesa Till Number payment via STK push
- **Wishlist** (`/wishlist`) — persists via `localStorage` (`techplug-wishlist`)
- **Account** (`/account`) — placeholder page
- **Admin panel** (`/ad-techplugke`) — products (incl. CSV import/export, bulk edit),
  categories, orders, customers, marketing (deal-of-month emails, placements), settings
  (shop name/logo). Gated to users with `isAdmin`/`isSuperAdmin` via Firebase custom
  claims (`techplug-api/src/scripts/makeAdmin.ts` grants these).
- Sticky header with a mega-menu driven by `navCategories` in `src/lib/data.ts`
- Floating WhatsApp contact button

## Design system

Tokens live in `src/app/globals.css` (dark blue and white theme):
- **Ink** `#0b1120` — primary dark surface (header, category section, footer)
- **Cream** `#f7f9fc` — body background (near-white)
- **Signal (blue)** `#2563eb` — primary CTA accent
- **Royal** `#1e3a8a` — secondary accent (Buy Now button, badges)
- **Leather** `#475569` — trust badge accent (slate)
- **Sale (red)** `#c8442f` — discount/error states

Font is Plus Jakarta Sans, self-hosted via `next/font/google`, exposed as
`--font-jakarta` and mapped to both `--font-sans`/`--font-display` in `globals.css`.

## Known placeholders to swap before launch

1. **Images** — all product/category images use `picsum.photos`/`images.unsplash.com`
   seeded placeholders. Replace with real photography (uploaded via the admin panel) and
   update `next.config.ts`'s `remotePatterns` to your actual image host/CDN if it changes.
2. **WhatsApp numbers** — `src/components/WhatsAppButton.tsx`, `Header.tsx`, `Footer.tsx`
3. **Logo/favicon** — `public/logo.png`, `src/app/icon.png`
4. **M-Pesa Till Number** (`8744842`) — carried over from the previous brand, unconfirmed
5. **Social links** — `Footer.tsx` currently links to `#`

## Project structure

```
src/
  app/
    page.tsx                 home
    category/[slug]/         listing page
    product/[slug]/          product detail
    checkout/                checkout
    wishlist/                wishlist
    account/                 account placeholder
    ad-techplugke/           admin panel (products, categories, orders, customers,
                              marketing, settings)
  components/                UI components (storefront + components/admin/)
  context/
    CartContext.tsx           cart state, localStorage-persisted
    WishlistContext.tsx        wishlist state, localStorage-persisted
    AuthContext.tsx            Firebase auth + isAdmin/isSuperAdmin
  lib/
    types.ts                  Product, Category, CartLine types
    data.ts                   static category/nav taxonomy + hero copy
    products.ts, categories.ts, api.ts (etc.)  API fetch helpers
    format.ts                  currency formatting (KES)
```
