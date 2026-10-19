# Decision log (brainstorming session, 2026-10-19)

| # | Decision |
|---|---|
| 1 | MVP built production-grade (demo data first, production later). |
| 2 | One app: storefront + admin `/admin` with login. |
| 3 | Custom backend and DB (no Shopify/Medusa/WooCommerce). |
| 4 | Category = product-type tree, one per product. Collection = marketing set, many per product. |
| 5 | Variants size × color, SKU + stock per variant, optional price override. |
| 6 | Sale page automatic from `compareAtPrice > price`, `-X%` badge. |
| 7 | Payment v1 cash on delivery; card (CMI) v2. |
| 8 | Guest checkout only; no customer accounts v1. |
| 9 | Currency MAD. Languages FR (default), AR, EN — all in v1 (updated in round 3). |
| 10 | Brand name and logo are placeholders in `site.config.ts`; real ones come later. |
| 11 | Font: Inter instead of commercial GT Standard; IBM Plex Sans Arabic for AR. |
| 12 | Keep kit structure; accent color is one token (violet default). |
| 13 | Nav: Nouveautés · Vêtements · Chaussures · Accessoires · Soldes · À propos. No Outlet/Beauty. |
| 14 | Men only v1; data model ready for Women. |
| 15 | Cart drawer + single-page checkout. |
| 16 | "Commander via WhatsApp" button on product page. |
| 17 | Shipping: flat fee + free threshold (admin), Morocco only, city list. |
| 18 | Brand name: placeholder for now. |
| 19 | Next.js 15 + TypeScript + Tailwind v4 + Prisma + PostgreSQL. |
| 20 | Local dev with Docker Postgres; hosting decided later. |
| 21 | Images local in dev behind `Storage` interface; S3/R2 later. |
| 22 | Admin: Auth.js credentials, multiple admins, single role, seeded first admin. |
| 23 | Order statuses NEW → CONFIRMED → SHIPPED → DELIVERED + CANCELLED/RETURNED; stock decrement on order, restore on cancel/return. |
| 24 | Phone required, email optional; admin email per order; customer email if given. No SMS/WhatsApp API. |
| 25 | Home: hero, category pills, Nouveautés, collections, Soldes, trust strip, newsletter. |
| 26 | Listing: size/color/price filters, sort, 24/page pagination, rich product card. |
| 27 | Product page: gallery, swatches, size buttons, size-guide modal, low stock ≤ 3, cart + WhatsApp CTAs, 8 related. |
| 28 | Promo codes v2. |
| 29 | Header search with live suggestions, DB-based. |
| 30 | `next-intl`, locale-prefixed URLs, `/`→`/fr`, hreflang, cookie, no auto-redirect. |
| 31 | Translated: UI + product/category/collection/color/banner/page/size guide content. Original: brand, SKU, sizes, third-party brands, customer data. |
| 32 | Admin FR/AR/EN tabs, FR required, FR fallback. AI translation v2. |
| 33 | Arabic full RTL, logical CSS, Latin digits. |
| 34 | Admin UI French only. |
| 35 | Code in `store/`; kit stays in `ui-ux/`. |
| 36 | Rules in `store/CLAUDE.md`; context in `store-dev` skill + references. |
| 37 | Rules, skill and code in English; customer text in FR/AR/EN. |

## originals.ma — what to copy / beat
Copy: Clothes/Shoes/Accessories taxonomy with deep subcategories, percentage badges + struck prices, out-of-stock on cards, size filter with counts, trust strip (free shipping threshold, 10-day exchange, 1–2 day delivery, COD), own-brand essentials and multipacks.
Beat: thin home page, hidden/missing sort, colors as separate products (we use swatches), size guide as gallery image (we use a modal), page-based cart (we use a drawer), no WhatsApp ordering, English only, vague shipping page, duplicated promotion category tree (our sale page is automatic).
