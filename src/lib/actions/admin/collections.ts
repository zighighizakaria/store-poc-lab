"use server";

import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { fail, formToObject, success, textOf, type FormState } from "@/lib/admin/form";
import { redirectWithNotice, revalidateAdmin, revalidateStorefront } from "@/lib/admin/revalidate";
import { requireAdmin } from "@/lib/admin/session";
import { ADMIN_LOCALES, buildNamedTranslations, slugConflicts } from "@/lib/admin/translations";
import { mediaAssetExists } from "@/lib/media/library";

const refresh = (id?: string) => {
  revalidateAdmin("/admin/collections", ...(id ? [`/admin/collections/${id}`] : []));
  revalidateStorefront();
};

/** Create or update a collection: translations, image, flags and its ordered products. */
export async function saveCollection(_previous: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  const id = textOf(formData, "id") || null;
  const isActive = formData.get("isActive") === "on";
  const showOnHome = formData.get("showOnHome") === "on";
  const requested = [...new Set(formData.getAll("productIds").map(String).filter(Boolean))];

  const built = buildNamedTranslations(formToObject(formData));
  if (!built.ok) return fail("Corrigez les champs en erreur.", built.fieldErrors);

  const existing = id ? await db.collection.findUnique({ where: { id }, select: { id: true } }) : null;
  if (id && !existing) return fail("Collection introuvable.");

  const found = await db.product.findMany({ where: { id: { in: requested } }, select: { id: true } });
  const foundIds = new Set(found.map((p) => p.id));
  const productIds = requested.filter((p) => foundIds.has(p)); // keeps the admin's order

  const conflicts = await slugConflicts(
    "collection",
    Object.fromEntries(ADMIN_LOCALES.map((l) => [l, built.rows[l]?.slug])),
    id ?? undefined,
  );
  if (Object.keys(conflicts).length > 0) return fail("Un slug est déjà utilisé.", conflicts);

  const mediaAssetId = textOf(formData, "mediaAssetId") || null;
  if (mediaAssetId && !(await mediaAssetExists(mediaAssetId))) {
    return fail("Image introuvable.", { mediaAssetId: "Image introuvable" });
  }

  const rows = ADMIN_LOCALES.flatMap((locale) => {
    const t = built.rows[locale];
    return t ? [{ locale, ...t }] : [];
  });

  let savedId: string;
  try {
    savedId = await db.$transaction(async (tx) => {
      let collectionId: string;
      if (!existing) {
        const last = await tx.collection.aggregate({ _max: { position: true } });
        const created = await tx.collection.create({
          data: {
            isActive,
            showOnHome,
            mediaAssetId,
            position: (last._max.position ?? -1) + 1,
            translations: { create: rows },
          },
          select: { id: true },
        });
        collectionId = created.id;
      } else {
        collectionId = existing.id;
        await tx.collection.update({
          where: { id: collectionId },
          data: { isActive, showOnHome, mediaAssetId },
        });
        for (const locale of ADMIN_LOCALES) {
          const t = built.rows[locale];
          if (t) {
            await tx.collectionTranslation.upsert({
              where: { collectionId_locale: { collectionId, locale } },
              update: t,
              create: { collectionId, locale, ...t },
            });
          } else {
            await tx.collectionTranslation.deleteMany({ where: { collectionId, locale } });
          }
        }
      }

      await tx.productCollection.deleteMany({ where: { collectionId, productId: { notIn: productIds } } });
      for (const [position, productId] of productIds.entries()) {
        await tx.productCollection.upsert({
          where: { productId_collectionId: { productId, collectionId } },
          update: { position },
          create: { productId, collectionId, position },
        });
      }
      return collectionId;
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return fail("Un slug est déjà utilisé (modifié entre-temps). Réessayez.");
    }
    throw error;
  }

  refresh(savedId);
  if (!existing) redirectWithNotice(`/admin/collections/${savedId}`, { notice: "Collection créée." });
  return success("Collection enregistrée.");
}

export async function toggleCollectionActive(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = textOf(formData, "id");
  const collection = await db.collection.findUnique({ where: { id }, select: { isActive: true } });
  if (!collection) redirectWithNotice("/admin/collections", { error: "Collection introuvable." });
  await db.collection.update({ where: { id }, data: { isActive: !collection.isActive } });
  refresh(id);
  redirectWithNotice("/admin/collections", {
    notice: collection.isActive ? "Collection désactivée." : "Collection activée.",
  });
}

/** A collection that still holds products is deactivated (archived); an empty one is deleted. */
export async function deleteCollection(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = textOf(formData, "id");
  const collection = await db.collection.findUnique({
    where: { id },
    select: { id: true, _count: { select: { products: true } } },
  });
  if (!collection) redirectWithNotice("/admin/collections", { error: "Collection introuvable." });

  if (collection._count.products > 0) {
    await db.collection.update({ where: { id }, data: { isActive: false } });
    refresh(id);
    redirectWithNotice("/admin/collections", {
      notice: `Collection contenant ${collection._count.products} produit(s) : désactivée au lieu d'être supprimée. Retirez ses produits pour pouvoir la supprimer.`,
    });
  }
  await db.collection.delete({ where: { id } });
  refresh();
  redirectWithNotice("/admin/collections", { notice: "Collection supprimée." });
}
