import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Breadcrumb, type Crumb } from "@/components/store/Breadcrumb";
import { SetAlternates } from "@/components/store/LocaleAlternates";
import {
  ProductDetail,
  type DetailImage,
  type DetailSize,
  type DetailVariant,
} from "@/components/store/ProductDetail";
import { ProductGrid } from "@/components/store/ProductGrid";
import { SectionHeader } from "@/components/store/SectionHeader";
import {
  categoryHref,
  categoryText,
  getCategoryIndex,
  getProductBySlug,
  getRelatedProducts,
  productPathsByLocale,
  toCardProduct,
  toListingProduct,
} from "@/lib/catalog";
import { getTranslation } from "@/lib/i18n";
import { mediaAssetUrl, mediaUrl } from "@/lib/media/url";
import { decodeParam, productPath, queryStringOf } from "@/lib/routes";
import { alternatesFor } from "@/lib/seo";
import { getSettings } from "@/lib/settings";
import { parseSizeGuide } from "@/lib/size-guide";
import { routing } from "@/i18n/routing";
import { siteConfig } from "../../../../../site.config";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ locale: string; slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const absolute = (url: string) => new URL(url, siteConfig.url).toString();

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  if (!hasLocale(routing.locales, locale)) return {};
  const row = await getProductBySlug(decodeParam(slug), locale);
  if (!row) return {};
  const text = getTranslation(row, locale);
  const description = text.description?.slice(0, 160);
  const image = mediaAssetUrl(row.images[0]?.mediaAsset);
  return {
    title: text.name,
    description,
    alternates: alternatesFor(locale, productPathsByLocale(row)),
    openGraph: {
      title: text.name,
      description,
      type: "website",
      images: image ? [absolute(image)] : undefined,
    },
  };
}

export default async function ProductPage({ params, searchParams }: Props) {
  const { locale, slug } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  const row = await getProductBySlug(decodeParam(slug), locale);
  if (!row) notFound();

  const text = getTranslation(row, locale);
  const query = await searchParams;
  if (decodeParam(slug) !== text.slug) {
    permanentRedirect(`/${locale}${productPath(text.slug)}${queryStringOf(query)}`);
  }

  const [t, settings, related, categories] = await Promise.all([
    getTranslations("product"),
    getSettings(),
    getRelatedProducts(row, locale),
    getCategoryIndex(),
  ]);

  const listing = toListingProduct(row, locale);
  const colorNameById = new Map(listing.colors.map((c) => [c.id, c.name]));

  const sizes: DetailSize[] = [
    ...new Map(
      [...row.variants]
        .sort((a, b) => a.size.position - b.size.position)
        .map((v) => [v.sizeId, { id: v.sizeId, label: v.size.label }]),
    ).values(),
  ];
  const variants: DetailVariant[] = row.variants.map((v) => ({
    id: v.id,
    colorId: v.colorId,
    sizeId: v.sizeId,
    stock: v.stock,
    price: v.price,
  }));
  const images: DetailImage[] = row.images.map((image) => {
    const colorName = image.colorId ? colorNameById.get(image.colorId) : undefined;
    const asset = image.mediaAsset;
    const alt = asset.translations.length > 0 ? getTranslation(asset, locale).alt : null;
    return {
      id: image.id,
      url: mediaUrl(asset.storageKey),
      alt: alt ?? (colorName ? `${text.name} - ${colorName}` : text.name),
      colorId: image.colorId,
    };
  });

  // Preselected color: ?color= from a card swatch, else the first color in stock.
  const requestedColor = Array.isArray(query.color) ? query.color[0] : query.color;
  const initialColorId =
    listing.colors.find((c) => c.id === requestedColor)?.id ??
    listing.colors.find((c) => row.variants.some((v) => v.colorId === c.id && v.stock > 0))?.id ??
    listing.colors[0]?.id ??
    null;

  const guideRow = row.category.sizeGuide ?? row.category.parent?.sizeGuide ?? null;
  const sizeGuide = guideRow ? parseSizeGuide(getTranslation(guideRow, locale).content) : null;

  const node = categories.byId.get(row.categoryId);
  const chain: NonNullable<typeof node>[] = [];
  for (let n = node ?? null; n; n = n.parent) chain.unshift(n);
  const breadcrumb: Crumb[] = [
    ...chain.map((n) => ({
      label: categoryText(n, locale).name,
      href: categoryHref(n, locale),
    })),
    { label: text.name },
  ];

  const url = `${siteConfig.url}/${locale}${productPath(text.slug)}`;
  const inStock = row.variants.some((v) => v.stock > 0);
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: text.name,
    description: text.description ?? undefined,
    image: row.images.map((image) => absolute(mediaUrl(image.mediaAsset.storageKey))),
    url,
    offers: {
      "@type": "Offer",
      url,
      priceCurrency: siteConfig.currency,
      price: (row.price / 100).toFixed(2),
      availability: inStock ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
    },
  };

  return (
    <div className="mx-auto max-w-page px-16 pt-12">
      <SetAlternates paths={productPathsByLocale(row)} />
      <script
        type="application/ld+json"
        // "<" is escaped so product text cannot close the script tag.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />
      <Breadcrumb items={breadcrumb} />

      <div className="mt-16">
        <ProductDetail
          name={text.name}
          description={text.description}
          price={row.price}
          compareAtPrice={row.compareAtPrice}
          percent={listing.percent}
          isNew={listing.isNew}
          colors={listing.colors}
          sizes={sizes}
          variants={variants}
          images={images}
          initialColorId={initialColorId}
          lowStockThreshold={settings.lowStockThreshold}
          whatsappNumber={settings.whatsappNumber}
          productUrl={url}
          sizeGuide={sizeGuide}
          shippingFee={settings.shippingFee}
          freeShippingThreshold={settings.freeShippingThreshold}
        />
      </div>

      {related.length > 0 ? (
        <section aria-labelledby="related" className="mt-64">
          <SectionHeader id="related" title={t("related")} />
          <ProductGrid products={related.map(toCardProduct)} />
        </section>
      ) : null}
    </div>
  );
}
