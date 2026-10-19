# Commerce: cart, checkout, orders, stock

## Cart
- Client-side state (localStorage), items `{ variantId, quantity }` only — never trust client prices.
- On drawer open and on checkout load: server re-reads variants → current price, stock, active status. Adjust quantities above stock and tell the user.

## Checkout (single page, guest only)
Fields: Prénom*, Nom*, Téléphone* (Moroccan format `0[5-7]XXXXXXXX` or `+212…`, normalise to `+212`), Email (optional), Ville* (select from active `City`), Adresse*, Note (optional).
Payment: Cash on delivery only (shown as the single selected option, text explains "paiement à la livraison").
Summary: lines, subtotal, shipping (`0` if subtotal ≥ `freeShippingThreshold`, else city override or `Settings.shippingFee`), total.
Submit → server action:
1. Zod validate.
2. In one transaction: lock variants (`SELECT … FOR UPDATE` or conditional `UPDATE … WHERE stock >= qty`), fail cleanly if any is short, decrement stock, create Order + OrderItems (snapshots) + first OrderStatusEvent (`NEW`).
3. After commit: send admin notification email (Settings.adminNotifyEmail); send customer confirmation email if email given (in order locale). Email failure must not fail the order.
4. Redirect to confirmation page with order number + unguessable token.
Protect against double submit (disable button + idempotency key).

## Order statuses
`NEW → CONFIRMED → SHIPPED → DELIVERED`; `CANCELLED` from NEW/CONFIRMED; `RETURNED` from SHIPPED/DELIVERED.
- Allowed transitions enforced server-side in one function.
- CANCELLED / RETURNED restore stock (transaction).
- Each change writes an OrderStatusEvent with admin and optional note.
- COD reality: NEW orders are confirmed by phone call before shipping — admin list highlights NEW orders and shows a click-to-call / WhatsApp link.

## Shipping
Morocco only. Flat fee + free threshold in Settings; optional per-city fee override. Delivery delay text editable in messages (e.g. 24–72h).

## WhatsApp ordering
Not an order in DB — a prefilled `wa.me` link (number from Settings). Message template per locale in `messages/*.json`.

## v2 (do not build now)
Promo codes, card payment (CMI), customer accounts/order history, SMS/WhatsApp API notifications, shipping-company integration.
