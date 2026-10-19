# Store — project rules

Moroccan menswear e-commerce store (storefront + admin back-office). Inspired by originals.ma in structure, styled with our own UI kit.
Brand name is a placeholder ("Brand"); never hardcode it — read it from `site.config.ts`.

**Before building any feature, load the `store-dev` skill.** It holds the domain model, page specs, i18n and design details. This file is the short list of non-negotiable rules.

## Stack (fixed — do not swap without asking)
- Next.js 15 App Router, TypeScript strict, React Server Components by default.
- Tailwind CSS v4. Design tokens come from `../ui-ux/theme.css` (copied into `src/styles/theme.css`). No other UI framework (no MUI, no Bootstrap, no shadcn theme overrides that ignore tokens).
- Prisma + PostgreSQL (Docker locally). Auth.js (credentials) for admin only.
- `next-intl` for i18n. Image storage behind a `Storage` interface (local disk in dev, S3/R2 later).
- Hosting is not decided. Do not add vendor-specific code (Vercel-only APIs, etc.).

## Language & code
- Code, comments, commit messages, docs: English.
- Customer-facing text: never hardcoded. UI strings go in `messages/{fr,ar,en}.json`; content comes from DB translation fields.
- Admin UI: French only (strings may be hardcoded in French there).

## i18n (v1 scope: FR default, AR, EN)
- Routes are locale-prefixed: `/fr/...`, `/ar/...`, `/en/...`. `/` redirects to `/fr`. Emit `hreflang` alternates.
- Language switcher keeps the current page; choice saved in a cookie. No auto-redirect on browser language.
- Translatable DB fields: FR required, AR/EN optional, fallback to FR when missing.
- Never translate: brand name, logo, SKU, sizes (S, M, L, 42…), third-party brand names, customer-entered data.
- Arabic = full RTL (`dir="rtl"`). Use logical utilities only (`ms-/me-/ps-/pe-/start-/end-`), never `ml-/mr-/pl-/pr-/left-/right-` for layout. Arabic font: IBM Plex Sans Arabic. Latin font: Inter.
- Numbers and prices always in Latin digits, currency MAD (e.g. `199 MAD`).

## Design
- The UI kit in `../ui-ux/` (`DESIGN (1).md`, `tokens.json`, `variables.css`, `theme.css`) is the source of truth. Use tokens, never raw hex/px values that a token covers.
- Light theme only. One accent color token (`--color-accent`, default violet `#5433eb`) — change brand color in one place.
- Shapes: pills (9999px) for buttons/inputs/chips, 28px card radius, 20px inner image radius.
- The kit has no component code: build components from its specs, and when the kit lacks something (cart drawer, forms, badges, modals), extend it in the same style and add the new token to `src/styles/theme.css`, not inline.
- Mobile-first. Every page must work at 360px width.
- **Spacing gotcha:** kit spacing tokens replace Tailwind's numeric scale — `p-16` = 16px, `gap-12` = 12px (pixel values, not ×4). Only kit steps exist (4, 6, 8, 10, 11, 12, 16, 20, 24, 32, 38, 40, 44, 48, 64).
- Body text uses `--color-muted` (`#6b6968`), not the kit's `#787574` (fails 4.5:1 contrast).
- Wrap prices and `-X%` badges in `dir="ltr"` so they render correctly inside Arabic text.

## Versions
- Prisma pinned to 6.x (7+ needs driver adapters — do not upgrade without asking). Next.js pinned to 15.x.
- Postgres runs in Docker on host port **5433** (`pnpm db:up`). Mailpit (dev email) UI on http://localhost:8025.
- `pnpm db:seed` wipes and recreates the catalog: existing orders lose their variant link (snapshots stay, cancel no longer restores stock). Dev only — never run it against real data.
- Every admin server action starts with `requireAdmin()`; `/admin` is also guarded in middleware. Keep both.

## Commerce rules
- Payment v1: cash on delivery (COD) only. Card (CMI) is v2 — keep a `paymentMethod` field ready.
- Guest checkout only, no customer accounts. Phone required, email optional. Morocco only, city from a list.
- Shipping: flat fee + free-shipping threshold, both editable in admin settings.
- Order statuses: `NEW → CONFIRMED → SHIPPED → DELIVERED`, plus `CANCELLED`, `RETURNED`. Stock decrements at order creation, restores on cancel/return — inside a DB transaction.
- Sale page is automatic: products where `compareAtPrice > price`. No manual sale collection.
- Category = product type tree (one per product). Collection = marketing set (many-to-many).
- Variants = size × color, each with its own SKU and stock.
- Out of scope v1 (do not build unless asked): promo codes, customer accounts, card payment, SMS/WhatsApp API, AI translation, women's section, dark mode.

## Working rules
- Validate all input with Zod on the server (server actions / route handlers). Admin routes and actions check the session server-side.
- Prices stored as integers in centimes (MAD × 100). Never floats.
- Run `pnpm lint`, `pnpm typecheck` and the relevant tests before saying a task is done.
- Ask before adding a new dependency that is not in the stack above.
