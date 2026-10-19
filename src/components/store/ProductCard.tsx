"use client";

import { useState } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/Badge";
import { Card, ProductImageTile } from "@/components/ui/Card";
import { ColorSwatch } from "@/components/ui/ColorSwatch";
import { Link } from "@/i18n/navigation";
import type { CardProduct } from "@/lib/catalog";
import { formatMoney } from "@/lib/money";
import { productPath } from "@/lib/routes";

const MAX_SWATCHES = 5;
const IMAGE_SIZES = "(min-width: 1024px) 25vw, (min-width: 768px) 33vw, 50vw";

type Props = { product: CardProduct; priority?: boolean };

export function ProductCard({ product, priority = false }: Props) {
  const t = useTranslations("product");
  const [pickedColor, setPickedColor] = useState<string | null>(null);

  // Shown color: the swatch the shopper clicked, else the color of the first image.
  const activeColor = pickedColor ?? product.images[0]?.colorId ?? null;
  const forColor = product.images.filter((image) => image.colorId === activeColor);
  const images = forColor.length > 0 ? forColor : product.images;
  const [primary, secondary] = images;

  const href = `${productPath(product.slug)}${pickedColor ? `?color=${pickedColor}` : ""}`;
  const visibleColors = product.colors.slice(0, MAX_SWATCHES);
  const hiddenColors = product.colors.length - visibleColors.length;

  return (
    <Card className="group relative flex h-full flex-col gap-12 transition-shadow duration-base hover:shadow-lg">
      <ProductImageTile>
        {primary ? (
          <Image
            src={primary.url}
            alt={product.name}
            fill
            sizes={IMAGE_SIZES}
            priority={priority}
            className="object-cover"
          />
        ) : null}
        {/* Second image on hover (hover-capable devices only). */}
        {secondary ? (
          <Image
            src={secondary.url}
            alt=""
            fill
            sizes={IMAGE_SIZES}
            className="object-cover opacity-0 transition-opacity duration-base ease-out-soft group-hover:opacity-100"
          />
        ) : null}

        <div className="absolute start-8 top-8 flex flex-col items-start gap-4">
          {product.percent > 0 ? (
            <Badge variant="sale">{t("saleBadge", { percent: String(product.percent) })}</Badge>
          ) : null}
          {product.isNew ? <Badge variant="new">{t("newBadge")}</Badge> : null}
        </div>

        {product.soldOut ? (
          <div className="absolute inset-0 flex items-center justify-center bg-surface/70">
            <Badge variant="out-of-stock" className="px-12 py-6 text-body-sm">
              {t("soldOutBadge")}
            </Badge>
          </div>
        ) : null}
      </ProductImageTile>

      <div className="flex flex-1 flex-col gap-6 px-8 pb-8">
        <h3 className="text-body font-medium text-ink">
          <Link
            href={href}
            className="block rounded-xl after:absolute after:inset-0 after:rounded-card after:content-['']"
          >
            <span className="line-clamp-2">{product.name}</span>
          </Link>
        </h3>

        {product.colors.length > 1 ? (
          <div
            role="group"
            aria-label={t("colors")}
            className="relative z-10 -ms-4 flex flex-wrap items-center"
          >
            {visibleColors.map((color) => (
              <ColorSwatch
                key={color.id}
                size="sm"
                hex={color.hex}
                name={color.name}
                selected={activeColor === color.id}
                onClick={() => setPickedColor(color.id)}
              />
            ))}
            {hiddenColors > 0 ? (
              <span dir="ltr" className="ms-4 text-body-sm text-muted">
                +{hiddenColors}
              </span>
            ) : null}
          </div>
        ) : null}

        <p className="mt-auto flex flex-wrap items-baseline gap-x-8 gap-y-4">
          <span dir="ltr" className="text-body-lg font-semibold text-ink">
            {formatMoney(product.price)}
          </span>
          {product.compareAtPrice && product.percent > 0 ? (
            <s dir="ltr" className="text-body-sm text-muted">
              {formatMoney(product.compareAtPrice)}
            </s>
          ) : null}
        </p>
      </div>
    </Card>
  );
}
