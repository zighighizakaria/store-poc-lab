import { timingSafeEqual } from "node:crypto";
import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { CheckCircle2, MessageCircle } from "lucide-react";
import { ClearCart } from "@/components/store/ClearCart";
import { ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { cityDisplayName } from "@/lib/city";
import { db } from "@/lib/db";
import { formatMoney } from "@/lib/money";
import { decodeParam } from "@/lib/routes";
import { getSettings } from "@/lib/settings";
import { routing } from "@/i18n/routing";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ locale: string; number: string }>;
  searchParams: Promise<{ t?: string | string[] }>;
};

// The order is only shown to whoever holds the unguessable token.
async function loadOrder(number: string, token: string | string[] | undefined) {
  if (typeof token !== "string" || token.length === 0) return null;
  const order = await db.order.findUnique({
    where: { number: decodeParam(number) },
    include: { items: { orderBy: { createdAt: "asc" } } },
  });
  if (!order) return null;
  const given = Buffer.from(token);
  const expected = Buffer.from(order.accessToken);
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null;
  return order;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, number } = await params;
  if (!hasLocale(routing.locales, locale)) return {};
  const t = await getTranslations({ locale, namespace: "order" });
  return {
    title: t("metaTitle", { number: decodeParam(number) }),
    robots: { index: false, follow: false },
  };
}

// Orders placed within this window clear the cart when the page opens, so
// reopening an old confirmation link later never empties a new cart.
const LRI = "⁦"; // LTR isolate (LRI)
const PDI = "⁩"; // pop directional isolate

const JUST_PLACED_MS = 10 * 60 * 1000;

export default async function OrderPage({ params, searchParams }: Props) {
  const { locale, number } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  const order = await loadOrder(number, (await searchParams).t);
  if (!order) notFound();

  const [t, tc, settings, city] = await Promise.all([
    getTranslations("order"),
    getTranslations("checkout"),
    getSettings(),
    cityDisplayName(order.city, locale),
  ]);
  const justPlaced = Date.now() - order.createdAt.getTime() < JUST_PLACED_MS;
  const whatsappHref = `https://wa.me/${settings.whatsappNumber}?text=${encodeURIComponent(
    t("whatsappMessage", { number: order.number }),
  )}`;

  return (
    <div className="mx-auto max-w-narrow px-16 py-24 sm:py-32">
      {justPlaced ? <ClearCart /> : null}

      <div className="flex flex-col items-center gap-12 text-center">
        <CheckCircle2 aria-hidden="true" strokeWidth={1.5} className="size-48 text-success" />
        <h1 className="text-display-sm font-semibold tracking-tight">{t("thanks")}</h1>
        <p className="text-body-lg text-muted">{t("callMessage")}</p>
        {order.email ? (
          <p className="text-body text-muted">
            {/* U+2066/U+2069 isolate the address so it stays LTR inside Arabic text */}
            {t("emailNotice", { email: `${LRI}${order.email}${PDI}` })}
          </p>
        ) : null}
      </div>

      <Card className="mt-24 p-20 sm:p-24">
        <dl className="grid gap-16 sm:grid-cols-2">
          <div className="flex flex-col gap-4">
            <dt className="text-body text-muted">{t("numberLabel")}</dt>
            <dd className="text-title font-semibold">
              <span dir="ltr">{order.number}</span>
            </dd>
          </div>
          <div className="flex flex-col gap-4">
            <dt className="text-body text-muted">{t("statusLabel")}</dt>
            <dd className="text-title font-semibold">{t(`status.${order.status}`)}</dd>
          </div>
        </dl>
      </Card>

      <Card className="mt-16 p-20 sm:p-24">
        <h2 className="text-title font-semibold tracking-tight">{t("itemsTitle")}</h2>
        <ul className="mt-16 flex flex-col divide-y divide-line">
          {order.items.map((item) => (
            <li key={item.id} className="flex gap-12 py-12 first:pt-0">
              <div className="relative h-[72px] w-[56px] shrink-0 overflow-hidden rounded-image bg-canvas">
                {item.image ? (
                  <Image
                    src={item.image}
                    alt={item.productName}
                    fill
                    sizes="56px"
                    className="object-cover"
                  />
                ) : null}
              </div>
              <div className="flex min-w-0 flex-1 flex-col gap-4">
                <p className="text-body font-medium">{item.productName}</p>
                <p className="text-body-sm text-muted">
                  {item.colorName} · <span dir="ltr">{item.sizeLabel}</span>
                </p>
                <div className="flex items-baseline justify-between gap-12">
                  <span className="text-body-sm text-muted">
                    {tc("quantityShort", { count: item.quantity })}
                  </span>
                  <span dir="ltr" className="text-body font-semibold">
                    {formatMoney(item.unitPrice * item.quantity)}
                  </span>
                </div>
              </div>
            </li>
          ))}
        </ul>
        <dl className="mt-16 flex flex-col gap-8 border-t border-line pt-16">
          <div className="flex justify-between gap-12 text-body">
            <dt className="text-muted">{tc("subtotal")}</dt>
            <dd dir="ltr">{formatMoney(order.subtotal)}</dd>
          </div>
          <div className="flex justify-between gap-12 text-body">
            <dt className="text-muted">{tc("shipping")}</dt>
            <dd dir="ltr" className={order.shippingFee === 0 ? "font-medium text-success" : undefined}>
              {order.shippingFee === 0 ? tc("shippingFree") : formatMoney(order.shippingFee)}
            </dd>
          </div>
          <div className="flex items-baseline justify-between gap-12 border-t border-line pt-12">
            <dt className="text-body-lg font-semibold">{tc("total")}</dt>
            <dd dir="ltr" className="text-title font-semibold">
              {formatMoney(order.total)}
            </dd>
          </div>
        </dl>
      </Card>

      <Card className="mt-16 p-20 sm:p-24">
        <div className="grid gap-24 sm:grid-cols-2">
          <section className="flex flex-col gap-8">
            <h2 className="text-title font-semibold tracking-tight">{t("deliveryTitle")}</h2>
            <p className="text-body-lg">
              {order.firstName} {order.lastName}
            </p>
            <p className="text-body-lg">
              <span dir="ltr">{order.phone}</span>
            </p>
            <p className="text-body text-muted">
              {order.address}
              <br />
              {city}
            </p>
            <p className="text-body text-muted">{t("deliveryDelay")}</p>
          </section>
          <section className="flex flex-col gap-8">
            <h2 className="text-title font-semibold tracking-tight">{t("paymentTitle")}</h2>
            <p className="text-body-lg">{t("paymentValue")}</p>
          </section>
        </div>
      </Card>

      <div className="mt-24 flex flex-col items-center gap-12 text-center">
        <p className="text-body-lg font-medium">{t("whatsappTitle")}</p>
        <div className="flex flex-col gap-12 sm:flex-row">
          <ButtonLink href={whatsappHref} external variant="secondary" size="lg">
            <MessageCircle aria-hidden="true" strokeWidth={1.5} className="size-20" />
            {t("whatsappCta")}
          </ButtonLink>
          <ButtonLink href="/" variant="primary" size="lg">
            {t("continueShopping")}
          </ButtonLink>
        </div>
      </div>
    </div>
  );
}
