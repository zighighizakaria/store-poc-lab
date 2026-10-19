"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import { Trash2, Truck } from "lucide-react";
import { ButtonLink, Button } from "@/components/ui/Button";
import { Drawer } from "@/components/ui/Drawer";
import { QuantityStepper } from "@/components/ui/QuantityStepper";
import { Skeleton } from "@/components/ui/Skeleton";
import { Link } from "@/i18n/navigation";
import type { CartResponse } from "@/lib/cart-types";
import { formatMoney } from "@/lib/money";
import { useCart, type CartItem } from "./CartProvider";

// Cart drawer. Lines come from the server (/api/cart): the client contributes
// only variant ids and quantities, so prices and stock are never trusted from it.
export function CartDrawer() {
  const t = useTranslations("cart");
  const locale = useLocale();
  const { items, isOpen, close, setQuantity, remove } = useCart();
  const [data, setData] = useState<CartResponse | null>(null);
  const [failed, setFailed] = useState(false);

  const itemsKey = JSON.stringify(items);

  // Re-read prices and stock whenever the drawer opens or the cart changes.
  useEffect(() => {
    if (!isOpen) return;
    const current = JSON.parse(itemsKey) as CartItem[];
    if (current.length === 0) {
      setData(null);
      return;
    }
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const response = await fetch("/api/cart", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ locale, items: current }),
          signal: controller.signal,
        });
        if (!response.ok) throw new Error("cart request failed");
        const next = (await response.json()) as CartResponse;
        setData(next);
        setFailed(false);
        // Sync the stored cart with reality: drop unknown variants, cap to stock.
        const known = new Map(next.lines.map((line) => [line.variantId, line]));
        for (const item of current) {
          const line = known.get(item.variantId);
          if (!line) remove(item.variantId);
          else if (line.available && line.quantity < item.quantity) {
            setQuantity(item.variantId, line.quantity);
          }
        }
      } catch {
        if (!controller.signal.aborted) setFailed(true);
      }
    }, 120);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [isOpen, itemsKey, locale, remove, setQuantity]);

  const rows = useMemo(() => {
    const byVariant = new Map((data?.lines ?? []).map((line) => [line.variantId, line]));
    return items.flatMap((item) => {
      const line = byVariant.get(item.variantId);
      return line ? [{ item, line }] : [];
    });
  }, [items, data]);

  const loading = items.length > 0 && data === null && !failed;

  // Server unit prices x the quantity shown on screen.
  const subtotal = rows.reduce(
    (sum, { item, line }) =>
      line.available ? sum + line.unitPrice * Math.min(item.quantity, line.stock) : sum,
    0,
  );
  const threshold = data?.freeShippingThreshold ?? 0;
  const remaining = Math.max(0, threshold - subtotal);
  const progress = threshold > 0 ? Math.min(100, Math.round((subtotal / threshold) * 100)) : 0;

  return (
    <Drawer
      open={isOpen}
      onClose={close}
      title={t("title")}
      closeLabel={t("close")}
      footer={
        items.length > 0 ? (
          <div className="flex flex-col gap-12">
            <div className="flex items-baseline justify-between gap-12">
              <span className="text-body-lg font-medium">{t("subtotal")}</span>
              <span dir="ltr" className="text-title font-semibold">
                {formatMoney(subtotal)}
              </span>
            </div>
            <p className="text-body-sm text-muted">{t("shippingNote")}</p>
            <ButtonLink href="/checkout" variant="accent" size="lg" fullWidth onClick={close}>
              {t("checkout")}
            </ButtonLink>
          </div>
        ) : null
      }
    >
      {items.length === 0 ? (
        <div className="flex h-full flex-col items-center justify-center gap-16 text-center">
          <p className="text-body-lg text-muted">{t("empty")}</p>
          <Button variant="secondary" onClick={close}>
            {t("continueShopping")}
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-20">
          {data ? (
            <div className="flex flex-col gap-8 rounded-image bg-canvas p-16">
              <p className="flex items-center gap-8 text-body font-medium">
                <Truck aria-hidden="true" strokeWidth={1.5} className="size-20 shrink-0" />
                {remaining > 0
                  ? t("freeShippingRemaining", { amount: formatMoney(remaining) })
                  : t("freeShippingReached")}
              </p>
              <div
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={progress}
                aria-label={t("freeShippingProgress")}
                className="h-8 overflow-hidden rounded-pill bg-surface"
              >
                <div
                  className="h-full rounded-pill bg-accent transition-[width] duration-base ease-out-soft"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          ) : null}

          {failed && !data ? (
            <p role="alert" className="text-body text-error">
              {t("loadError")}
            </p>
          ) : null}

          {loading ? (
            <ul className="flex flex-col gap-16" aria-hidden="true">
              {items.map((item) => (
                <li key={item.variantId} className="flex gap-12">
                  <Skeleton className="h-[96px] w-[76px] shrink-0" />
                  <div className="flex flex-1 flex-col gap-8">
                    <Skeleton className="h-16 w-3/4" />
                    <Skeleton className="h-16 w-1/2" />
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <ul className="flex flex-col divide-y divide-line">
              {rows.map(({ item, line }) => (
                <li key={line.variantId} className="flex gap-12 py-16 first:pt-0">
                  <Link
                    href={line.href}
                    onClick={close}
                    className="relative block h-[96px] w-[76px] shrink-0 overflow-hidden rounded-image bg-tile"
                  >
                    {line.image ? (
                      <Image
                        src={line.image}
                        alt={line.name}
                        fill
                        sizes="76px"
                        className="object-cover"
                      />
                    ) : null}
                  </Link>
                  <div className="flex min-w-0 flex-1 flex-col gap-6">
                    <div className="flex items-start justify-between gap-8">
                      <Link
                        href={line.href}
                        onClick={close}
                        className="text-body font-medium hover:underline"
                      >
                        {line.name}
                      </Link>
                      <button
                        type="button"
                        onClick={() => remove(line.variantId)}
                        aria-label={`${t("remove")}: ${line.name}`}
                        className="-me-8 -mt-8 inline-flex size-44 shrink-0 items-center justify-center rounded-pill text-muted hover:bg-canvas hover:text-ink"
                      >
                        <Trash2 aria-hidden="true" strokeWidth={1.5} className="size-20" />
                      </button>
                    </div>
                    <p className="text-body-sm text-muted">
                      {line.colorName} · <span dir="ltr">{line.sizeLabel}</span>
                    </p>
                    {line.available ? (
                      <div className="mt-auto flex items-center justify-between gap-12">
                        <QuantityStepper
                          value={Math.min(item.quantity, line.stock)}
                          min={1}
                          max={Math.min(line.stock, 99)}
                          onChange={(value) => setQuantity(line.variantId, value)}
                          labels={{
                            decrease: t("decrease"),
                            increase: t("increase"),
                            quantity: t("quantity"),
                          }}
                        />
                        <span dir="ltr" className="text-body-lg font-semibold">
                          {formatMoney(line.unitPrice * Math.min(item.quantity, line.stock))}
                        </span>
                      </div>
                    ) : (
                      <p role="status" className="text-body font-medium text-error">
                        {t("unavailable")}
                      </p>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </Drawer>
  );
}
