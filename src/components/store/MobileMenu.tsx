"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { ChevronDown, Menu } from "lucide-react";
import { Drawer } from "@/components/ui/Drawer";
import { Link, usePathname } from "@/i18n/navigation";
import { cn } from "@/lib/cn";
import type { NavItem } from "./MainNav";

type Props = {
  items: NavItem[];
  /** Language switcher (server-built element). */
  footer: ReactNode;
};

// Burger -> drawer with the same navigation; categories are accordions.
export function MobileMenu({ items, footer }: Props) {
  const t = useTranslations("header");
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  const close = () => setOpen(false);
  const rowClass =
    "flex min-h-48 w-full items-center justify-between gap-12 rounded-pill px-16 text-body-lg font-medium text-ink hover:bg-canvas";

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={t("openMenu")}
        aria-haspopup="dialog"
        className="inline-flex size-44 items-center justify-center rounded-pill text-ink hover:bg-canvas lg:hidden"
      >
        <Menu aria-hidden="true" strokeWidth={1.5} className="size-24" />
      </button>

      <Drawer
        open={open}
        onClose={close}
        title={t("menu")}
        closeLabel={t("closeMenu")}
        side="start"
        footer={footer}
      >
        <nav aria-label={t("menu")}>
          <ul className="flex flex-col gap-4">
            {items.map((item) => {
              if (!item.children || item.children.length === 0) {
                return (
                  <li key={item.key}>
                    <Link href={item.href} onClick={close} className={rowClass}>
                      {item.label}
                    </Link>
                  </li>
                );
              }
              const isExpanded = expanded === item.key;
              const panelId = `mobile-${item.key}`;
              return (
                <li key={item.key}>
                  <button
                    type="button"
                    aria-expanded={isExpanded}
                    aria-controls={panelId}
                    onClick={() => setExpanded(isExpanded ? null : item.key)}
                    className={rowClass}
                  >
                    {item.label}
                    <ChevronDown
                      aria-hidden="true"
                      strokeWidth={1.5}
                      className={cn(
                        "size-20 transition-transform duration-fast",
                        isExpanded && "rotate-180",
                      )}
                    />
                  </button>
                  {isExpanded ? (
                    <ul id={panelId} className="ms-16 flex flex-col gap-4 border-s border-line ps-12 pb-8">
                      <li>
                        <Link
                          href={item.href}
                          onClick={close}
                          className="flex min-h-44 items-center rounded-pill px-12 text-body-lg font-semibold text-ink hover:bg-canvas"
                        >
                          {t("viewAll")}
                          <span className="sr-only">{item.label}</span>
                        </Link>
                      </li>
                      {item.children.map((child) => (
                        <li key={child.key}>
                          <Link
                            href={child.href}
                            onClick={close}
                            className="flex min-h-44 items-center rounded-pill px-12 text-body-lg text-ink hover:bg-canvas"
                          >
                            {child.label}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </nav>
      </Drawer>
    </>
  );
}
