# Data model

Prisma + PostgreSQL. Money in integer centimes (MAD × 100). All ids `cuid()`. Timestamps `createdAt`/`updatedAt` on every model.

## Translatable fields
Pattern: a `*Translation` table per translatable model, keyed by `(parentId, locale)`, `locale` enum `fr | ar | en`. The FR row is required (enforced in Zod on create/update); AR/EN rows optional. Read through one helper that falls back to FR.

Translatable: Product (name, description, slug), Category (name, slug, description), Collection (name, slug, description), Color (name), Banner (title, subtitle, ctaLabel), MediaAsset (alt), Page (title, body — About), SizeGuide (content).
Not translatable: SKU, size labels, brand name, prices, customer/order data.

Slugs are per locale, unique per `(locale, slug)`. A product URL in another locale resolves through its translation row; the language switcher maps slug → slug.

## Models
- **Category** — tree via `parentId` (self relation), `position` for ordering, `isActive`, optional `mediaAssetId`, optional `sizeGuideId`. Top level v1: Vêtements, Chaussures, Accessoires (`audience` enum `MEN` on root, `WOMEN` reserved for later).
- **Collection** — marketing set (Nouveautés, Été 26, Essentials…), `mediaAssetId`, `position`, `isActive`, `showOnHome`. Many-to-many with Product via `ProductCollection (productId, collectionId, position)`.
- **Product** — `categoryId` (exactly one), `price`, `compareAtPrice?` (sale when `compareAtPrice > price`), `status` enum `DRAFT | ACTIVE | ARCHIVED`, `isFeatured`, `publishedAt` (drives "Nouveautés" sort).
- **ProductImage** — `productId`, `mediaAssetId`, `position`, `colorId?` (images per color for swatch switching). Alt text comes from the asset (`MediaAssetTranslation`), falling back to the product name (+ color).
- **MediaAsset** — one image of the media library: `storageKey` (unique; key in the `Storage`), `mime` (always `image/webp` for new uploads), `size`, `width`, `height` (null only for rows converted from legacy URLs), `originalName`, `sourceUrl?`, `author?`, `license?` (credit for stock photos), `uploadedById?` → AdminUser. Translated alt via `MediaAssetTranslation (mediaAssetId, locale, alt)`, FR first, fallback to FR. Referenced by `ProductImage.mediaAssetId`, `Banner.desktopMediaAssetId` / `mobileMediaAssetId`, `Collection.mediaAssetId`, `Category.mediaAssetId`; all foreign keys are `ON DELETE RESTRICT`, so a used asset cannot be deleted. Public URL = `mediaUrl(storageKey)` (`src/lib/media/url.ts`); a legacy external URL kept as `storageKey` is returned as is.
- **Color** — `hex`, translated name. Shared across products.
- **Size** — `label` (S, M, L, XL, 40, 41…), `position`, `group` (TOP, BOTTOM, SHOES, ONE_SIZE) for filters.
- **Variant** — `productId`, `colorId`, `sizeId`, `sku` (unique), `stock` int ≥ 0, `price?` override. Unique `(productId, colorId, sizeId)`.
- **SizeGuide** — translated content (rich text/table), linked from Category.
- **Banner** — home hero slides: `desktopMediaAssetId` (required) + `mobileMediaAssetId?`, link, `position`, `isActive`, translated texts.
- **Page** — static content (About), translated.
- **Order** — `number` (human readable, e.g. `B-10042`), `status` enum `NEW | CONFIRMED | SHIPPED | DELIVERED | CANCELLED | RETURNED`, `paymentMethod` enum `COD` (`CARD` reserved), customer snapshot (`firstName`, `lastName`, `phone`, `email?`, `city`, `address`, `note?`), `locale`, `subtotal`, `shippingFee`, `total`.
- **OrderItem** — snapshot: `variantId`, `productName`, `sku`, `colorName`, `sizeLabel`, `unitPrice`, `quantity`, `image`. Never re-read product data to display a past order.
- **OrderStatusEvent** — `orderId`, `from`, `to`, `adminUserId`, `note`, `createdAt` (audit trail).
- **City** — `name` (FR/AR), `isActive`, optional `shippingFee` override.
- **Settings** — singleton: `shippingFee`, `freeShippingThreshold`, `whatsappNumber`, `adminNotifyEmail`, `lowStockThreshold` (default 3).
- **NewsletterSubscriber** — `email` unique, `locale`.
- **AdminUser** — `email`, `passwordHash` (argon2/bcrypt), `name`. Single role in v1.

## Seed
`prisma/seed.ts` creates: 1 admin (credentials from `.env`, never hardcoded), category tree mirroring originals.ma (T-shirts, Chemises & Surchemises, Hoodies & Sweats, Vestes, Pantalons & Cargo, Jeans, Shorts; Sneakers, Sandales; Casquettes, Sacs, Ceintures, Chaussettes), 4 collections, ~40 products with FR/AR/EN names, colors, sizes, variants with stock (a product's colors are the colors of its demo photos), some on sale, Moroccan city list, settings defaults (fee 30 MAD, free from 499 MAD — placeholders).

### Demo photos
`prisma/demo-images.json` maps each product (slug of its English name), banner and collection to real Unsplash photos (`url`, `sourceUrl`, `author`, `license`, and a `colorKey` for product photos). The seed downloads each photo once into `prisma/.demo-cache/` (gitignored), runs it through the same pipeline as admin uploads and creates the `MediaAsset` rows, so it works offline after the first run. A photo already imported (same `sourceUrl`, file still on disk) is reused, so re-seeding does not duplicate assets. Only Unsplash or Pexels photos (free commercial license) may be added.
