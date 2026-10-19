import type { OrderStatus } from "@prisma/client";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { applyOrderStatusChange } from "@/lib/admin/order-status";
import { ORDER_STATUSES } from "@/lib/admin/labels";
import { ALLOWED_TRANSITIONS, canTransition, createOrder } from "@/lib/orders";

// The admin status action goes through applyOrderStatusChange -> transitionOrder:
// the allowed-transition map is the only rule, stock is restored on
// CANCELLED / RETURNED and every change is audited with the admin id.

let adminId: string;
let variantId: string;
let orderId: string;
let keyCounter = 0;

async function reset() {
  await db.$executeRawUnsafe(
    `TRUNCATE "Order","AdminUser","Product","Category","Color","Size","City","Settings" RESTART IDENTITY CASCADE`,
  );
  await db.$executeRawUnsafe(`ALTER SEQUENCE order_number_seq RESTART WITH 10001`);
}

async function freshOrder(status: OrderStatus = "NEW") {
  // Stock 10, one order of 2 units: the variant ends at 8.
  await db.variant.update({ where: { id: variantId }, data: { stock: 10 } });
  const result = await createOrder({
    idempotencyKey: `admin-status-${Date.now()}-${++keyCounter}-0000000000`,
    locale: "fr",
    customer: {
      firstName: "Test",
      lastName: "Client",
      phone: "+212612345678",
      email: null,
      cityId: (await db.city.findFirstOrThrow()).id,
      address: "1 rue des Tests",
      note: null,
    },
    items: [{ variantId, quantity: 2 }],
  });
  if (!result.ok) throw new Error("fixture order failed");
  // Put the order in the wanted state directly (stock as if it had followed the path).
  if (status !== "NEW") {
    const restored = status === "CANCELLED" || status === "RETURNED";
    await db.order.update({ where: { id: result.order.id }, data: { status } });
    if (restored) await db.variant.update({ where: { id: variantId }, data: { stock: 10 } });
  }
  return result.order.id;
}

const stock = async () => (await db.variant.findUniqueOrThrow({ where: { id: variantId } })).stock;

beforeEach(async () => {
  await reset();
  await db.settings.create({ data: { id: "singleton" } });
  await db.city.create({ data: { nameFr: "Casablanca", nameAr: "الدار البيضاء" } });
  const category = await db.category.create({
    data: { translations: { create: { locale: "fr", name: "Jeans", slug: "jeans" } } },
  });
  const color = await db.color.create({
    data: { hex: "#111111", translations: { create: { locale: "fr", name: "Noir" } } },
  });
  const size = await db.size.create({ data: { label: "42", group: "BOTTOM" } });
  const product = await db.product.create({
    data: {
      categoryId: category.id,
      price: 20000,
      status: "ACTIVE",
      translations: { create: { locale: "fr", name: "Jean", slug: "jean" } },
    },
  });
  variantId = (
    await db.variant.create({
      data: { productId: product.id, colorId: color.id, sizeId: size.id, sku: "JEA-1-42", stock: 10 },
    })
  ).id;
  adminId = (await db.adminUser.create({ data: { email: "a@example.test", name: "Ada", passwordHash: "x" } })).id;
  orderId = await freshOrder();
});

afterAll(async () => {
  await db.$disconnect();
});

describe("applyOrderStatusChange", () => {
  it("follows ALLOWED_TRANSITIONS for every from/to pair", async () => {
    for (const from of ORDER_STATUSES) {
      for (const to of ORDER_STATUSES) {
        const id = await freshOrder(from);
        const result = await applyOrderStatusChange({ orderId: id, to }, adminId);
        const expected = canTransition(from, to);
        expect(result.ok, `${from} -> ${to}`).toBe(expected);
        const after = await db.order.findUniqueOrThrow({ where: { id } });
        expect(after.status, `${from} -> ${to} status`).toBe(expected ? to : from);
      }
    }
    expect(ALLOWED_TRANSITIONS.NEW).toEqual(["CONFIRMED", "CANCELLED"]);
  });

  it("refuses a forbidden jump with a clear message and writes no event", async () => {
    const result = await applyOrderStatusChange({ orderId, to: "SHIPPED" }, adminId);
    expect(result.ok).toBe(false);
    expect(result.message).toMatch(/non autorisé/);
    const events = await db.orderStatusEvent.findMany({ where: { orderId } });
    expect(events).toHaveLength(1); // only the initial NEW event
  });

  it("records the admin and note, and restores stock when cancelling", async () => {
    expect(await stock()).toBe(8);
    expect((await applyOrderStatusChange({ orderId, to: "CONFIRMED", note: "  Client joint  " }, adminId)).ok).toBe(true);
    expect(await stock()).toBe(8);

    const cancel = await applyOrderStatusChange({ orderId, to: "CANCELLED" }, adminId);
    expect(cancel.ok).toBe(true);
    expect(await stock()).toBe(10);

    const events = await db.orderStatusEvent.findMany({ where: { orderId }, orderBy: { createdAt: "asc" } });
    expect(events.map((e) => [e.from, e.to])).toEqual([
      [null, "NEW"],
      ["NEW", "CONFIRMED"],
      ["CONFIRMED", "CANCELLED"],
    ]);
    expect(events[1]).toMatchObject({ adminUserId: adminId, note: "Client joint" });
    expect(events[2].adminUserId).toBe(adminId);
  });

  it("rejects invalid input and unknown orders", async () => {
    expect((await applyOrderStatusChange({ orderId, to: "TELEPORTED" }, adminId)).ok).toBe(false);
    expect((await applyOrderStatusChange({ to: "CONFIRMED" }, adminId)).ok).toBe(false);
    const missing = await applyOrderStatusChange({ orderId: "nope", to: "CONFIRMED" }, adminId);
    expect(missing).toMatchObject({ ok: false, message: "Commande introuvable." });
  });
});
