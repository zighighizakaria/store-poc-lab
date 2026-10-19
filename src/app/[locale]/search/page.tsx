import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ListingView } from "@/components/store/ListingView";
import { loadListingProducts, searchWhere } from "@/lib/catalog";
import { samePathForAllLocales } from "@/lib/routes";
import { alternatesFor } from "@/lib/seo";
import { routing } from "@/i18n/routing";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function queryOf(params: Record<string, string | string[] | undefined>): string {
  const raw = Array.isArray(params.q) ? params.q[0] : params.q;
  return (raw ?? "").trim().slice(0, 80);
}

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) return {};
  const t = await getTranslations({ locale, namespace: "listing" });
  const q = queryOf(await searchParams);
  return {
    title: q ? t("searchResultsFor", { query: q }) : t("searchTitle"),
    // Result pages are not worth indexing.
    robots: { index: false, follow: true },
    alternates: alternatesFor(locale, samePathForAllLocales("/search")),
  };
}

export default async function SearchPage({ params, searchParams }: Props) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations("listing");

  const query = await searchParams;
  const q = queryOf(query);
  const products = q ? await loadListingProducts(searchWhere(q, locale), locale) : [];

  return (
    <ListingView
      basePath="/search"
      title={q ? t("searchResultsFor", { query: q }) : t("searchTitle")}
      breadcrumb={[{ label: t("searchTitle") }]}
      products={products}
      searchParams={query}
      extraQuery={{ q }}
      emptyState={
        <div className="rounded-card bg-surface p-32 text-center shadow-sm">
          <p className="text-title font-semibold">
            {q ? t("searchNoResults", { query: q }) : t("searchEmptyQuery")}
          </p>
          <p className="mt-8 text-body text-muted">{t("searchHint")}</p>
        </div>
      }
    />
  );
}
