import { getTranslations } from "next-intl/server";
import { ChevronRight } from "lucide-react";
import { Link } from "@/i18n/navigation";

export type Crumb = { label: string; href?: string };

export async function Breadcrumb({ items }: { items: Crumb[] }) {
  const t = await getTranslations("common");
  const all: Crumb[] = [{ label: t("home"), href: "/" }, ...items];

  return (
    <nav aria-label={t("breadcrumb")}>
      <ol className="flex flex-wrap items-center gap-x-6 text-body-sm text-muted">
        {all.map((item, index) => {
          const last = index === all.length - 1;
          return (
            <li key={`${item.label}-${index}`} className="inline-flex items-center gap-6">
              {item.href && !last ? (
                <Link href={item.href} className="rounded-pill py-8 hover:text-ink hover:underline">
                  {item.label}
                </Link>
              ) : (
                <span aria-current={last ? "page" : undefined} className={last ? "text-ink" : undefined}>
                  {item.label}
                </span>
              )}
              {!last ? (
                <ChevronRight
                  aria-hidden="true"
                  strokeWidth={1.5}
                  className="size-12 rtl:-scale-x-100"
                />
              ) : null}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
