"use server";

import { Prisma } from "@prisma/client";
import { z } from "zod";
import { db } from "@/lib/db";
import { fail, fieldErrorsOf, formToObject, success, textOf, type FormState } from "@/lib/admin/form";
import { SIZE_GROUPS } from "@/lib/admin/labels";
import { redirectWithNotice, revalidateAdmin, revalidateStorefront } from "@/lib/admin/revalidate";
import { requireAdmin } from "@/lib/admin/session";

const sizeSchema = z.object({
  id: z.string().max(64).optional(),
  label: z.string().trim().min(1, "Libellé obligatoire").max(12, "12 caractères maximum"),
  group: z.enum(SIZE_GROUPS as [(typeof SIZE_GROUPS)[number], ...(typeof SIZE_GROUPS)[number][]]),
  position: z.coerce.number().int("Entier requis").min(0, "≥ 0").max(9999, "9999 maximum").default(0),
});

const refresh = () => {
  revalidateAdmin("/admin/sizes", "/admin/products");
  revalidateStorefront();
};

/** Create (no id) or update a size. Labels are never translated. */
export async function saveSize(_previous: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  const parsed = sizeSchema.safeParse(formToObject(formData));
  if (!parsed.success) return fail("Corrigez les champs en erreur.", fieldErrorsOf(parsed.error));
  const { id, ...data } = parsed.data;
  try {
    if (id) {
      if (!(await db.size.findUnique({ where: { id }, select: { id: true } }))) return fail("Taille introuvable.");
      await db.size.update({ where: { id }, data });
    } else {
      await db.size.create({ data });
    }
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return fail("Cette taille existe déjà dans ce groupe.", { label: "Déjà utilisé dans ce groupe" });
    }
    throw error;
  }
  refresh();
  return success(id ? "Taille enregistrée." : "Taille ajoutée.");
}

/** Hard delete only when no variant uses the size. */
export async function deleteSize(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = textOf(formData, "id");
  const variants = await db.variant.count({ where: { sizeId: id } });
  if (variants > 0) {
    redirectWithNotice("/admin/sizes", {
      error: `Suppression impossible : cette taille est utilisée par ${variants} variante(s) de produits.`,
    });
  }
  await db.size.deleteMany({ where: { id } });
  refresh();
  redirectWithNotice("/admin/sizes", { notice: "Taille supprimée." });
}
