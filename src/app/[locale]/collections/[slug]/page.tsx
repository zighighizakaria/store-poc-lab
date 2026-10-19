import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { hasLocale } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { ListingView } from "@/components/store/ListingView";
import { SetAlternates } from "@/components/store/LocaleAlternates";
import {
  collectionPathsByLocale,
  getCollectionBySlug,
  loadListingProducts,
} from "@/lib/catalog";
import { getTranslation } from "@/lib/i18n";
import { collectionPath, decodeParam, queryStringOf } from "@/lib/routes";
import { alternatesFor } from "@/lib/seo";
import { routing } from "@/i18n/routing";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ locale: string; slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  if (!hasLocale(routing.locales, locale)) return {};
  const collection = await getCollectionBySlug(decodeParam(slug), locale);
  if (!collection) return {};
  const text = getTranslation(collection, locale);
  return {
    title: text.name,
    description: text.description ?? undefined,
    alternates: alternatesFor(locale, collectionPathsByLocale(collection)),
  };
}

export default async function CollectionPage({ params, searchParams }: Props) {
  const { locale, slug } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  const collection = await getCollectionBySlug(decodeParam(slug), locale);
  if (!collection) notFound();

  const text = getTranslation(collection, locale);
  const query = await searchParams;
  const canonical = collectionPath(text.slug);
  if (decodeParam(slug) !== text.slug) {
    permanentRedirect(`/${locale}${canonical}${queryStringOf(query)}`);
  }

  const products = await loadListingProducts(
    { collections: { some: { collectionId: collection.id } } },
    locale,
  );

  return (
    <>
      <SetAlternates paths={collectionPathsByLocale(collection)} />
      <ListingView
        basePath={canonical}
        title={text.name}
        description={text.description}
        breadcrumb={[{ label: text.name }]}
        products={products}
        searchParams={query}
      />
    </>
  );
}
