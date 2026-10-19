import { routing, type AppLocale } from "@/i18n/routing";

// Path helpers. Paths are locale-less (the next-intl Link adds the prefix) and
// every dynamic segment is percent-encoded so Arabic slugs are valid in
// headers and hrefs.

export const seg = (value: string) => encodeURIComponent(value);

export const productPath = (slug: string) => `/p/${seg(slug)}`;
export const categoryPath = (slugs: string[]) => `/c/${slugs.map(seg).join("/")}`;
export const collectionPath = (slug: string) => `/collections/${seg(slug)}`;
export const pagePath = (key: string) => `/pages/${seg(key)}`;

/**
 * Decode a route param (Next may hand it over percent-encoded). Normalized to
 * NFC because slugs are stored in NFC (matters for Arabic hamza forms).
 */
export function decodeParam(value: string): string {
  try {
    return decodeURIComponent(value).normalize("NFC");
  } catch {
    return value.normalize("NFC");
  }
}

export type LocalePaths = Partial<Record<AppLocale, string>>;

/** Same path for every locale (pages whose URL does not depend on the locale). */
export function samePathForAllLocales(path: string): Record<AppLocale, string> {
  return Object.fromEntries(routing.locales.map((l) => [l, path])) as Record<
    AppLocale,
    string
  >;
}

/** "?a=b&c=d" (or "") from Next's searchParams object. */
export function queryStringOf(
  params: Record<string, string | string[] | undefined>,
): string {
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    for (const v of Array.isArray(value) ? value : value === undefined ? [] : [value]) {
      qs.append(key, v);
    }
  }
  const text = qs.toString();
  return text ? `?${text}` : "";
}
