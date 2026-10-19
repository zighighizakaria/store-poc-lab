"use server";

import { db } from "@/lib/db";
import { fail, formToObject, success, textOf, type FormState } from "@/lib/admin/form";
import { revalidateAdmin, revalidateStorefront } from "@/lib/admin/revalidate";
import { requireAdmin } from "@/lib/admin/session";
import { ADMIN_LOCALES, readLocaleFields } from "@/lib/admin/translations";

/** Edit the translated title + body of a static page (About, policies). FR required, AR/EN optional. */
export async function savePage(_previous: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  const key = textOf(formData, "key");
  const page = await db.page.findUnique({ where: { key }, select: { id: true } });
  if (!page) return fail("Page introuvable.");

  const fields = readLocaleFields(formToObject(formData), ["title", "body"] as const);
  const errors: Record<string, string> = {};
  if (!fields.fr.title) errors.title_fr = "Le titre français est obligatoire";
  if (!fields.fr.body) errors.body_fr = "Le texte français est obligatoire";
  for (const locale of ADMIN_LOCALES) {
    const f = fields[locale];
    if (f.title.length > 200) errors[`title_${locale}`] = "200 caractères maximum";
    if (f.body.length > 50000) errors[`body_${locale}`] = "50 000 caractères maximum";
    // A translation needs both fields (or none).
    if (locale !== "fr" && !!f.title !== !!f.body) {
      errors[f.title ? `body_${locale}` : `title_${locale}`] = "Renseignez le titre et le texte, ou laissez les deux vides";
    }
  }
  if (Object.keys(errors).length > 0) return fail("Corrigez les champs en erreur.", errors);

  await db.$transaction(async (tx) => {
    for (const locale of ADMIN_LOCALES) {
      const { title, body } = fields[locale];
      if (title && body) {
        await tx.pageTranslation.upsert({
          where: { pageId_locale: { pageId: page.id, locale } },
          update: { title, body },
          create: { pageId: page.id, locale, title, body },
        });
      } else {
        await tx.pageTranslation.deleteMany({ where: { pageId: page.id, locale } });
      }
    }
  });
  revalidateAdmin("/admin/pages", `/admin/pages/${key}`);
  revalidateStorefront();
  return success("Page enregistrée.");
}
