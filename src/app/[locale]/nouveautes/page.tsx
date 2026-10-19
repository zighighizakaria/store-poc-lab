import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ListingView } from "@/components/store/ListingView";
import { loadListingProducts } from "@/lib/catalog";
import { NEW_PRODUCT_DAYS } from "@/lib/pricing";
import { samePathForAllLocales } from "@/lib/routes";
import { alternatesFor } from "@/lib/seo";
import { routing } from "@/i18n/routing";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) return {};
  const t = await getTranslations({ locale, namespace: "listing" });
  return {
    title: t("newTitle"),
    description: t("newText"),
    alternates: alternatesFor(locale, samePathForAllLocales("/nouveautes")),
  };
}

// "Nouveautés": products published in the last 30 days (the "Nouveau" badge window).
export default async function NewArrivalsPage({ params, searchParams }: Props) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations("listing");

  const since = new Date(Date.now() - NEW_PRODUCT_DAYS * 24 * 60 * 60 * 1000);
  const products = await loadListingProducts({ publishedAt: { gte: since } }, locale);

  return (
    <ListingView
      basePath="/nouveautes"
      title={t("newTitle")}
      description={t("newText")}
      breadcrumb={[{ label: t("newTitle") }]}
      products={products}
      searchParams={await searchParams}
    />
  );
}
