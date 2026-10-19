import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { hasLocale } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { ListingView } from "@/components/store/ListingView";
import { SetAlternates } from "@/components/store/LocaleAlternates";
import {
  categoryAndDescendantIds,
  categoryHref,
  categoryPathsByLocale,
  categoryText,
  findCategoryBySegments,
  getCategoryIndex,
  loadListingProducts,
} from "@/lib/catalog";
import { decodeParam, queryStringOf } from "@/lib/routes";
import { alternatesFor } from "@/lib/seo";
import { routing } from "@/i18n/routing";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ locale: string; slug: string[] }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

async function resolve(locale: string, slug: string[]) {
  const index = await getCategoryIndex();
  const category = findCategoryBySegments(index, slug.map(decodeParam));
  return { index, category };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  if (!hasLocale(routing.locales, locale)) return {};
  const { category } = await resolve(locale, slug);
  if (!category) return {};
  const text = categoryText(category, locale);
  return {
    title: text.name,
    description: text.description ?? undefined,
    alternates: alternatesFor(locale, categoryPathsByLocale(category)),
  };
}

export default async function CategoryPage({ params, searchParams }: Props) {
  const { locale, slug } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  const { category } = await resolve(locale, slug);
  if (!category) notFound();

  // A slug from another locale (or a stale link) resolves, then redirects to
  // the canonical localized path.
  const canonical = categoryHref(category, locale);
  const requested = `/c/${slug.join("/")}`;
  const query = await searchParams;
  if (decodeParam(requested) !== decodeParam(canonical)) {
    permanentRedirect(`/${locale}${canonical}${queryStringOf(query)}`);
  }

  const text = categoryText(category, locale);
  const products = await loadListingProducts(
    { categoryId: { in: categoryAndDescendantIds(category) } },
    locale,
  );

  // Breadcrumb: Home > Root > Child
  const chain = [];
  for (let node: typeof category | null = category; node; node = node.parent) chain.unshift(node);
  const breadcrumb = chain.map((node, i) => ({
    label: categoryText(node, locale).name,
    href: i < chain.length - 1 ? categoryHref(node, locale) : undefined,
  }));

  // Sidebar links: the children of this category, or of its parent for a leaf.
  const parent = category.children.length > 0 ? category : category.parent;
  const subcategories = parent
    ? [
        {
          key: parent.id,
          label: categoryText(parent, locale).name,
          href: categoryHref(parent, locale),
          active: parent.id === category.id,
        },
        ...parent.children.map((child) => ({
          key: child.id,
          label: categoryText(child, locale).name,
          href: categoryHref(child, locale),
          active: child.id === category.id,
        })),
      ]
    : [];

  return (
    <>
      <SetAlternates paths={categoryPathsByLocale(category)} />
      <ListingView
        basePath={canonical}
        title={text.name}
        description={text.description}
        breadcrumb={breadcrumb}
        products={products}
        searchParams={query}
        subcategories={subcategories}
      />
    </>
  );
}
