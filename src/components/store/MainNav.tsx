"use client";

import { useEffect, useRef, useState, type FocusEvent, type KeyboardEvent } from "react";
import { ArrowRight, ChevronDown } from "lucide-react";
import { Link, usePathname } from "@/i18n/navigation";
import { decodeParam } from "@/lib/routes";
import { cn } from "@/lib/cn";

export type NavItem = {
  key: string;
  label: string;
  href: string;
  /** Mega-menu entries (subcategories). Items without children are plain links. */
  children?: { key: string; label: string; href: string }[];
};

type Props = {
  items: NavItem[];
  label: string;
  viewAll: string;
};

function isActive(pathname: string, href: string) {
  const path = decodeParam(pathname);
  const target = decodeParam(href);
  return path === target || path.startsWith(`${target}/`);
}

// Desktop navigation. Roots with children open a mega-menu on hover, focus,
// click or Enter/Space; Esc closes it and returns focus to the trigger.
export function MainNav({ items, label, viewAll }: Props) {
  const pathname = usePathname();
  const [openKey, setOpenKey] = useState<string | null>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const triggers = useRef(new Map<string, HTMLButtonElement>());

  useEffect(() => {
    setOpenKey(null);
  }, [pathname]);

  useEffect(() => () => clearTimeout(closeTimer.current), []);

  // Close on Esc (even when focus is elsewhere) and on a click outside the menu.
  const navRef = useRef<HTMLElement>(null);
  useEffect(() => {
    if (!openKey) return;
    const onKey = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") setOpenKey(null);
    };
    const onPointer = (event: PointerEvent) => {
      if (navRef.current && !navRef.current.contains(event.target as Node)) setOpenKey(null);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointer);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointer);
    };
  }, [openKey]);

  const cancelClose = () => clearTimeout(closeTimer.current);
  const scheduleClose = () => {
    cancelClose();
    closeTimer.current = setTimeout(() => setOpenKey(null), 120);
  };

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key === "Escape" && openKey) {
      triggers.current.get(openKey)?.focus();
      setOpenKey(null);
    }
  };

  const onBlur = (event: FocusEvent<HTMLLIElement>) => {
    if (!event.currentTarget.contains(event.relatedTarget)) {
      setOpenKey((current) => (current === event.currentTarget.dataset.key ? null : current));
    }
  };

  return (
    <nav ref={navRef} aria-label={label} className="relative" onKeyDown={onKeyDown}>
      <ul className="mx-auto flex max-w-page items-center justify-center gap-4 px-16">
        {items.map((item) => {
          const active = isActive(pathname, item.href);
          const isOpen = openKey === item.key;
          const linkClass = cn(
            "inline-flex min-h-44 items-center gap-6 rounded-pill px-16 text-body font-medium text-ink hover:bg-canvas",
            active && "underline decoration-2 underline-offset-8",
          );

          if (!item.children || item.children.length === 0) {
            return (
              <li
                key={item.key}
                onMouseEnter={() => {
                  cancelClose();
                  setOpenKey(null);
                }}
              >
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={linkClass}
                >
                  {item.label}
                </Link>
              </li>
            );
          }

          const panelId = `mega-${item.key}`;
          return (
            <li
              key={item.key}
              data-key={item.key}
              onMouseEnter={() => {
                cancelClose();
                setOpenKey(item.key);
              }}
              onMouseLeave={scheduleClose}
              onBlur={onBlur}
            >
              <button
                type="button"
                ref={(node) => {
                  if (node) triggers.current.set(item.key, node);
                  else triggers.current.delete(item.key);
                }}
                aria-expanded={isOpen}
                aria-controls={panelId}
                onClick={() => setOpenKey(isOpen ? null : item.key)}
                className={linkClass}
              >
                {item.label}
                <ChevronDown
                  aria-hidden="true"
                  strokeWidth={1.5}
                  className={cn(
                    "size-16 transition-transform duration-fast",
                    isOpen && "rotate-180",
                  )}
                />
              </button>

              {isOpen ? (
                <div
                  id={panelId}
                  className="absolute inset-x-0 top-full border-t border-line bg-surface shadow-lg"
                >
                  <div className="mx-auto max-w-page px-16 py-24">
                    <Link
                      href={item.href}
                      onClick={() => setOpenKey(null)}
                      className="mb-12 inline-flex min-h-44 items-center gap-8 rounded-pill text-body-lg font-semibold hover:underline"
                    >
                      {viewAll}
                      <span className="sr-only">{item.label}</span>
                      <ArrowRight
                        aria-hidden="true"
                        strokeWidth={1.5}
                        className="size-16 rtl:-scale-x-100"
                      />
                    </Link>
                    <ul className="grid grid-cols-2 gap-x-24 gap-y-4 md:grid-cols-3 lg:grid-cols-4">
                      {item.children.map((child) => (
                        <li key={child.key}>
                          <Link
                            href={child.href}
                            onClick={() => setOpenKey(null)}
                            className="inline-flex min-h-44 items-center rounded-pill text-body-lg text-ink hover:underline"
                          >
                            {child.label}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
