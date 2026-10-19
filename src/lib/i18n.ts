import { routing, type AppLocale } from "@/i18n/routing";

type WithLocale = { locale: AppLocale };

/**
 * Pick the translation row for `locale`, falling back to the default locale
 * (FR) so content is never rendered empty. `entity` is any record loaded with
 * its `translations` relation (product, category, collection, color, page...).
 */
export function getTranslation<T extends WithLocale>(
  entity: { translations: T[] },
  locale: string,
): T {
  const { translations } = entity;
  const row =
    translations.find((t) => t.locale === locale) ??
    translations.find((t) => t.locale === routing.defaultLocale) ??
    translations[0];

  if (!row) {
    throw new Error("Entity has no translation rows (FR is required).");
  }
  return row;
}
