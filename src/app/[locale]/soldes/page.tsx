import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ListingView } from "@/components/store/ListingView";
import { loadSaleProducts } from "@/lib/catalog";
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
    title: t("saleTitle"),
    description: t("saleText"),
    alternates: alternatesFor(locale, samePathForAllLocales("/soldes")),
  };
}

// Sale page: automatic, every product with compareAtPrice > price.
export default async function SalePage({ params, searchParams }: Props) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations("listing");

  return (
    <ListingView
      basePath="/soldes"
      title={t("saleTitle")}
      description={t("saleText")}
      breadcrumb={[{ label: t("saleTitle") }]}
      products={await loadSaleProducts(locale)}
      searchParams={await searchParams}
      defaultSort="discount"
    />
  );
}
