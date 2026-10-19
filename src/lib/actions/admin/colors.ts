"use server";

import { z } from "zod";
import { db } from "@/lib/db";
import { fail, fieldErrorsOf, formToObject, success, textOf, type FormState } from "@/lib/admin/form";
import { redirectWithNotice, revalidateAdmin, revalidateStorefront } from "@/lib/admin/revalidate";
import { requireAdmin } from "@/lib/admin/session";

const colorSchema = z.object({
  id: z.string().max(64).optional(),
  hex: z.string().trim().regex(/^#[0-9a-fA-F]{6}$/, "Couleur invalide (ex. #111111)"),
  name_fr: z.string().trim().min(1, "Le nom français est obligatoire").max(60, "60 caractères maximum"),
  name_ar: z.string().trim().max(60, "60 caractères maximum").default(""),
  name_en: z.string().trim().max(60, "60 caractères maximum").default(""),
});

const refresh = () => {
  revalidateAdmin("/admin/colors", "/admin/products");
  revalidateStorefront();
};

/** Create (no id) or update a color with its translated names. */
export async function saveColor(_previous: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  const parsed = colorSchema.safeParse({ name_fr: "", name_ar: "", name_en: "", ...formToObject(formData) });
  if (!parsed.success) return fail("Corrigez les champs en erreur.", fieldErrorsOf(parsed.error));
  const { id, hex, ...names } = parsed.data;
  const hexLower = hex.toLowerCase();
  const rows = (["fr", "ar", "en"] as const).flatMap((locale) =>
    names[`name_${locale}`] ? [{ locale, name: names[`name_${locale}`] }] : [],
  );

  if (!id) {
    await db.color.create({ data: { hex: hexLower, translations: { create: rows } } });
    refresh();
    return success("Couleur ajoutée.");
  }
  if (!(await db.color.findUnique({ where: { id }, select: { id: true } }))) return fail("Couleur introuvable.");
  await db.$transaction(async (tx) => {
    await tx.color.update({ where: { id }, data: { hex: hexLower } });
    for (const locale of ["fr", "ar", "en"] as const) {
      const name = names[`name_${locale}`];
      if (name) {
        await tx.colorTranslation.upsert({
          where: { colorId_locale: { colorId: id, locale } },
          update: { name },
          create: { colorId: id, locale, name },
        });
      } else {
        await tx.colorTranslation.deleteMany({ where: { colorId: id, locale } });
      }
    }
  });
  refresh();
  return success("Couleur enregistrée.");
}

/** Hard delete only when no variant uses the color. */
export async function deleteColor(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = textOf(formData, "id");
  const variants = await db.variant.count({ where: { colorId: id } });
  if (variants > 0) {
    redirectWithNotice("/admin/colors", {
      error: `Suppression impossible : cette couleur est utilisée par ${variants} variante(s) de produits.`,
    });
  }
  await db.color.deleteMany({ where: { id } });
  refresh();
  redirectWithNotice("/admin/colors", { notice: "Couleur supprimée." });
}
