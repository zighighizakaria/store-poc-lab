"use client";

import { useTranslations } from "next-intl";
import { ShoppingBag } from "lucide-react";
import { useCart } from "./CartProvider";

export function CartButton() {
  const t = useTranslations("header");
  const { count, open } = useCart();

  return (
    <button
      type="button"
      onClick={open}
      aria-label={t("cartCount", { count })}
      aria-haspopup="dialog"
      className="relative inline-flex size-44 items-center justify-center rounded-pill text-ink hover:bg-canvas"
    >
      <ShoppingBag aria-hidden="true" strokeWidth={1.5} className="size-24" />
      {count > 0 ? (
        <span
          dir="ltr"
          aria-hidden="true"
          className="absolute end-0 top-4 inline-flex min-w-20 items-center justify-center rounded-pill bg-accent px-4 text-micro font-semibold leading-[20px] text-on-accent"
        >
          {count > 99 ? "99+" : count}
        </span>
      ) : null}
    </button>
  );
}
