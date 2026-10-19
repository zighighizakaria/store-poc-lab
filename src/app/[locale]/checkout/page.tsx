import { randomUUID } from "node:crypto";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { CheckoutForm } from "@/components/store/CheckoutForm";
import { db } from "@/lib/db";
import { routing } from "@/i18n/routing";

// Per-request: each page load gets a fresh idempotency key.
export const dynamic = "force-dynamic";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) return {};
  const t = await getTranslations({ locale, namespace: "checkout" });
  return { title: t("title"), robots: { index: false, follow: false } };
}

export default async function CheckoutPage({ params }: Props) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations("checkout");

  const rows = await db.city.findMany({ where: { isActive: true } });
  const cities = rows
    .map((city) => ({
      id: city.id,
      name: locale === "ar" ? city.nameAr : city.nameFr,
      shippingFee: city.shippingFee,
    }))
    .sort((a, b) => a.name.localeCompare(b.name, locale));

  return (
    <div className="mx-auto max-w-page px-16 py-24 sm:py-32">
      <h1 className="mb-24 text-display-sm font-semibold tracking-tight">{t("title")}</h1>
      <CheckoutForm idempotencyKey={randomUUID()} cities={cities} />
    </div>
  );
}
