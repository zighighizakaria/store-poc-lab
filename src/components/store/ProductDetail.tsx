"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import {
  Banknote,
  ChevronDown,
  MessageCircle,
  RotateCcw,
  Ruler,
  Truck,
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button, ButtonLink } from "@/components/ui/Button";
import { ColorSwatch } from "@/components/ui/ColorSwatch";
import { Modal } from "@/components/ui/Modal";
import { QuantityStepper } from "@/components/ui/QuantityStepper";
import { SizeButton } from "@/components/ui/SizeButton";
import type { ProductColor } from "@/lib/catalog";
import { formatMoney } from "@/lib/money";
import type { SizeGuideContent } from "@/lib/size-guide";
import { useCart } from "./CartProvider";
import { Gallery } from "./Gallery";

export type DetailVariant = {
  id: string;
  colorId: string;
  sizeId: string;
  stock: number;
  price: number | null;
};

export type DetailSize = { id: string; label: string };

export type DetailImage = { id: string; url: string; alt: string; colorId: string | null };

type Props = {
  name: string;
  description: string | null;
  price: number;
  compareAtPrice: number | null;
  percent: number;
  isNew: boolean;
  colors: ProductColor[];
  sizes: DetailSize[];
  variants: DetailVariant[];
  images: DetailImage[];
  initialColorId: string | null;
  lowStockThreshold: number;
  whatsappNumber: string;
  productUrl: string;
  sizeGuide: SizeGuideContent | null;
  shippingFee: number;
  freeShippingThreshold: number;
};

const FALLBACK_MAX = 10;

export function ProductDetail(props: Props) {
  const {
    name,
    description,
    colors,
    sizes,
    variants,
    images,
    lowStockThreshold,
    whatsappNumber,
    productUrl,
    sizeGuide,
  } = props;
  const t = useTranslations("product");
  const cart = useCart();

  const [colorId, setColorId] = useState<string | null>(props.initialColorId);
  const [sizeId, setSizeId] = useState<string | null>(() => {
    // Single-size products (caps, bags...) need no choice.
    if (sizes.length !== 1) return null;
    const only = variants.find(
      (v) => v.colorId === props.initialColorId && v.sizeId === sizes[0].id && v.stock > 0,
    );
    return only ? sizes[0].id : null;
  });
  const [quantity, setQuantity] = useState(1);
  const [sizeError, setSizeError] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);
  const [barVisible, setBarVisible] = useState(false);
  const ctaRef = useRef<HTMLDivElement>(null);

  const color = colors.find((c) => c.id === colorId) ?? null;
  const size = sizes.find((s) => s.id === sizeId) ?? null;

  // Stock per size for the selected color.
  const stockBySize = useMemo(() => {
    const map = new Map<string, number>();
    for (const v of variants) if (v.colorId === colorId) map.set(v.sizeId, v.stock);
    return map;
  }, [variants, colorId]);

  const variant = variants.find((v) => v.colorId === colorId && v.sizeId === sizeId) ?? null;
  const allSoldOut = variants.every((v) => v.stock <= 0);
  const colorSoldOut = colorId !== null && variants.filter((v) => v.colorId === colorId).every((v) => v.stock <= 0);

  const price = variant?.price ?? props.price;
  const compareAt =
    variant?.price == null && props.compareAtPrice && props.compareAtPrice > price
      ? props.compareAtPrice
      : null;

  const maxQuantity = Math.min(variant ? variant.stock : FALLBACK_MAX, 99);
  const quantityShown = Math.max(1, Math.min(quantity, maxQuantity));

  const galleryImages = useMemo(() => {
    const forColor = images.filter((img) => img.colorId === colorId || img.colorId === null);
    return forColor.length > 0 ? forColor : images;
  }, [images, colorId]);

  const pickColor = (id: string) => {
    setColorId(id);
    // Keep the size only if it exists in stock in the new color.
    const next = variants.find((v) => v.colorId === id && v.sizeId === sizeId);
    if (!next || next.stock <= 0) setSizeId(null);
  };

  const addToCart = () => {
    if (!variant) {
      setSizeError(true);
      return;
    }
    cart.add(variant.id, quantityShown);
    cart.open();
  };

  // Sticky mobile bar: shown once the main buttons scrolled out above the
  // viewport, hidden again when the footer comes into view.
  useEffect(() => {
    const target = ctaRef.current;
    const footer = document.querySelector("footer");
    if (!target) return;
    let ctaGone = false;
    let footerVisible = false;
    const update = () => setBarVisible(ctaGone && !footerVisible);
    const ctaObserver = new IntersectionObserver(([entry]) => {
      ctaGone = !entry.isIntersecting && entry.boundingClientRect.top < 0;
      update();
    });
    ctaObserver.observe(target);
    const footerObserver = footer
      ? new IntersectionObserver(([entry]) => {
          footerVisible = entry.isIntersecting;
          update();
        })
      : null;
    if (footer) footerObserver?.observe(footer);
    return () => {
      ctaObserver.disconnect();
      footerObserver?.disconnect();
    };
  }, []);

  const lowStock =
    variant && variant.stock > 0 && variant.stock <= lowStockThreshold ? variant.stock : null;

  const whatsappHref = useMemo(() => {
    const lines = [t("whatsappIntro"), name];
    if (color) lines.push(`${t("color")}: ${color.name}`);
    if (size) lines.push(`${t("size")}: ${size.label}`);
    if (quantityShown > 1) lines.push(`${t("quantity")}: ${quantityShown}`);
    lines.push(productUrl);
    return `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(lines.join("\n"))}`;
  }, [t, name, color, size, quantityShown, productUrl, whatsappNumber]);

  const addLabel = allSoldOut ? t("outOfStock") : t("addToCart");

  return (
    <>
      <div className="grid gap-24 md:grid-cols-2 md:gap-32 lg:gap-48">
        <Gallery key={colorId ?? "all"} images={galleryImages} />

        <div className="flex flex-col gap-24">
          <div className="flex flex-col gap-12">
            <h1 className="text-display-sm font-semibold tracking-tight">{name}</h1>
            <div className="flex flex-wrap items-center gap-x-12 gap-y-8">
              <span dir="ltr" className="text-title font-semibold">
                {formatMoney(price)}
              </span>
              {compareAt ? (
                <>
                  <s dir="ltr" className="text-body-lg text-muted">
                    {formatMoney(compareAt)}
                  </s>
                  <Badge variant="sale" className="text-body-sm">
                    {t("saleBadge", { percent: String(props.percent) })}
                  </Badge>
                </>
              ) : null}
              {props.isNew ? <Badge variant="new" className="text-body-sm shadow-sm">{t("newBadge")}</Badge> : null}
            </div>
          </div>

          {colors.length > 0 ? (
            <div>
              <p id="color-label" className="mb-4 text-body font-medium">
                {t("color")}
                {color ? <span className="font-normal text-muted">: {color.name}</span> : null}
              </p>
              <div role="group" aria-labelledby="color-label" className="-ms-6 flex flex-wrap">
                {colors.map((c) => (
                  <ColorSwatch
                    key={c.id}
                    hex={c.hex}
                    name={c.name}
                    selected={c.id === colorId}
                    onClick={() => pickColor(c.id)}
                  />
                ))}
              </div>
            </div>
          ) : null}

          {sizes.length > 0 ? (
            <div>
              <div className="mb-8 flex items-center justify-between gap-12">
                <p id="size-label" className="text-body font-medium">
                  {t("size")}
                  {size ? <span dir="ltr" className="font-normal text-muted">: {size.label}</span> : null}
                </p>
                {sizeGuide ? (
                  <button
                    type="button"
                    onClick={() => setGuideOpen(true)}
                    aria-haspopup="dialog"
                    className="inline-flex min-h-44 items-center gap-8 rounded-pill text-body font-medium underline"
                  >
                    <Ruler aria-hidden="true" strokeWidth={1.5} className="size-16" />
                    {t("sizeGuide")}
                  </button>
                ) : null}
              </div>
              <div role="group" aria-labelledby="size-label" className="flex flex-wrap gap-8">
                {sizes.map((s) => {
                  const stock = stockBySize.get(s.id) ?? 0;
                  return (
                    <SizeButton
                      key={s.id}
                      selected={s.id === sizeId}
                      disabled={stock <= 0}
                      title={stock <= 0 ? t("outOfStock") : undefined}
                      onClick={() => {
                        setSizeId(s.id);
                        setSizeError(false);
                      }}
                    >
                      <span dir="ltr">{s.label}</span>
                    </SizeButton>
                  );
                })}
              </div>
              {sizeError ? (
                <p role="alert" className="mt-8 text-body font-medium text-error">
                  {t("selectSize")}
                </p>
              ) : null}
              {lowStock !== null ? (
                <p role="status" className="mt-8 text-body font-medium text-warning">
                  {t("lowStock", { count: lowStock })}
                </p>
              ) : colorSoldOut && !allSoldOut ? (
                <p role="status" className="mt-8 text-body text-muted">
                  {t("colorSoldOut")}
                </p>
              ) : null}
            </div>
          ) : null}

          <div ref={ctaRef} className="flex flex-col gap-12">
            <div className="flex flex-wrap items-center gap-12">
              <QuantityStepper
                value={quantityShown}
                min={1}
                max={maxQuantity}
                onChange={setQuantity}
                labels={{
                  decrease: t("decrease"),
                  increase: t("increase"),
                  quantity: t("quantity"),
                }}
              />
              <Button
                variant="accent"
                size="lg"
                disabled={allSoldOut}
                onClick={addToCart}
                className="min-w-[200px] flex-1"
              >
                {addLabel}
              </Button>
            </div>
            <ButtonLink
              href={whatsappHref}
              external
              variant="secondary"
              size="lg"
              fullWidth
            >
              <MessageCircle aria-hidden="true" strokeWidth={1.5} className="size-20" />
              {t("orderWhatsapp")}
            </ButtonLink>
          </div>

          <ul className="grid gap-12 rounded-image bg-canvas p-16 sm:grid-cols-3">
            {[
              { icon: Truck, text: t("trustDelivery") },
              { icon: RotateCcw, text: t("trustExchange") },
              { icon: Banknote, text: t("trustCod") },
            ].map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-8 text-body-sm font-medium sm:flex-col sm:text-center">
                <Icon aria-hidden="true" strokeWidth={1.5} className="size-24 shrink-0" />
                {text}
              </li>
            ))}
          </ul>

          <div className="divide-y divide-line border-y border-line">
            {description ? (
              <Accordion title={t("description")} defaultOpen>
                <p className="whitespace-pre-line">{description}</p>
              </Accordion>
            ) : null}
            <Accordion title={t("deliveryReturns")}>
              <p>
                {t("deliveryText", {
                  fee: formatMoney(props.shippingFee),
                  threshold: formatMoney(props.freeShippingThreshold),
                })}
              </p>
              <p className="mt-8">{t("returnsText")}</p>
            </Accordion>
            <Accordion title={t("care")}>
              <p>{t("careText")}</p>
            </Accordion>
          </div>
        </div>
      </div>

      {sizeGuide ? (
        <Modal
          open={guideOpen}
          onClose={() => setGuideOpen(false)}
          title={t("sizeGuide")}
          closeLabel={t("close")}
        >
          {sizeGuide.table.length > 0 ? (
            <div className="overflow-x-auto rounded-image border border-line">
              <table className="w-full min-w-[320px] border-collapse text-body">
                <thead className="bg-canvas">
                  <tr>
                    {sizeGuide.table[0].map((cell, i) => (
                      <th key={i} scope="col" className="px-16 py-12 text-start font-semibold">
                        {cell}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {sizeGuide.table.slice(1).map((row, r) => (
                    <tr key={r}>
                      {row.map((cell, i) =>
                        i === 0 ? (
                          <th key={i} scope="row" dir="ltr" className="px-16 py-12 text-start font-semibold">
                            {cell}
                          </th>
                        ) : (
                          <td key={i} dir="ltr" className="px-16 py-12 text-start">
                            {cell}
                          </td>
                        ),
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
          {sizeGuide.notes.map((note, i) => (
            <p key={i} className="mt-12 text-body text-muted">
              {note}
            </p>
          ))}
        </Modal>
      ) : null}

      {barVisible ? (
        <div className="fixed inset-x-0 bottom-0 z-30 flex items-center gap-12 bg-surface p-12 shadow-lg md:hidden">
          <div className="flex min-w-0 flex-col">
            <span className="truncate text-body-sm text-muted">{name}</span>
            <span dir="ltr" className="text-body-lg font-semibold">
              {formatMoney(price)}
            </span>
          </div>
          <Button
            variant="accent"
            size="md"
            disabled={allSoldOut}
            onClick={addToCart}
            className="ms-auto shrink-0"
          >
            {addLabel}
          </Button>
        </div>
      ) : null}
    </>
  );
}

function Accordion({
  title,
  defaultOpen = false,
  children,
}: {
  title: string;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  return (
    <details open={defaultOpen} className="group">
      <summary className="flex min-h-48 cursor-pointer list-none items-center justify-between gap-12 rounded-pill text-body-lg font-medium [&::-webkit-details-marker]:hidden">
        {title}
        <ChevronDown
          aria-hidden="true"
          strokeWidth={1.5}
          className="size-20 shrink-0 transition-transform duration-fast group-open:rotate-180"
        />
      </summary>
      <div className="pb-16 text-body-lg text-muted">{children}</div>
    </details>
  );
}
