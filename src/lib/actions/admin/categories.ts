"use server";

import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { loadCategoryOptions } from "@/lib/admin/categories";
import { fail, fileOf, formToObject, success, textOf, type FormState } from "@/lib/admin/form";
import { redirectWithNotice, revalidateAdmin, revalidateStorefront } from "@/lib/admin/revalidate";
import { requireAdmin } from "@/lib/admin/session";
import { ADMIN_LOCALES, buildNamedTranslations, slugConflicts } from "@/lib/admin/translations";
import { removeStoredImage, storeImage } from "@/lib/storage";

const refresh = (id?: string) => {
  revalidateAdmin("/admin/categories", "/admin/products", ...(id ? [`/admin/categories/${id}`] : []));
  revalidateStorefront();
};

/** Create or update a category: translations, parent, size guide, image, active flag. */
export async function saveCategory(_previous: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  const id = textOf(formData, "id") || null;
  const parentId = textOf(formData, "parentId") || null;
  const sizeGuideId = textOf(formData, "sizeGuideId") || null;
  const isActive = formData.get("isActive") === "on";

  const built = buildNamedTranslations(formToObject(formData));
  if (!built.ok) return fail("Corrigez les champs en erreur.", built.fieldErrors);

  const existing = id ? await db.category.findUnique({ where: { id }, select: { id: true, image: true } }) : null;
  if (id && !existing) return fail("Catégorie introuvable.");

  if (parentId) {
    const options = await loadCategoryOptions();
    const self = options.find((o) => o.id === id);
    if (!options.some((o) => o.id === parentId)) return fail("Catégorie parente introuvable.", { parentId: "Introuvable" });
    if (self?.subtreeIds.includes(parentId)) {
      return fail("Une catégorie ne peut pas être placée sous elle-même.", {
        parentId: "Choisissez une autre catégorie parente",
      });
    }
  }
  if (sizeGuideId && !(await db.sizeGuide.findUnique({ where: { id: sizeGuideId }, select: { id: true } }))) {
    return fail("Guide des tailles introuvable.", { sizeGuideId: "Introuvable" });
  }

  const conflicts = await slugConflicts(
    "category",
    Object.fromEntries(ADMIN_LOCALES.map((l) => [l, built.rows[l]?.slug])),
    id ?? undefined,
  );
  if (Object.keys(conflicts).length > 0) return fail("Un slug est déjà utilisé.", conflicts);

  // Image: new upload replaces the old one; the checkbox removes it.
  let image: string | null | undefined; // undefined = unchanged
  const file = fileOf(formData, "image");
  if (file) {
    const stored = await storeImage(file, "categories");
    if (!stored.ok) return fail("Image refusée.", { image: stored.error });
    image = stored.url;
  } else if (formData.get("removeImage") === "on") {
    image = null;
  }

  const rows = ADMIN_LOCALES.flatMap((locale) => {
    const t = built.rows[locale];
    return t ? [{ locale, ...t }] : [];
  });

  let savedId: string;
  try {
    savedId = await db.$transaction(async (tx) => {
      if (!existing) {
        const last = await tx.category.aggregate({ where: { parentId }, _max: { position: true } });
        const created = await tx.category.create({
          data: {
            parentId,
            sizeGuideId,
            isActive,
            image: image ?? null,
            position: (last._max.position ?? -1) + 1,
            translations: { create: rows },
          },
          select: { id: true },
        });
        return created.id;
      }
      const moved = (await tx.category.findUnique({ where: { id: existing.id }, select: { parentId: true } }))?.parentId !== parentId;
      let position: number | undefined;
      if (moved) {
        const last = await tx.category.aggregate({ where: { parentId }, _max: { position: true } });
        position = (last._max.position ?? -1) + 1;
      }
      await tx.category.update({
        where: { id: existing.id },
        data: { parentId, sizeGuideId, isActive, ...(image === undefined ? {} : { image }), ...(position === undefined ? {} : { position }) },
      });
      for (const locale of ADMIN_LOCALES) {
        const t = built.rows[locale];
        if (t) {
          await tx.categoryTranslation.upsert({
            where: { categoryId_locale: { categoryId: existing.id, locale } },
            update: t,
            create: { categoryId: existing.id, locale, ...t },
          });
        } else {
          await tx.categoryTranslation.deleteMany({ where: { categoryId: existing.id, locale } });
        }
      }
      return existing.id;
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return fail("Un slug est déjà utilisé (modifié entre-temps). Réessayez.");
    }
    throw error;
  }

  if (image !== undefined && existing?.image && existing.image !== image) await removeStoredImage(existing.image);
  refresh(savedId);
  if (!existing) redirectWithNotice(`/admin/categories/${savedId}`, { notice: "Catégorie créée." });
  return success("Catégorie enregistrée.");
}

/** Swap with the previous / next sibling. Positions are renumbered 0..n. */
export async function moveCategory(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = textOf(formData, "id");
  const direction = textOf(formData, "direction") === "up" ? "up" : "down";
  const category = await db.category.findUnique({ where: { id }, select: { parentId: true } });
  if (!category) redirectWithNotice("/admin/categories", { error: "Catégorie introuvable." });

  const siblings = await db.category.findMany({
    where: { parentId: category.parentId },
    orderBy: [{ position: "asc" }, { createdAt: "asc" }],
    select: { id: true },
  });
  const from = siblings.findIndex((s) => s.id === id);
  const to = direction === "up" ? from - 1 : from + 1;
  if (to >= 0 && to < siblings.length) {
    [siblings[from], siblings[to]] = [siblings[to], siblings[from]];
    await db.$transaction(
      siblings.map((s, position) => db.category.update({ where: { id: s.id }, data: { position } })),
    );
    refresh();
  }
  redirectWithNotice("/admin/categories", { notice: "Ordre mis à jour." });
}

/** Move a category under another parent (or to the root). */
export async function reparentCategory(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = textOf(formData, "id");
  const parentId = textOf(formData, "parentId") || null;
  const options = await loadCategoryOptions();
  const self = options.find((o) => o.id === id);
  if (!self) redirectWithNotice("/admin/categories", { error: "Catégorie introuvable." });
  if (parentId && (!options.some((o) => o.id === parentId) || self.subtreeIds.includes(parentId))) {
    redirectWithNotice("/admin/categories", {
      error: "Déplacement impossible : une catégorie ne peut pas être placée sous elle-même ou l'une de ses sous-catégories.",
    });
  }
  if (self.parentId !== parentId) {
    const last = await db.category.aggregate({ where: { parentId }, _max: { position: true } });
    await db.category.update({ where: { id }, data: { parentId, position: (last._max.position ?? -1) + 1 } });
    refresh();
  }
  redirectWithNotice("/admin/categories", { notice: "Catégorie déplacée." });
}

export async function toggleCategoryActive(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = textOf(formData, "id");
  const category = await db.category.findUnique({ where: { id }, select: { isActive: true } });
  if (!category) redirectWithNotice("/admin/categories", { error: "Catégorie introuvable." });
  await db.category.update({ where: { id }, data: { isActive: !category.isActive } });
  refresh(id);
  redirectWithNotice("/admin/categories", {
    notice: category.isActive ? "Catégorie désactivée." : "Catégorie activée.",
  });
}

/**
 * A category with products or sub-categories is only deactivated (soft
 * archive: it leaves the storefront, nothing is lost). An empty one is deleted.
 */
export async function deleteCategory(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = textOf(formData, "id");
  const category = await db.category.findUnique({
    where: { id },
    select: { id: true, image: true, _count: { select: { products: true, children: true } } },
  });
  if (!category) redirectWithNotice("/admin/categories", { error: "Catégorie introuvable." });

  const { products, children } = category._count;
  if (products > 0 || children > 0) {
    await db.category.update({ where: { id }, data: { isActive: false } });
    refresh(id);
    const why = [
      products > 0 ? `${products} produit(s)` : null,
      children > 0 ? `${children} sous-catégorie(s)` : null,
    ]
      .filter(Boolean)
      .join(" et ");
    redirectWithNotice("/admin/categories", {
      notice: `Catégorie utilisée (${why}) : désactivée au lieu d'être supprimée.`,
    });
  }
  await db.category.delete({ where: { id } });
  await removeStoredImage(category.image);
  refresh();
  redirectWithNotice("/admin/categories", { notice: "Catégorie supprimée." });
}
