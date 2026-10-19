# Data model

Prisma + PostgreSQL. Money in integer centimes (MAD × 100). All ids `cuid()`. Timestamps `createdAt`/`updatedAt` on every model.

## Translatable fields
Pattern: a `*Translation` table per translatable model, keyed by `(parentId, locale)`, `locale` enum `fr | ar | en`. The FR row is required (enforced in Zod on create/update); AR/EN rows optional. Read through one helper that falls back to FR.

Translatable: Product (name, description, slug), Category (name, slug, description), Collection (name, slug, description), Color (name), Banner (title, subtitle, ctaLabel), Page (title, body — About), SizeGuide (content).
Not translatable: SKU, size labels, brand name, prices, customer/order data.

Slugs are per locale, unique per `(locale, slug)`. A product URL in another locale resolves through its translation row; the language switcher maps slug → slug.

## Models
- **Category** — tree via `parentId` (self relation), `position` for ordering, `isActive`, optional `image`, optional `sizeGuideId`. Top level v1: Vêtements, Chaussures, Accessoires (`audience` enum `MEN` on root, `WOMEN` reserved for later).
- **Collection** — marketing set (Nouveautés, Été 26, Essentials…), `image`, `position`, `isActive`, `showOnHome`. Many-to-many with Product via `ProductCollection (productId, collectionId, position)`.
- **Product** — `categoryId` (exactly one), `price`, `compareAtPrice?` (sale when `compareAtPrice > price`), `status` enum `DRAFT | ACTIVE | ARCHIVED`, `isFeatured`, `publishedAt` (drives "Nouveautés" sort).
- **ProductImage** — `productId`, `url`, `position`, `colorId?` (images per color for swatch switching), `alt` translatable via `ProductImageTranslation` or alt fallback to product name.
- **Color** — `hex`, translated name. Shared across products.
- **Size** — `label` (S, M, L, XL, 40, 41…), `position`, `group` (TOP, BOTTOM, SHOES, ONE_SIZE) for filters.
- **Variant** — `productId`, `colorId`, `sizeId`, `sku` (unique), `stock` int ≥ 0, `price?` override. Unique `(productId, colorId, sizeId)`.
- **SizeGuide** — translated content (rich text/table), linked from Category.
- **Banner** — home hero slides: image (desktop + mobile), link, `position`, `isActive`, translated texts.
- **Page** — static content (About), translated.
- **Order** — `number` (human readable, e.g. `B-10042`), `status` enum `NEW | CONFIRMED | SHIPPED | DELIVERED | CANCELLED | RETURNED`, `paymentMethod` enum `COD` (`CARD` reserved), customer snapshot (`firstName`, `lastName`, `phone`, `email?`, `city`, `address`, `note?`), `locale`, `subtotal`, `shippingFee`, `total`.
- **OrderItem** — snapshot: `variantId`, `productName`, `sku`, `colorName`, `sizeLabel`, `unitPrice`, `quantity`, `image`. Never re-read product data to display a past order.
- **OrderStatusEvent** — `orderId`, `from`, `to`, `adminUserId`, `note`, `createdAt` (audit trail).
- **City** — `name` (FR/AR), `isActive`, optional `shippingFee` override.
- **Settings** — singleton: `shippingFee`, `freeShippingThreshold`, `whatsappNumber`, `adminNotifyEmail`, `lowStockThreshold` (default 3).
- **NewsletterSubscriber** — `email` unique, `locale`.
- **AdminUser** — `email`, `passwordHash` (argon2/bcrypt), `name`. Single role in v1.

## Seed
`prisma/seed.ts` creates: 1 admin (credentials from `.env`, never hardcoded), category tree mirroring originals.ma (T-shirts, Chemises & Surchemises, Hoodies & Sweats, Vestes, Pantalons & Cargo, Jeans, Shorts; Sneakers, Sandales; Casquettes, Sacs, Ceintures, Chaussettes), 4 collections, ~40 products with FR/AR/EN names, colors, sizes, variants with stock, some on sale, Moroccan city list, settings defaults (fee 30 MAD, free from 499 MAD — placeholders).
