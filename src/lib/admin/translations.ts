import { db } from "@/lib/db";
import { slugify } from "@/lib/slugify";
import { ADMIN_LOCALES, type AdminLocale } from "@/lib/admin/product-schema";

export { ADMIN_LOCALES, type AdminLocale };

/** Read `${field}_${locale}` values (trimmed) from a form-like object. */
export function readLocaleFields<F extends string>(
  raw: Record<string, unknown>,
  fields: readonly F[],
): Record<AdminLocale, Record<F, string>> {
  const out = {} as Record<AdminLocale, Record<F, string>>;
  for (const locale of ADMIN_LOCALES) {
    out[locale] = {} as Record<F, string>;
    for (const field of fields) {
      const value = raw[`${field}_${locale}`];
      out[locale][field] = typeof value === "string" ? value.trim() : "";
    }
  }
  return out;
}

export type SlugKind = "product" | "category" | "collection";

/** Slug already used in `locale` by another entity of the same kind? */
async function slugTaken(kind: SlugKind, locale: AdminLocale, slug: string, excludeId?: string) {
  switch (kind) {
    case "product":
      return db.productTranslation.findFirst({
        where: { locale, slug, ...(excludeId ? { NOT: { productId: excludeId } } : {}) },
        select: { id: true },
      });
    case "category":
      return db.categoryTranslation.findFirst({
        where: { locale, slug, ...(excludeId ? { NOT: { categoryId: excludeId } } : {}) },
        select: { id: true },
      });
    case "collection":
      return db.collectionTranslation.findFirst({
        where: { locale, slug, ...(excludeId ? { NOT: { collectionId: excludeId } } : {}) },
        select: { id: true },
      });
  }
}

/** Field errors (`slug_<locale>`) for slugs that another entity already uses. */
export async function slugConflicts(
  kind: SlugKind,
  slugs: Partial<Record<AdminLocale, string>>,
  excludeId?: string,
): Promise<Record<string, string>> {
  const errors: Record<string, string> = {};
  for (const locale of ADMIN_LOCALES) {
    const slug = slugs[locale];
    if (!slug) continue;
    if (await slugTaken(kind, locale, slug, excludeId)) {
      errors[`slug_${locale}`] = "Ce slug est déjà utilisé, choisissez-en un autre";
    }
  }
  return errors;
}

type SimpleTranslated = { name: string; slug: string; description: string | null };

/**
 * Category / collection translation fields: FR required, AR/EN only when a
 * name is given. Slugs default to the name. Returns field errors or the rows.
 */
export function buildNamedTranslations(raw: Record<string, unknown>):
  | { ok: true; rows: Partial<Record<AdminLocale, SimpleTranslated>> }
  | { ok: false; fieldErrors: Record<string, string> } {
  const fields = readLocaleFields(raw, ["name", "slug", "description"] as const);
  const fieldErrors: Record<string, string> = {};
  const rows: Partial<Record<AdminLocale, SimpleTranslated>> = {};
  if (!fields.fr.name) fieldErrors.name_fr = "Le nom français est obligatoire";
  for (const locale of ADMIN_LOCALES) {
    const f = fields[locale];
    if (!f.name) continue;
    if (f.name.length > 200) fieldErrors[`name_${locale}`] = "200 caractères maximum";
    if (f.description.length > 5000) fieldErrors[`description_${locale}`] = "5000 caractères maximum";
    const slug = slugify(f.slug || f.name);
    if (!slug) fieldErrors[`slug_${locale}`] = "Slug invalide : utilisez des lettres ou des chiffres";
    rows[locale] = { name: f.name, slug, description: f.description || null };
  }
  if (Object.keys(fieldErrors).length > 0) return { ok: false, fieldErrors };
  return { ok: true, rows };
}
