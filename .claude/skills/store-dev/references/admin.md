# Admin back-office (`/admin`)

French-only UI. Auth.js credentials login; every page and server action checks the session server-side (middleware + per-action check). Same kit style, denser layout (sidebar nav, tables).

## Screens
- **Tableau de bord** — today's orders, NEW orders to confirm, revenue (delivered) this month, low-stock variants.
- **Commandes** — table (number, date, client, phone, city, total, status), filters by status/date/city, search by number/phone. Detail: items, customer, status buttons for allowed transitions only, history (OrderStatusEvent), call/WhatsApp links, printable delivery slip.
- **Produits** — table with image, name, category, price, stock total, status; filters; bulk archive. Form: FR/AR/EN tabs for translatable fields (FR required), category select, collections multi-select, price / compare-at, status, images (pick from the media library or upload, swap, reorder, remove, assign to color), variants matrix (pick colors × sizes → generate rows, edit SKU/stock/price per row).
- **Catégories** — tree view, drag to reorder/reparent, translated fields, image (media picker), size guide link.
- **Collections** — list, translated fields, image, show on home, pick and order products.
- **Couleurs / Tailles** — small CRUD lists.
- **Médiathèque** (`/admin/media`) — see below.
- **Bannières** — home hero slides with desktop/mobile image, translated texts, order, active toggle.
- **Pages** — About + policy pages, translated rich text.
- **Villes** — active toggle, optional fee override.
- **Newsletter** — list + CSV export.
- **Réglages** — shipping fee, free threshold, WhatsApp number, notification email, low-stock threshold.
- **Admins** — list, create, reset password.

## Rules
- Delete = soft (archive) for products/categories/collections that have orders; hard delete only when unused.
- Slugs auto-generated from FR name (and from AR/EN when filled), editable, uniqueness checked.
- Image upload: validate size (5 MB) and magic bytes, then the `sharp` pipeline (`src/lib/media/optimize.ts`): auto-rotate, strip EXIF/GPS, cap the longest side at 2400 px, convert to WebP. The original is not kept. The result is stored via the `Storage` interface under a fresh random key and recorded as a `MediaAsset`. Responsive sizes come from `next/image`.
- Images are never uploaded straight into a record: product images, banners, collections and categories reference a `MediaAsset` chosen with the `MediaPicker` modal (pick an existing asset or upload a new one).
- Every mutation: Zod validation, `revalidatePath`/`revalidateTag` for affected storefront pages.

## Médiathèque (`/admin/media`)
- Grid of all assets (newest first, 48 per page) with a drag-and-drop zone that accepts several files at once (uploaded one request per file). Search by file name or alt text; filter "Non utilisés". Each card shows its usage count.
- Detail panel (`?asset=<id>`): preview, dimensions, size, upload date and author, source/author/license for stock photos, **alt text FR/AR/EN** (FR is the fallback), **"Utilisé dans"** list (products, banners desktop/mobile, collections, categories, each linking to its admin page), **Remplacer le fichier**, **Supprimer**.
- Replace keeps the asset id (every usage follows) but writes a **new storage key** so browser/CDN caches refresh, then deletes the old file (kept if a past order still shows its URL).
- Delete only when unused (checked in the action and enforced by `RESTRICT` foreign keys). Removing an image from a product, banner, collection or category never deletes the file: it just becomes "non utilisé".
- Logic lives in `src/lib/media/library.ts`; actions in `src/lib/actions/admin/media.ts`.
