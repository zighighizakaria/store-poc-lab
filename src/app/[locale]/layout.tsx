import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { CartDrawer } from "@/components/store/CartDrawer";
import { CartProvider } from "@/components/store/CartProvider";
import { ThemeProvider } from "@/components/ThemeProvider";
import { Footer } from "@/components/store/Footer";
import { Header } from "@/components/store/Header";
import { AlternatesProvider } from "@/components/store/LocaleAlternates";
import { fontVariables } from "@/lib/fonts";
import { getTheme, htmlTheme, ThemeScript } from "@/lib/theme-server";
import { getDirection, routing } from "@/i18n/routing";
import { siteConfig } from "../../../site.config";
import "../globals.css";

type Props = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: Pick<Props, "params">): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) return {};
  const t = await getTranslations({ locale, namespace: "meta" });

  return {
    metadataBase: new URL(siteConfig.url),
    title: { default: siteConfig.name, template: `%s | ${siteConfig.name}` },
    description: t("description"),
  };
}

export default async function LocaleLayout({ children, params }: Props) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  const t = await getTranslations({ locale, namespace: "header" });
  const theme = await getTheme();

  return (
    <html
      lang={locale}
      dir={getDirection(locale)}
      data-theme={htmlTheme(theme)}
      className={fontVariables}
      suppressHydrationWarning
    >
      <head>
        <ThemeScript theme={theme} />
      </head>
      <body className="flex min-h-screen flex-col">
        <NextIntlClientProvider>
          <ThemeProvider initial={theme}>
            <a
              href="#main"
              className="sr-only focus:not-sr-only focus:absolute focus:start-12 focus:top-12 focus:z-50 focus:rounded-pill focus:bg-surface focus:px-16 focus:py-8"
            >
              {t("skipToContent")}
            </a>
            <AlternatesProvider>
              <CartProvider>
                <Header />
                <main id="main" className="flex-1">
                  {children}
                </main>
                <Footer />
                <CartDrawer />
              </CartProvider>
            </AlternatesProvider>
          </ThemeProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
