"use server";

import { Prisma } from "@prisma/client";
import { z } from "zod";
import { db } from "@/lib/db";
import { fail, parseMad, success, textOf, type FormState } from "@/lib/admin/form";
import { revalidateAdmin, revalidateStorefront } from "@/lib/admin/revalidate";
import { requireAdmin } from "@/lib/admin/session";
import { getTranslation } from "@/lib/i18n";

const refresh = (productId: string) => {
  revalidateAdmin(`/admin/products/${productId}`, "/admin/products", "/admin");
  revalidateStorefront();
};

/** "Été Noir" -> "ETE" (A-Z0-9 only, accents stripped). */
function skuPart(text: string, length: number): string {
  const clean = text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
  return clean.slice(0, length) || "X";
}

const generateSchema = z.object({
  productId: z.string().min(1).max(64),
  colorIds: z.array(z.string().min(1)).min(1, "Choisissez au moins une couleur").max(30),
  sizeIds: z.array(z.string().min(1)).min(1, "Choisissez au moins une taille").max(30),
});

/** Create the missing rows of the colors x sizes matrix (stock 0, generated unique SKU). */
export async function generateVariants(_previous: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  const parsed = generateSchema.safeParse({
    productId: textOf(formData, "productId"),
    colorIds: formData.getAll("colorIds").map(String),
    sizeIds: formData.getAll("sizeIds").map(String),
  });
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) fieldErrors[String(issue.path[0])] ??= issue.message;
    return fail(parsed.error.issues[0].message, fieldErrors);
  }
  const { productId, colorIds, sizeIds } = parsed.data;

  const [product, colors, sizes, existing] = await Promise.all([
    db.product.findUnique({ where: { id: productId }, include: { translations: true } }),
    db.color.findMany({ where: { id: { in: colorIds } }, include: { translations: true } }),
    db.size.findMany({ where: { id: { in: sizeIds } } }),
    db.variant.findMany({ where: { productId }, select: { colorId: true, sizeId: true } }),
  ]);
  if (!product) return fail("Produit introuvable.");

  const have = new Set(existing.map((v) => `${v.colorId}:${v.sizeId}`));
  const base = skuPart(getTranslation(product, "fr").name, 6);
  const tail = skuPart(productId.slice(-4), 4);

  const wanted: { colorId: string; sizeId: string; sku: string }[] = [];
  for (const color of colors) {
    for (const size of sizes) {
      if (have.has(`${color.id}:${size.id}`)) continue;
      const sku = `${base}-${tail}-${skuPart(getTranslation(color, "fr").name, 3)}-${skuPart(size.label, 6)}`;
      wanted.push({ colorId: color.id, sizeId: size.id, sku });
    }
  }
  if (wanted.length === 0) return success("Toutes ces variantes existent déjà.");

  // SKUs are unique store-wide: add -2, -3... on collision.
  const taken = new Set(
    (await db.variant.findMany({ where: { sku: { startsWith: `${base}-${tail}-` } }, select: { sku: true } })).map(
      (v) => v.sku,
    ),
  );
  const used = new Set(taken);
  for (const row of wanted) {
    let sku = row.sku;
    for (let n = 2; used.has(sku); n++) sku = `${row.sku}-${n}`;
    row.sku = sku;
    used.add(sku);
  }

  try {
    await db.variant.createMany({ data: wanted.map((row) => ({ ...row, productId, stock: 0 })) });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return fail("Conflit de SKU ou de variante existante. Réessayez.");
    }
    throw error;
  }
  refresh(productId);
  return success(`${wanted.length} variante(s) créée(s). Renseignez maintenant le stock.`);
}

const SKU_REGEX = /^[A-Za-z0-9._-]{1,64}$/;

/** Save SKU / stock / price override of every row of the variants table. */
export async function saveVariants(_previous: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  const productId = textOf(formData, "productId");
  const ids = formData.getAll("ids").map(String);
  if (ids.length === 0) return fail("Aucune variante à enregistrer.");

  const current = await db.variant.findMany({ where: { productId, id: { in: ids } } });
  const byId = new Map(current.map((v) => [v.id, v]));

  const fieldErrors: Record<string, string> = {};
  const updates: { id: string; sku: string; stock?: number; price: number | null }[] = [];
  const seenSkus = new Map<string, string>();

  for (const id of ids) {
    const row = byId.get(id);
    if (!row) return fail("Une variante n'existe plus. Rechargez la page.");

    const sku = textOf(formData, `sku_${id}`).trim();
    if (!SKU_REGEX.test(sku)) {
      fieldErrors[`sku_${id}`] = "SKU invalide (lettres, chiffres, . _ -)";
    } else if (seenSkus.has(sku)) {
      fieldErrors[`sku_${id}`] = "SKU en double dans le tableau";
    }
    seenSkus.set(sku, id);

    const stockText = textOf(formData, `stock_${id}`).trim();
    const stock = /^\d{1,6}$/.test(stockText) ? Number(stockText) : null;
    if (stock === null) fieldErrors[`stock_${id}`] = "Entier ≥ 0";

    const priceText = textOf(formData, `price_${id}`).trim();
    const price = priceText === "" ? null : parseMad(priceText);
    if (priceText !== "" && (price === null || price <= 0)) fieldErrors[`price_${id}`] = "Montant invalide";

    // Stock is only written when the admin changed it: a stale form must not
    // overwrite stock moved by an order placed in the meantime.
    const stockBefore = Number(textOf(formData, `stock0_${id}`));
    updates.push({
      id,
      sku,
      stock: stock !== null && stock !== stockBefore ? stock : undefined,
      price: priceText === "" ? null : price,
    });
  }
  if (Object.keys(fieldErrors).length > 0) return fail("Corrigez les lignes en erreur.", fieldErrors);

  const clash = await db.variant.findMany({
    where: { sku: { in: updates.map((u) => u.sku) }, id: { notIn: ids } },
    select: { sku: true },
  });
  if (clash.length > 0) {
    for (const row of clash) {
      const id = seenSkus.get(row.sku);
      if (id) fieldErrors[`sku_${id}`] = "SKU déjà utilisé par une autre variante";
    }
    return fail("Un SKU est déjà utilisé.", fieldErrors);
  }

  try {
    await db.$transaction(
      updates.map((u) =>
        db.variant.update({
          where: { id: u.id },
          data: { sku: u.sku, price: u.price, ...(u.stock === undefined ? {} : { stock: u.stock }) },
        }),
      ),
    );
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return fail("Un SKU est déjà utilisé (échange de SKU entre deux lignes impossible en une fois).");
    }
    throw error;
  }
  refresh(productId);
  return success("Variantes enregistrées.");
}

export type DeleteVariantResult = { ok: true } | { ok: false; error: string };

/**
 * A variant row can be deleted unless an order still in progress (NEW,
 * CONFIRMED, SHIPPED) contains it: cancelling that order could not restore
 * stock to a deleted row. Finished orders keep their snapshot (variantId
 * becomes null).
 */
export async function deleteVariant(variantId: string): Promise<DeleteVariantResult> {
  await requireAdmin();
  const variant = await db.variant.findUnique({ where: { id: variantId }, select: { id: true, productId: true } });
  if (!variant) return { ok: false, error: "Variante introuvable." };

  const open = await db.orderItem.count({
    where: { variantId, order: { status: { in: ["NEW", "CONFIRMED", "SHIPPED"] } } },
  });
  if (open > 0) {
    return {
      ok: false,
      error: `Suppression impossible : ${open} commande(s) en cours contiennent cette variante (le stock ne pourrait pas être restitué en cas d'annulation). Mettez le stock à 0 à la place.`,
    };
  }
  await db.variant.delete({ where: { id: variantId } });
  refresh(variant.productId);
  return { ok: true };
}
