"use server";

import { Prisma } from "@prisma/client";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { fail, formToObject, success, textOf, type FormState } from "@/lib/admin/form";
import { parseProductForm } from "@/lib/admin/product-schema";
import { revalidateAdmin, revalidateStorefront, redirectWithNotice } from "@/lib/admin/revalidate";
import { requireAdmin } from "@/lib/admin/session";
import { slugConflicts } from "@/lib/admin/translations";
import { removeStoredImage } from "@/lib/storage";

/** Create or update a product (translations, category, collections, price, status). */
export async function saveProduct(_previous: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();

  const id = textOf(formData, "id") || null;
  const parsed = parseProductForm(formToObject(formData));
  if (!parsed.success) return fail("Corrigez les champs en erreur.", parsed.fieldErrors);
  const data = parsed.data;

  const existing = id
    ? await db.product.findUnique({ where: { id }, select: { id: true, publishedAt: true } })
    : null;
  if (id && !existing) return fail("Produit introuvable.");

  const [category, collections] = await Promise.all([
    db.category.findUnique({ where: { id: data.categoryId }, select: { id: true } }),
    db.collection.findMany({ where: { id: { in: data.collectionIds } }, select: { id: true } }),
  ]);
  if (!category) return fail("Corrigez les champs en erreur.", { categoryId: "Catégorie introuvable" });
  const collectionIds = collections.map((c) => c.id);

  const conflicts = await slugConflicts(
    "product",
    { fr: data.translations.fr.slug, ar: data.translations.ar?.slug, en: data.translations.en?.slug },
    id ?? undefined,
  );
  if (Object.keys(conflicts).length > 0) return fail("Un slug est déjà utilisé.", conflicts);

  // Going live without a date = published now (drives "Nouveautés").
  const publishedAt =
    data.publishedAt ?? (data.status === "ACTIVE" ? (existing?.publishedAt ?? new Date()) : null);
  const scalar = {
    categoryId: data.categoryId,
    price: data.price,
    compareAtPrice: data.compareAtPrice,
    status: data.status,
    isFeatured: data.isFeatured,
    publishedAt,
  };
  const rows = (["fr", "ar", "en"] as const).flatMap((locale) => {
    const t = data.translations[locale];
    return t ? [{ locale, ...t }] : [];
  });

  let productId: string;
  try {
    productId = await db.$transaction(async (tx) => {
      if (!existing) {
        const created = await tx.product.create({
          data: {
            ...scalar,
            translations: { create: rows },
          },
          select: { id: true },
        });
        await attachCollections(tx, created.id, collectionIds, []);
        return created.id;
      }

      await tx.product.update({ where: { id: existing.id }, data: scalar });
      for (const locale of ["fr", "ar", "en"] as const) {
        const t = data.translations[locale];
        if (t) {
          await tx.productTranslation.upsert({
            where: { productId_locale: { productId: existing.id, locale } },
            update: t,
            create: { productId: existing.id, locale, ...t },
          });
        } else {
          await tx.productTranslation.deleteMany({ where: { productId: existing.id, locale } });
        }
      }
      const current = await tx.productCollection.findMany({
        where: { productId: existing.id },
        select: { collectionId: true },
      });
      await attachCollections(
        tx,
        existing.id,
        collectionIds,
        current.map((c) => c.collectionId),
      );
      return existing.id;
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return fail("Un slug est déjà utilisé (modifié entre-temps). Réessayez.");
    }
    throw error;
  }

  revalidateAdmin("/admin/products", `/admin/products/${productId}`, "/admin");
  revalidateStorefront();

  if (!existing) {
    redirectWithNotice(`/admin/products/${productId}`, {
      notice: "Produit créé. Ajoutez maintenant des images et des variantes.",
    });
  }
  const variantCount = await db.variant.count({ where: { productId } });
  return success(
    data.status === "ACTIVE" && variantCount === 0
      ? "Produit enregistré. Ajoutez des variantes (couleurs × tailles) pour pouvoir le vendre."
      : "Produit enregistré.",
  );
}

async function attachCollections(
  tx: Prisma.TransactionClient,
  productId: string,
  wanted: string[],
  current: string[],
) {
  const toRemove = current.filter((c) => !wanted.includes(c));
  if (toRemove.length > 0) {
    await tx.productCollection.deleteMany({ where: { productId, collectionId: { in: toRemove } } });
  }
  for (const collectionId of wanted.filter((c) => !current.includes(c))) {
    const last = await tx.productCollection.aggregate({
      where: { collectionId },
      _max: { position: true },
    });
    await tx.productCollection.create({
      data: { productId, collectionId, position: (last._max.position ?? -1) + 1 },
    });
  }
}

const idsSchema = z.array(z.string().min(1).max(64)).min(1).max(200);

/** Bulk archive from the products table (soft: status ARCHIVED, nothing deleted). */
export async function bulkArchiveProducts(formData: FormData): Promise<void> {
  await requireAdmin();
  const parsed = idsSchema.safeParse(formData.getAll("ids").map(String));
  if (!parsed.success) redirectWithNotice("/admin/products", { error: "Sélectionnez au moins un produit." });

  const result = await db.product.updateMany({
    where: { id: { in: parsed.data }, status: { not: "ARCHIVED" } },
    data: { status: "ARCHIVED" },
  });
  revalidateAdmin("/admin/products", "/admin");
  revalidateStorefront();
  redirectWithNotice("/admin/products", { notice: `${result.count} produit(s) archivé(s).` });
}

/**
 * Delete rule: a product that appears in orders (through its variants) is only
 * archived, so past orders stay traceable; an unused product is deleted for
 * good (variants, images and links cascade) together with its files.
 */
export async function deleteProduct(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = textOf(formData, "id");
  const product = await db.product.findUnique({
    where: { id },
    select: { id: true, images: { select: { url: true } } },
  });
  if (!product) redirectWithNotice("/admin/products", { error: "Produit introuvable." });

  const used = await db.orderItem.count({ where: { variant: { productId: id } } });
  if (used > 0) {
    await db.product.update({ where: { id }, data: { status: "ARCHIVED" } });
    revalidateAdmin("/admin/products", `/admin/products/${id}`, "/admin");
    revalidateStorefront();
    redirectWithNotice("/admin/products", {
      notice: `Produit présent dans ${used} ligne(s) de commande : archivé au lieu d'être supprimé.`,
    });
  }

  await db.product.delete({ where: { id } });
  await Promise.all(product.images.map((image) => removeStoredImage(image.url)));
  revalidateAdmin("/admin/products", "/admin");
  revalidateStorefront();
  redirect("/admin/products?notice=" + encodeURIComponent("Produit supprimé."));
}
