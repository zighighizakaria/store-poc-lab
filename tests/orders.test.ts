import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import {
  ALLOWED_TRANSITIONS,
  canTransition,
  createOrder,
  transitionOrder,
  type CreateOrderInput,
} from "@/lib/orders";
import { computeShipping } from "@/lib/shipping";

// Runs against the store_test database (see vitest.config.ts). Every test
// starts from the same small catalog.

type Fixture = {
  cityPlain: string;
  cityFee: string;
  v1: string; // product 200 MAD, stock 5
  v2: string; // same product, price override 300 MAD, stock 2
  v3: string; // product 600 MAD, stock 10
};

let fx: Fixture;
let keyCounter = 0;
const nextKey = () => `test-key-${Date.now()}-${++keyCounter}-0000000000`;

async function resetDatabase() {
  await db.$executeRawUnsafe(
    `TRUNCATE "Order","AdminUser","Product","Category","Color","Size","City","Settings","MediaAsset" RESTART IDENTITY CASCADE`,
  );
  await db.$executeRawUnsafe(`ALTER SEQUENCE order_number_seq RESTART WITH 10001`);
}

async function seedFixture(): Promise<Fixture> {
  await db.settings.create({
    data: { id: "singleton", shippingFee: 3000, freeShippingThreshold: 49900 },
  });
  const cityPlain = await db.city.create({ data: { nameFr: "Casablanca", nameAr: "الدار البيضاء" } });
  const cityFee = await db.city.create({
    data: { nameFr: "Agadir", nameAr: "أكادير", shippingFee: 5000 },
  });

  const category = await db.category.create({
    data: { translations: { create: { locale: "fr", name: "Jeans", slug: "jeans" } } },
  });
  const color = await db.color.create({
    data: {
      hex: "#111111",
      translations: {
        create: [
          { locale: "fr", name: "Noir" },
          { locale: "ar", name: "أسود" },
        ],
      },
    },
  });
  const size = await db.size.create({ data: { label: "42", group: "BOTTOM" } });
  const size2 = await db.size.create({ data: { label: "44", group: "BOTTOM" } });

  const p1 = await db.product.create({
    data: {
      categoryId: category.id,
      price: 20000,
      status: "ACTIVE",
      translations: {
        create: [
          { locale: "fr", name: "Jean Droit", slug: "jean-droit" },
          { locale: "ar", name: "جينز مستقيم", slug: "جينز-مستقيم" },
        ],
      },
      images: {
        create: [
          {
            color: { connect: { id: color.id } },
            // An external URL as storage key is how legacy placeholder images are kept.
            mediaAsset: { create: { storageKey: "https://example.test/jean.png", mime: "image/png", originalName: "jean.png" } },
          },
        ],
      },
    },
  });
  const p2 = await db.product.create({
    data: {
      categoryId: category.id,
      price: 60000,
      status: "ACTIVE",
      translations: { create: { locale: "fr", name: "Veste", slug: "veste" } },
    },
  });

  const v1 = await db.variant.create({
    data: { productId: p1.id, colorId: color.id, sizeId: size.id, sku: "JEA-001-42", stock: 5 },
  });
  const v2 = await db.variant.create({
    data: {
      productId: p1.id,
      colorId: color.id,
      sizeId: size2.id,
      sku: "JEA-001-44",
      stock: 2,
      price: 30000,
    },
  });
  const v3 = await db.variant.create({
    data: { productId: p2.id, colorId: color.id, sizeId: size.id, sku: "VES-002-42", stock: 10 },
  });

  return { cityPlain: cityPlain.id, cityFee: cityFee.id, v1: v1.id, v2: v2.id, v3: v3.id };
}

function orderInput(
  items: CreateOrderInput["items"],
  overrides: Partial<CreateOrderInput> & { cityId?: string } = {},
): CreateOrderInput {
  const { cityId, ...rest } = overrides;
  return {
    idempotencyKey: nextKey(),
    locale: "fr",
    customer: {
      firstName: "Test",
      lastName: "Client",
      phone: "+212612345678",
      email: "test@example.test",
      cityId: cityId ?? fx.cityPlain,
      address: "12 rue des Tests",
      note: null,
    },
    items,
    ...rest,
  };
}

const stockOf = async (variantId: string) =>
  (await db.variant.findUniqueOrThrow({ where: { id: variantId } })).stock;

beforeEach(async () => {
  await resetDatabase();
  fx = await seedFixture();
});

afterAll(async () => {
  await db.$disconnect();
});

describe("createOrder", () => {
  it("decrements stock and writes a full snapshot with the first NEW event", async () => {
    const result = await createOrder(
      orderInput(
        [
          { variantId: fx.v1, quantity: 2 },
          { variantId: fx.v2, quantity: 1 },
        ],
        { locale: "ar" },
      ),
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.order.number).toBe("B-10001");
    expect(result.order.accessToken.length).toBeGreaterThanOrEqual(32);
    expect(await stockOf(fx.v1)).toBe(3);
    expect(await stockOf(fx.v2)).toBe(1);

    const order = await db.order.findUniqueOrThrow({
      where: { id: result.order.id },
      include: { items: true, statusEvents: true },
    });
    expect(order.status).toBe("NEW");
    expect(order.paymentMethod).toBe("COD");
    expect(order.locale).toBe("ar");
    expect(order.city).toBe("Casablanca");
    // 2 x 200 + 1 x 300 (variant price override), computed server-side.
    expect(order.subtotal).toBe(70000);
    expect(order.shippingFee).toBe(0);
    expect(order.total).toBe(70000);

    const jean = order.items.find((item) => item.variantId === fx.v1)!;
    expect(jean).toMatchObject({
      productName: "جينز مستقيم", // order locale
      colorName: "أسود",
      sizeLabel: "42",
      sku: "JEA-001-42",
      unitPrice: 20000,
      quantity: 2,
      image: "https://example.test/jean.png",
    });
    expect(order.items.find((item) => item.variantId === fx.v2)!.unitPrice).toBe(30000);

    expect(order.statusEvents).toHaveLength(1);
    expect(order.statusEvents[0]).toMatchObject({ from: null, to: "NEW", adminUserId: null });
  });

  it("falls back to the French name when the locale has no translation", async () => {
    const result = await createOrder(orderInput([{ variantId: fx.v3, quantity: 1 }], { locale: "en" }));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const item = await db.orderItem.findFirstOrThrow({ where: { orderId: result.order.id } });
    expect(item.productName).toBe("Veste");
    expect(item.colorName).toBe("Noir");
  });

  it("aborts with a per-line issue and writes nothing when one line is short", async () => {
    const result = await createOrder(
      orderInput([
        { variantId: fx.v1, quantity: 1 }, // fine
        { variantId: fx.v2, quantity: 3 }, // only 2 in stock
      ]),
    );
    expect(result).toEqual({
      ok: false,
      reason: "stock",
      issues: [{ variantId: fx.v2, available: 2 }],
    });
    // No partial writes: the first line was not decremented either.
    expect(await stockOf(fx.v1)).toBe(5);
    expect(await stockOf(fx.v2)).toBe(2);
    expect(await db.order.count()).toBe(0);
    expect(await db.orderItem.count()).toBe(0);
    expect(await db.orderStatusEvent.count()).toBe(0);
  });

  it("treats an unknown variant as unavailable", async () => {
    const result = await createOrder(orderInput([{ variantId: "does-not-exist", quantity: 1 }]));
    expect(result).toEqual({
      ok: false,
      reason: "stock",
      issues: [{ variantId: "does-not-exist", available: 0 }],
    });
  });

  it("never oversells under concurrent orders", async () => {
    const results = await Promise.all([
      createOrder(orderInput([{ variantId: fx.v2, quantity: 2 }])),
      createOrder(orderInput([{ variantId: fx.v2, quantity: 2 }])),
    ]);
    expect(results.filter((r) => r.ok)).toHaveLength(1);
    expect(results.filter((r) => !r.ok && r.reason === "stock")).toHaveLength(1);
    expect(await stockOf(fx.v2)).toBe(0);
    expect(await db.order.count()).toBe(1);
  });

  it("is idempotent: the same key creates one order and decrements once", async () => {
    const input = orderInput([{ variantId: fx.v1, quantity: 2 }]);
    const first = await createOrder(input);
    const second = await createOrder(input);
    expect(first.ok && second.ok).toBe(true);
    if (!first.ok || !second.ok) return;
    expect(first.duplicate).toBe(false);
    expect(second.duplicate).toBe(true);
    expect(second.order.number).toBe(first.order.number);
    expect(await db.order.count()).toBe(1);
    expect(await stockOf(fx.v1)).toBe(3);
  });

  it("is idempotent when the same key is submitted concurrently", async () => {
    const input = orderInput([{ variantId: fx.v1, quantity: 2 }]);
    const results = await Promise.all([createOrder(input), createOrder(input), createOrder(input)]);
    expect(results.every((r) => r.ok)).toBe(true);
    expect(new Set(results.map((r) => r.ok && r.order.number)).size).toBe(1);
    expect(await db.order.count()).toBe(1);
    expect(await stockOf(fx.v1)).toBe(3);
  });

  it("charges shipping below the threshold and not from the threshold", async () => {
    const below = await createOrder(orderInput([{ variantId: fx.v1, quantity: 1 }])); // 200 MAD
    expect(below.ok && (await db.order.findUniqueOrThrow({ where: { id: below.order.id } }))).toMatchObject({
      subtotal: 20000,
      shippingFee: 3000,
      total: 23000,
    });

    await db.settings.update({ where: { id: "singleton" }, data: { freeShippingThreshold: 40000 } });
    const exactly = await createOrder(orderInput([{ variantId: fx.v1, quantity: 2 }])); // 400 MAD
    expect(exactly.ok && (await db.order.findUniqueOrThrow({ where: { id: exactly.order.id } }))).toMatchObject({
      subtotal: 40000,
      shippingFee: 0,
      total: 40000,
    });
  });

  it("uses the city shipping fee override, but free shipping still wins", async () => {
    const withFee = await createOrder(
      orderInput([{ variantId: fx.v1, quantity: 1 }], { cityId: fx.cityFee }),
    );
    expect(withFee.ok && (await db.order.findUniqueOrThrow({ where: { id: withFee.order.id } })).shippingFee).toBe(5000);

    const free = await createOrder(
      orderInput([{ variantId: fx.v3, quantity: 1 }], { cityId: fx.cityFee }), // 600 MAD
    );
    expect(free.ok && (await db.order.findUniqueOrThrow({ where: { id: free.order.id } })).shippingFee).toBe(0);
  });

  it("rejects an unknown city and an empty cart", async () => {
    expect(await createOrder(orderInput([{ variantId: fx.v1, quantity: 1 }], { cityId: "nope" }))).toEqual({
      ok: false,
      reason: "city",
    });
    expect(await createOrder(orderInput([]))).toEqual({ ok: false, reason: "empty" });
    expect(await stockOf(fx.v1)).toBe(5);
  });
});

describe("computeShipping", () => {
  const rules = { shippingFee: 3000, freeShippingThreshold: 49900 };
  it("charges the flat fee below the threshold", () => {
    expect(computeShipping(49899, rules)).toBe(3000);
  });
  it("is free at and above the threshold", () => {
    expect(computeShipping(49900, rules)).toBe(0);
    expect(computeShipping(80000, { ...rules, cityShippingFee: 5000 })).toBe(0);
  });
  it("prefers the city override over the flat fee", () => {
    expect(computeShipping(1000, { ...rules, cityShippingFee: 5000 })).toBe(5000);
    expect(computeShipping(1000, { ...rules, cityShippingFee: 0 })).toBe(0);
  });
});

describe("transitionOrder", () => {
  async function newOrder(quantity = 2) {
    const result = await createOrder(orderInput([{ variantId: fx.v1, quantity }]));
    if (!result.ok) throw new Error("fixture order failed");
    return result.order.id;
  }

  it("matches the documented transition map", () => {
    expect(ALLOWED_TRANSITIONS).toEqual({
      NEW: ["CONFIRMED", "CANCELLED"],
      CONFIRMED: ["SHIPPED", "CANCELLED"],
      SHIPPED: ["DELIVERED", "RETURNED"],
      DELIVERED: ["RETURNED"],
      CANCELLED: [],
      RETURNED: [],
    });
    expect(canTransition("NEW", "SHIPPED")).toBe(false);
  });

  it("walks the happy path and records an event per change", async () => {
    const admin = await db.adminUser.create({
      data: { email: "admin@example.test", passwordHash: "x", name: "Admin" },
    });
    const id = await newOrder();
    expect(await transitionOrder(id, "CONFIRMED", { adminUserId: admin.id, note: "called" })).toEqual({
      ok: true,
      from: "NEW",
      to: "CONFIRMED",
    });
    await transitionOrder(id, "SHIPPED");
    await transitionOrder(id, "DELIVERED");

    const order = await db.order.findUniqueOrThrow({
      where: { id },
      include: { statusEvents: { orderBy: { createdAt: "asc" } } },
    });
    expect(order.status).toBe("DELIVERED");
    expect(order.statusEvents.map((e) => [e.from, e.to])).toEqual([
      [null, "NEW"],
      ["NEW", "CONFIRMED"],
      ["CONFIRMED", "SHIPPED"],
      ["SHIPPED", "DELIVERED"],
    ]);
    expect(order.statusEvents[1]).toMatchObject({ adminUserId: admin.id, note: "called" });
    expect(order.statusEvents[2].adminUserId).toBeNull(); // system event
    expect(await stockOf(fx.v1)).toBe(3); // delivery does not touch stock
  });

  it("refuses forbidden transitions without any write", async () => {
    const id = await newOrder();
    expect(await transitionOrder(id, "SHIPPED")).toEqual({ ok: false, reason: "forbidden", from: "NEW" });
    expect(await transitionOrder(id, "DELIVERED")).toMatchObject({ ok: false, reason: "forbidden" });
    expect(await transitionOrder(id, "RETURNED")).toMatchObject({ ok: false, reason: "forbidden" });
    expect(await transitionOrder(id, "NEW")).toMatchObject({ ok: false, reason: "forbidden" });
    expect((await db.order.findUniqueOrThrow({ where: { id } })).status).toBe("NEW");
    expect(await db.orderStatusEvent.count({ where: { orderId: id } })).toBe(1);
    expect(await stockOf(fx.v1)).toBe(3);

    await transitionOrder(id, "CONFIRMED");
    await transitionOrder(id, "SHIPPED");
    await transitionOrder(id, "DELIVERED");
    // A delivered order cannot be cancelled, only returned.
    expect(await transitionOrder(id, "CANCELLED")).toMatchObject({ ok: false, reason: "forbidden" });
    expect(await transitionOrder("missing-id", "CONFIRMED")).toEqual({ ok: false, reason: "not_found" });
  });

  it("restores stock when an order is cancelled, once", async () => {
    const id = await newOrder(2);
    expect(await stockOf(fx.v1)).toBe(3);
    expect(await transitionOrder(id, "CANCELLED")).toMatchObject({ ok: true });
    expect(await stockOf(fx.v1)).toBe(5);
    // Terminal state: a second cancel or a return cannot restore stock again.
    expect(await transitionOrder(id, "CANCELLED")).toMatchObject({ ok: false, reason: "forbidden" });
    expect(await transitionOrder(id, "RETURNED")).toMatchObject({ ok: false, reason: "forbidden" });
    expect(await stockOf(fx.v1)).toBe(5);
  });

  it("restores stock when a delivered order is returned", async () => {
    const id = await newOrder(3);
    await transitionOrder(id, "CONFIRMED");
    await transitionOrder(id, "SHIPPED");
    await transitionOrder(id, "DELIVERED");
    expect(await stockOf(fx.v1)).toBe(2);
    expect(await transitionOrder(id, "RETURNED")).toMatchObject({ ok: true });
    expect(await stockOf(fx.v1)).toBe(5);
  });

  it("survives a deleted variant (re-seed): snapshot stays, nothing to restore", async () => {
    const id = await newOrder(2);
    await db.product.deleteMany(); // what the seed does; OrderItem.variantId -> NULL
    const item = await db.orderItem.findFirstOrThrow({ where: { orderId: id } });
    expect(item.variantId).toBeNull();
    expect(item.productName).toBe("Jean Droit");
    expect(await transitionOrder(id, "CANCELLED")).toMatchObject({ ok: true });
  });
});
