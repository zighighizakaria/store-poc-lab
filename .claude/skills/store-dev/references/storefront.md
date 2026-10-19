# Storefront pages

Inspiration: originals.ma (WooCommerce). Copy its structure and taxonomy, fix its weak points. Style always from the kit (see `design-system.md`).

## Header (sticky)
Logo (from `site.config.ts`) · main nav · search pill · language switcher (FR/AR/EN) · cart icon with count.
Main nav: **Nouveautés · Vêtements · Chaussures · Accessoires · Soldes · À propos**. Vêtements/Chaussures/Accessoires open a mega-menu listing subcategories (+ "Voir tout"). Mobile: burger → full-height drawer with accordion categories.
Search: kit search pill with accent submit; live suggestions (debounced, top 6 products with image + price) from DB name/description search in the current locale; Enter → results page.

## Home (in order)
1. Hero — admin-managed Banner slides (separate mobile image), CTA.
2. Category pills — kit "Category Pill" row, horizontally scrollable on mobile.
3. Nouveautés — product carousel/grid, newest `publishedAt`.
4. Collections — tiles of `showOnHome` collections.
5. Soldes — sale products, link to `/soldes`.
6. Trust strip — free shipping from threshold, 10-day exchange, cash on delivery, delivery 24–72h (texts from messages + Settings values).
7. Newsletter — email capture stored in DB.
Footer: À propos, Contact, Livraison, Retours & échanges, CGV, Confidentialité; payment info (COD); socials; contact phone/email from `site.config.ts`.

## Listing (category, collection, sale, search)
- Breadcrumb, title, product count.
- Filters: size (grouped by size group, with counts), color (swatches), price range; subcategories on category pages. Desktop: left sidebar. Mobile: "Filtrer" button → drawer. Active filters as removable chips. Filters in URL query params (shareable, SSR).
- Sort: Nouveautés (default), Prix croissant, Prix décroissant, Meilleures remises.
- 24 per page, numbered pagination (SEO-friendly, no infinite scroll).
- `/soldes` = all products with `compareAtPrice > price`, default sort by discount.

## Product card
Image with second image on hover (desktop), color swatches (click switches image), name, price, struck `compareAtPrice` + `-X%` badge, "Nouveau" badge (< 30 days), "Rupture" overlay when all variants are at 0. Whole card is a link; swatches are separate buttons.

## Product page
- Gallery: large image + thumbnails (desktop), swipe with dots (mobile); images filtered by selected color.
- Name, price / compare-at / `-X%`, color swatches (with name), size buttons (disabled + struck when out of stock for selected color), "Guide des tailles" link → modal (from category's SizeGuide).
- Stock hint: "Plus que X en stock" when ≤ `lowStockThreshold`.
- Quantity stepper, **Ajouter au panier** (primary, opens cart drawer), **Commander via WhatsApp** (secondary, opens `wa.me/<number>?text=` with product name, color, size, URL, in current locale).
- Accordions: Description, Livraison & retours, Composition/entretien.
- Trust strip mini.
- "Vous aimerez aussi": 8 products, same category, in stock first.
- Sticky add-to-cart bar on mobile after scrolling past the button.

## Cart drawer
Slides from the end side (right in LTR, left in RTL). Lines with image, name, color/size, quantity stepper, remove, line total. Free-shipping progress bar ("Plus que 120 MAD pour la livraison offerte"). Subtotal, "Commander" → checkout. Cart stored client-side (localStorage + cookie id) and re-validated against DB prices/stock on checkout.

## Checkout (single page)
See `commerce.md`. Left: form. Right (top on mobile): order summary.

## About
Admin-editable `Page`: brand story, mission/values, delivery/payment/returns summary, banner image.

## Other pages
Order confirmation `/[locale]/order/[number]?t=<token>`, Contact (info + WhatsApp link, no form v1), static policy pages (Livraison, Retours, CGV, Confidentialité) as `Page` records, 404 in kit style.

## SEO
Server-rendered pages, `generateMetadata` per locale, `hreflang` alternates, canonical URLs, Product JSON-LD (price in MAD, availability), sitemap per locale, `robots.txt` blocks `/admin`, `/checkout`.
