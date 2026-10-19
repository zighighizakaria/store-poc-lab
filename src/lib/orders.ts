import { randomBytes } from "node:crypto";
import { Prisma, type Locale, type OrderStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { getTranslation } from "@/lib/i18n";
import { mediaAssetUrl } from "@/lib/media/url";
import { computeShipping } from "@/lib/shipping";

// Order creation and order status transitions. Both run in one DB transaction
// so stock, order rows and the audit trail can never get out of sync.

// ------------------------------------------------------------ create order

export type CreateOrderInput = {
  /** Client-generated key: the same key never creates two orders. */
  idempotencyKey: string;
  locale: Locale;
  customer: {
    firstName: string;
    lastName: string;
    /** Already normalized (+212...). */
    phone: string;
    email: string | null;
    cityId: string;
    address: string;
    note: string | null;
  };
  /** variantId + quantity only. Prices, names and stock are read server-side. */
  items: { variantId: string; quantity: number }[];
};

export type StockIssue = {
  variantId: string;
  /** Units still available (0 = sold out, unknown or no longer on sale). */
  available: number;
};

export type PlacedOrder = { id: string; number: string; accessToken: string };

export type CreateOrderResult =
  | { ok: true; duplicate: boolean; order: PlacedOrder }
  | { ok: false; reason: "stock"; issues: StockIssue[] }
  | { ok: false; reason: "empty" | "city" };

// Thrown inside the transaction to roll everything back with a typed result.
class OrderAbort extends Error {
  constructor(readonly result: Extract<CreateOrderResult, { ok: false }>) {
    super(`Order aborted: ${result.reason}`);
  }
}

const placedOrderSelect = { id: true, number: true, accessToken: true } as const;

function mergeLines(items: CreateOrderInput["items"]) {
  const merged = new Map<string, number>();
  for (const { variantId, quantity } of items) {
    merged.set(variantId, (merged.get(variantId) ?? 0) + quantity);
  }
  return [...merged].map(([variantId, quantity]) => ({ variantId, quantity }));
}

export async function createOrder(input: CreateOrderInput): Promise<CreateOrderResult> {
  const findByKey = () =>
    db.order.findUnique({
      where: { idempotencyKey: input.idempotencyKey },
      select: placedOrderSelect,
    });

  const existing = await findByKey();
  if (existing) return { ok: true, duplicate: true, order: existing };

  const lines = mergeLines(input.items);
  if (lines.length === 0) return { ok: false, reason: "empty" };

  try {
    const order = await db.$transaction(
      async (tx) => {
        const city = await tx.city.findFirst({
          where: { id: input.customer.cityId, isActive: true },
        });
        if (!city) throw new OrderAbort({ ok: false, reason: "city" });

        const settingsRow = await tx.settings.findUnique({ where: { id: "singleton" } });
        const rules = {
          shippingFee: settingsRow?.shippingFee ?? 3000,
          freeShippingThreshold: settingsRow?.freeShippingThreshold ?? 49900,
          cityShippingFee: city.shippingFee,
        };

        const variants = await tx.variant.findMany({
          where: { id: { in: lines.map((line) => line.variantId) } },
          include: {
            size: true,
            color: { include: { translations: true } },
            product: {
              include: {
                translations: true,
                images: { orderBy: { position: "asc" }, include: { mediaAsset: true } },
              },
            },
          },
        });
        const byId = new Map(variants.map((variant) => [variant.id, variant]));

        // Conditional decrement per variant, in a stable order (no deadlocks
        // between concurrent orders). count 0 means not enough stock.
        const issues: StockIssue[] = [];
        for (const line of [...lines].sort((a, b) => a.variantId.localeCompare(b.variantId))) {
          const variant = byId.get(line.variantId);
          if (!variant || variant.product.status !== "ACTIVE") {
            issues.push({ variantId: line.variantId, available: 0 });
            continue;
          }
          const updated = await tx.variant.updateMany({
            where: { id: line.variantId, stock: { gte: line.quantity } },
            data: { stock: { decrement: line.quantity } },
          });
          if (updated.count === 0) {
            const current = await tx.variant.findUnique({
              where: { id: line.variantId },
              select: { stock: true },
            });
            issues.push({ variantId: line.variantId, available: Math.max(0, current?.stock ?? 0) });
          }
        }
        // Throwing rolls back every decrement made above: no partial writes.
        if (issues.length > 0) throw new OrderAbort({ ok: false, reason: "stock", issues });

        const items = lines.map((line) => {
          const variant = byId.get(line.variantId)!;
          const { product } = variant;
          const image =
            product.images.find((img) => img.colorId === variant.colorId) ?? product.images[0];
          return {
            variantId: variant.id,
            productName: getTranslation(product, input.locale).name,
            sku: variant.sku,
            colorName: getTranslation(variant.color, input.locale).name,
            sizeLabel: variant.size.label,
            unitPrice: variant.price ?? product.price,
            quantity: line.quantity,
            image: mediaAssetUrl(image?.mediaAsset),
          };
        });
        const subtotal = items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
        const shippingFee = computeShipping(subtotal, rules);

        const [{ n }] = await tx.$queryRaw<{ n: bigint }[]>`SELECT nextval('order_number_seq') AS n`;

        return tx.order.create({
          data: {
            number: `B-${n}`,
            accessToken: randomBytes(24).toString("base64url"),
            idempotencyKey: input.idempotencyKey,
            status: "NEW",
            paymentMethod: "COD",
            firstName: input.customer.firstName,
            lastName: input.customer.lastName,
            phone: input.customer.phone,
            email: input.customer.email,
            // City name is stored in French (admin language); other locales
            // are resolved from City when displayed.
            city: city.nameFr,
            address: input.customer.address,
            note: input.customer.note,
            locale: input.locale,
            subtotal,
            shippingFee,
            total: subtotal + shippingFee,
            items: { create: items },
            statusEvents: { create: { from: null, to: "NEW", adminUserId: null } },
          },
          select: placedOrderSelect,
        });
      },
      { maxWait: 5000, timeout: 15000 },
    );
    return { ok: true, duplicate: false, order };
  } catch (error) {
    if (error instanceof OrderAbort) return error.result;
    // Two submits with the same key raced: the loser hits the unique index.
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      const raced = await findByKey();
      if (raced) return { ok: true, duplicate: true, order: raced };
    }
    throw error;
  }
}

// ------------------------------------------------------- status transitions

/** NEW -> CONFIRMED -> SHIPPED -> DELIVERED; CANCELLED from NEW/CONFIRMED; RETURNED from SHIPPED/DELIVERED. */
export const ALLOWED_TRANSITIONS: Record<OrderStatus, readonly OrderStatus[]> = {
  NEW: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["SHIPPED", "CANCELLED"],
  SHIPPED: ["DELIVERED", "RETURNED"],
  DELIVERED: ["RETURNED"],
  CANCELLED: [],
  RETURNED: [],
};

export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  return ALLOWED_TRANSITIONS[from].includes(to);
}

export type TransitionResult =
  | { ok: true; from: OrderStatus; to: OrderStatus }
  | { ok: false; reason: "not_found" }
  | { ok: false; reason: "forbidden" | "conflict"; from: OrderStatus };

/**
 * The only place an order status changes. Enforces the allowed-transition map,
 * restores stock when the order is CANCELLED or RETURNED, and writes the
 * OrderStatusEvent (adminUserId is null for system events), all in one
 * transaction.
 */
export async function transitionOrder(
  orderId: string,
  to: OrderStatus,
  options: { adminUserId?: string | null; note?: string | null } = {},
): Promise<TransitionResult> {
  return db.$transaction(async (tx) => {
    const order = await tx.order.findUnique({
      where: { id: orderId },
      select: { status: true, items: { select: { variantId: true, quantity: true } } },
    });
    if (!order) return { ok: false, reason: "not_found" } as const;

    const from = order.status;
    if (!canTransition(from, to)) return { ok: false, reason: "forbidden", from } as const;

    // Guard against a concurrent transition that read the same status.
    const moved = await tx.order.updateMany({
      where: { id: orderId, status: from },
      data: { status: to },
    });
    if (moved.count === 0) return { ok: false, reason: "conflict", from } as const;

    if (to === "CANCELLED" || to === "RETURNED") {
      for (const item of order.items) {
        // variantId is null when the variant was deleted: nothing to restore.
        if (!item.variantId) continue;
        await tx.variant.update({
          where: { id: item.variantId },
          data: { stock: { increment: item.quantity } },
        });
      }
    }

    await tx.orderStatusEvent.create({
      data: {
        orderId,
        from,
        to,
        adminUserId: options.adminUserId ?? null,
        note: options.note ?? null,
      },
    });
    return { ok: true, from, to } as const;
  });
}
