# Store

Moroccan menswear store: storefront (`/fr`, `/ar`, `/en`) and admin back-office (`/admin`).
Next.js 15 (App Router), TypeScript, Tailwind CSS v4, Prisma + PostgreSQL, next-intl.

Project rules live in `CLAUDE.md`; domain context in `.claude/skills/store-dev`.

## Setup

Requirements: Node 22, pnpm 10, Docker.

```bash
pnpm install
cp .env.example .env        # then edit ADMIN_EMAIL / ADMIN_PASSWORD / AUTH_SECRET
pnpm db:up                  # Postgres 16 in Docker, host port 5433
pnpm db:migrate             # apply migrations
pnpm db:seed                # demo data + admin user (safe to re-run)
pnpm dev                    # http://localhost:3000 -> redirects to /fr
```

## Scripts

| Script | What it does |
|---|---|
| `pnpm dev` / `build` / `start` | Next.js dev server, production build, production server |
| `pnpm lint` / `typecheck` | ESLint, `tsc --noEmit` |
| `pnpm db:up` | `docker compose up -d` (Postgres on port 5433) |
| `pnpm db:migrate` | `prisma migrate dev` |
| `pnpm db:seed` | Reset catalog demo data (idempotent) |
| `pnpm i18n:check` | Fail when `messages/{fr,ar,en}.json` keys differ |

## Notes

- Brand name, logo and contact details come from `site.config.ts` (placeholders).
- Design tokens: `src/styles/theme.css` (kit from `../ui-ux/theme.css` + project extensions).
  Kit spacing tokens override Tailwind numbers: `p-16` is 16px, `gap-12` is 12px.
- Prices are stored in centimes; use `formatMoney` from `src/lib/money.ts`.
- Seed placeholder images come from `placehold.co` (allowed in `next.config.ts`).
