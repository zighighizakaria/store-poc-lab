# Admin back-office (`/admin`)

French-only UI. Auth.js credentials login; every page and server action checks the session server-side (middleware + per-action check). Same kit style, denser layout (sidebar nav, tables).

## Screens
- **Tableau de bord** — today's orders, NEW orders to confirm, revenue (delivered) this month, low-stock variants.
- **Commandes** — table (number, date, client, phone, city, total, status), filters by status/date/city, search by number/phone. Detail: items, customer, status buttons for allowed transitions only, history (OrderStatusEvent), call/WhatsApp links, printable delivery slip.
- **Produits** — table with image, name, category, price, stock total, status; filters; bulk archive. Form: FR/AR/EN tabs for translatable fields (FR required), category select, collections multi-select, price / compare-at, status, images (upload, reorder by drag, assign to color), variants matrix (pick colors × sizes → generate rows, edit SKU/stock/price per row).
- **Catégories** — tree view, drag to reorder/reparent, translated fields, image, size guide link.
- **Collections** — list, translated fields, image, show on home, pick and order products.
- **Couleurs / Tailles** — small CRUD lists.
- **Bannières** — home hero slides with desktop/mobile image, translated texts, order, active toggle.
- **Pages** — About + policy pages, translated rich text.
- **Villes** — active toggle, optional fee override.
- **Newsletter** — list + CSV export.
- **Réglages** — shipping fee, free threshold, WhatsApp number, notification email, low-stock threshold.
- **Admins** — list, create, reset password.

## Rules
- Delete = soft (archive) for products/categories/collections that have orders; hard delete only when unused.
- Slugs auto-generated from FR name (and from AR/EN when filled), editable, uniqueness checked.
- Image upload: validate type/size, generate responsive sizes, store via `Storage` interface.
- Every mutation: Zod validation, `revalidatePath`/`revalidateTag` for affected storefront pages.
