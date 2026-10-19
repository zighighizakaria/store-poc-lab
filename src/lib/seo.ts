import type { Metadata } from "next";
import { routing, type AppLocale } from "@/i18n/routing";
import type { LocalePaths } from "./routes";

/** canonical + hreflang (with x-default = fr) from per-locale, locale-less paths. */
export function alternatesFor(
  locale: AppLocale,
  paths: LocalePaths,
): NonNullable<Metadata["alternates"]> {
  const fallback = paths[routing.defaultLocale] ?? "";
  const full = (l: AppLocale) => `/${l}${paths[l] ?? fallback}`;
  return {
    canonical: full(locale),
    languages: {
      ...Object.fromEntries(routing.locales.map((l) => [l, full(l)])),
      "x-default": full(routing.defaultLocale),
    },
  };
}
