---
name: store-dev
description: Project context and build guide for the Moroccan menswear e-commerce store (Next.js storefront + admin). Use whenever you build, change, or review any feature of this store — pages, components, product/category/collection CRUD, cart, checkout, orders, i18n (FR/AR/EN, RTL), design-kit styling, data model or seed data.
---

# store-dev

Build guide for this store. `CLAUDE.md` holds the hard rules; this skill holds the context and the how.

## Product in one paragraph
Modern, simple, very user-friendly menswear store for Morocco. Structure and sections inspired by originals.ma, but fixing its weak points (thin home page, no color swatches, page-based cart, no WhatsApp ordering, English-only). Visual style comes from our UI kit (`../ui-ux/`, a shop.app-style spec: white/grey canvas, black ink, one accent, pill controls, rounded cards). Two areas in one Next.js app: public storefront `/[locale]/...` and admin back-office `/admin`. Brand name and logo are placeholders in `site.config.ts`.

## Which reference to read
Read only what the task needs:

| Task | Read |
|---|---|
| Schema, Prisma models, seed data, CRUD | `references/data-model.md` |
| Any storefront page or component | `references/storefront.md` + `references/design-system.md` |
| Cart, checkout, orders, shipping, stock | `references/commerce.md` |
| Admin screens | `references/admin.md` |
| Anything text, routing, RTL, translated fields | `references/i18n.md` |
| "Why was X decided?" / scope questions | `references/decisions.md` |

## Project layout (target)
```
store/
  site.config.ts            # brand name, logo path, WhatsApp number, contact, socials
  messages/{fr,ar,en}.json  # UI strings
  prisma/schema.prisma, prisma/seed.ts
  src/app/[locale]/...      # storefront (home, c/[...slug], collections/[slug], p/[slug], soldes, about, checkout, order/[id])
  src/app/admin/...         # back-office (FR only)
  src/components/ui/        # kit-based primitives (Button, Input, Pill, Badge, Card, Drawer, Modal...)
  src/components/store/     # store components (ProductCard, Filters, CartDrawer, Gallery...)
  src/lib/                  # db, auth, i18n helpers, money, storage, validation (zod)
  src/styles/theme.css      # tokens copied from ../ui-ux/theme.css + project extensions
```

## How to build a feature
1. Find the spec in the matching reference. If the spec is silent, choose the simplest option consistent with originals.ma structure and the kit style, and say what you chose.
2. Data first: schema change + migration + seed update, then server logic (server actions with Zod), then UI.
3. UI: compose from `src/components/ui` primitives. New primitive needed? Build it in the kit style, tokens only.
4. Every customer-facing string through `next-intl`; every translatable DB field read through the fallback helper (`t(field, locale)` → FR fallback).
5. Check in all three locales, including Arabic RTL, at 360px and desktop.

## Done checklist
- [ ] `pnpm lint` and `pnpm typecheck` pass; tests for the touched logic pass.
- [ ] No hardcoded customer-facing text; keys exist in `fr.json`, `ar.json`, `en.json`.
- [ ] RTL: no `ml-/mr-/pl-/pr-/left-/right-` layout classes; icons with direction (arrows, chevrons) flip in RTL.
- [ ] Only tokens used for color, radius, shadow, spacing, font.
- [ ] Prices in centimes in DB, formatted `199 MAD` with Latin digits.
- [ ] Server-side Zod validation; admin actions check the session.
- [ ] Stock changes happen in a transaction.
- [ ] Works at 360px width; keyboard focus visible; images have `alt` (translated).
- [ ] Nothing from the v1 out-of-scope list was added.
