import { NextResponse } from "next/server";
import { z } from "zod";
import type { CartLine, CartResponse } from "@/lib/cart-types";
import { db } from "@/lib/db";
import { getTranslation } from "@/lib/i18n";
import { mediaAssetUrl } from "@/lib/media/url";
import { productPath } from "@/lib/routes";
import { getSettings } from "@/lib/settings";
import { routing } from "@/i18n/routing";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  locale: z.enum(routing.locales),
  items: z
    .array(
      z.object({
        variantId: z.string().min(1).max(64),
        quantity: z.number().int().min(1).max(99),
      }),
    )
    .max(50),
});

// The client only stores {variantId, quantity}. This endpoint re-reads price,
// name, image and stock from the database so nothing price-related is trusted
// from the browser. Variants that no longer exist are simply omitted.
export async function POST(request: Request) {
  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }
  const { locale, items } = parsed.data;

  const [variants, settings] = await Promise.all([
    db.variant.findMany({
      where: { id: { in: items.map((i) => i.variantId) }, product: { status: "ACTIVE" } },
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
    }),
    getSettings(),
  ]);
  const byId = new Map(variants.map((v) => [v.id, v]));

  const lines: CartLine[] = [];
  for (const item of items) {
    const variant = byId.get(item.variantId);
    if (!variant) continue;
    const { product } = variant;
    const compareAtPrice =
      variant.price === null && product.compareAtPrice && product.compareAtPrice > product.price
        ? product.compareAtPrice
        : null;
    const image =
      product.images.find((img) => img.colorId === variant.colorId) ?? product.images[0];
    const quantity = Math.min(item.quantity, Math.max(variant.stock, 0));

    lines.push({
      variantId: variant.id,
      name: getTranslation(product, locale).name,
      href: productPath(getTranslation(product, locale).slug),
      colorName: getTranslation(variant.color, locale).name,
      sizeLabel: variant.size.label,
      image: mediaAssetUrl(image?.mediaAsset),
      unitPrice: variant.price ?? product.price,
      compareAtPrice,
      stock: variant.stock,
      quantity,
      available: quantity > 0,
    });
  }

  const subtotal = lines.reduce((sum, l) => sum + l.unitPrice * l.quantity, 0);
  const body: CartResponse = {
    lines,
    subtotal,
    shippingFee: settings.shippingFee,
    freeShippingThreshold: settings.freeShippingThreshold,
  };
  return NextResponse.json(body, { headers: { "Cache-Control": "no-store" } });
}
