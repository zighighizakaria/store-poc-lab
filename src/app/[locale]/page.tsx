import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Banknote, Clock, RotateCcw, Truck } from "lucide-react";
import { Card, ProductImageTile } from "@/components/ui/Card";
import { PillLink } from "@/components/ui/Pill";
import { HeroSlider, type HeroSlide } from "@/components/store/HeroSlider";
import { NewsletterForm } from "@/components/store/NewsletterForm";
import { ProductGrid } from "@/components/store/ProductGrid";
import { SectionHeader } from "@/components/store/SectionHeader";
import { Link } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import {
  categoryHref,
  categoryText,
  getCategoryIndex,
  getHomeCollections,
  loadListingProducts,
  loadSaleProducts,
  toCardProduct,
} from "@/lib/catalog";
import { db } from "@/lib/db";
import { getTranslation } from "@/lib/i18n";
import { formatMoney } from "@/lib/money";
import { collectionPath, samePathForAllLocales } from "@/lib/routes";
import { alternatesFor } from "@/lib/seo";
import { getSettings } from "@/lib/settings";
import { sortProducts } from "@/lib/listing";

// Catalog data changes in the DB: never cache this page at build time.
export const dynamic = "force-dynamic";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) return {};
  return { alternates: alternatesFor(locale, samePathForAllLocales("")) };
}

export default async function HomePage({ params }: Props) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations("home");

  const [banners, index, newest, onSale, collections, settings] = await Promise.all([
    db.banner.findMany({
      where: { isActive: true },
      orderBy: { position: "asc" },
      include: { translations: true },
    }),
    getCategoryIndex(),
    loadListingProducts({ publishedAt: { not: null } }, locale, {
      orderBy: { publishedAt: "desc" },
      take: 8,
    }),
    loadSaleProducts(locale),
    getHomeCollections(),
    getSettings(),
  ]);

  const slides: HeroSlide[] = banners.map((banner) => {
    const text = getTranslation(banner, locale);
    return {
      id: banner.id,
      title: text.title,
      subtitle: text.subtitle,
      ctaLabel: text.ctaLabel,
      href: banner.link,
      desktopUrl: banner.imageDesktop,
      mobileUrl: banner.imageMobile,
    };
  });

  const subcategories = index.roots.flatMap((root) => root.children);
  const saleProducts = sortProducts(onSale, "discount").slice(0, 4);

  const trust = [
    {
      icon: Truck,
      title: t("trust.shippingTitle"),
      text: t("trust.shippingText", { amount: formatMoney(settings.freeShippingThreshold) }),
    },
    { icon: RotateCcw, title: t("trust.exchangeTitle"), text: t("trust.exchangeText") },
    { icon: Banknote, title: t("trust.codTitle"), text: t("trust.codText") },
    { icon: Clock, title: t("trust.deliveryTitle"), text: t("trust.deliveryText") },
  ];

  return (
    <div className="mx-auto flex max-w-page flex-col gap-64 px-16 pt-12">
      {slides.length > 0 ? <HeroSlider slides={slides} /> : null}

      {subcategories.length > 0 ? (
        <section aria-label={t("categories")} className="-mt-32">
          <ul className="-mx-16 flex gap-8 overflow-x-auto px-16 py-8 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {subcategories.map((category) => (
              <li key={category.id} className="shrink-0">
                <PillLink href={categoryHref(category, locale)}>
                  {categoryText(category, locale).name}
                </PillLink>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section aria-labelledby="home-new">
        <SectionHeader
          id="home-new"
          title={t("newArrivals")}
          href="/nouveautes"
          linkLabel={t("viewAllNew")}
        />
        {newest.length === 0 ? (
          <p className="text-muted">{t("empty")}</p>
        ) : (
          <ProductGrid products={newest.map(toCardProduct)} />
        )}
      </section>

      {collections.length > 0 ? (
        <section aria-labelledby="home-collections">
          <SectionHeader id="home-collections" title={t("collections")} />
          <ul className="grid grid-cols-2 gap-12 md:gap-16 lg:grid-cols-3">
            {collections.map((collection) => {
              const text = getTranslation(collection, locale);
              return (
                <li key={collection.id}>
                  <Card className="group relative h-full transition-shadow duration-base hover:shadow-lg">
                    <ProductImageTile>
                      {collection.image ? (
                        <Image
                          src={collection.image}
                          alt=""
                          fill
                          sizes="(min-width: 1024px) 33vw, 50vw"
                          className="object-cover transition-transform duration-base ease-out-soft group-hover:scale-105"
                        />
                      ) : null}
                      <span className="absolute start-12 bottom-12 end-12 rounded-xl bg-surface/85 p-12 text-body font-semibold text-ink">
                        <Link
                          href={collectionPath(text.slug)}
                          className="after:absolute after:inset-0 after:rounded-card after:content-['']"
                        >
                          {text.name}
                        </Link>
                      </span>
                    </ProductImageTile>
                  </Card>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      {saleProducts.length > 0 ? (
        <section aria-labelledby="home-sale">
          <SectionHeader
            id="home-sale"
            title={t("sale")}
            href="/soldes"
            linkLabel={t("viewAllSale")}
          />
          <ProductGrid products={saleProducts.map(toCardProduct)} />
        </section>
      ) : null}

      <section aria-label={t("trust.label")}>
        <ul className="grid grid-cols-1 gap-16 rounded-card bg-surface p-24 shadow-sm sm:grid-cols-2 lg:grid-cols-4">
          {trust.map(({ icon: Icon, title, text }) => (
            <li key={title} className="flex items-start gap-12">
              <Icon aria-hidden="true" strokeWidth={1.5} className="mt-4 size-24 shrink-0" />
              <div>
                <p className="text-body-lg font-semibold">{title}</p>
                <p className="text-body text-muted">{text}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section
        aria-labelledby="home-newsletter"
        className="flex flex-col gap-24 rounded-card bg-surface p-24 shadow-sm-2 md:flex-row md:items-center md:justify-between md:p-48"
      >
        <div className="max-w-modal">
          <h2 id="home-newsletter" className="text-display-sm font-semibold tracking-tight">
            {t("newsletter.title")}
          </h2>
          <p className="mt-8 text-body-lg text-muted">{t("newsletter.text")}</p>
        </div>
        <NewsletterForm />
      </section>
    </div>
  );
}
