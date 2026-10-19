import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["fr", "ar", "en"],
  defaultLocale: "fr",
  localePrefix: "always",
  // No redirect based on Accept-Language or on the cookie: "/" always goes to /fr.
  localeDetection: false,
  // hreflang alternates (with x-default = fr) are emitted through page metadata.
  alternateLinks: false,
  // The language switcher choice is stored here.
  localeCookie: { name: "NEXT_LOCALE", maxAge: 60 * 60 * 24 * 365 },
});

export type AppLocale = (typeof routing.locales)[number];

export function getDirection(locale: string): "rtl" | "ltr" {
  return locale === "ar" ? "rtl" : "ltr";
}
