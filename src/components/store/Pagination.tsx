import { getTranslations } from "next-intl/server";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/cn";

type Props = {
  page: number;
  totalPages: number;
  /** Builds the locale-less href of a page (keeps filters and sort). */
  hrefFor: (page: number) => string;
};

// Compact window: 1 ... 4 5 [6] 7 8 ... 20
function pageWindow(page: number, total: number): (number | "gap")[] {
  const wanted = new Set([1, total, page - 1, page, page + 1]);
  const pages = [...wanted].filter((p) => p >= 1 && p <= total).sort((a, b) => a - b);
  const out: (number | "gap")[] = [];
  pages.forEach((p, i) => {
    if (i > 0 && p - pages[i - 1] > 1) out.push("gap");
    out.push(p);
  });
  return out;
}

export async function Pagination({ page, totalPages, hrefFor }: Props) {
  if (totalPages <= 1) return null;
  const t = await getTranslations("listing");

  const item =
    "inline-flex size-44 items-center justify-center rounded-pill text-body-lg font-medium";

  return (
    <nav aria-label={t("pagination")} className="mt-48">
      <ul className="flex flex-wrap items-center justify-center gap-4">
        <li>
          {page > 1 ? (
            <Link
              href={hrefFor(page - 1)}
              rel="prev"
              aria-label={t("previousPage")}
              className={cn(item, "hover:bg-surface")}
            >
              <ChevronLeft aria-hidden="true" strokeWidth={1.5} className="size-20 rtl:-scale-x-100" />
            </Link>
          ) : (
            <span aria-hidden="true" className={cn(item, "text-cool-stone")}>
              <ChevronLeft strokeWidth={1.5} className="size-20 rtl:-scale-x-100" />
            </span>
          )}
        </li>
        {pageWindow(page, totalPages).map((entry, index) =>
          entry === "gap" ? (
            <li key={`gap-${index}`} aria-hidden="true" className={cn(item, "text-muted")}>
              ...
            </li>
          ) : (
            <li key={entry}>
              <Link
                href={hrefFor(entry)}
                aria-label={t("pageNumber", { page: entry })}
                aria-current={entry === page ? "page" : undefined}
                className={cn(
                  item,
                  entry === page ? "bg-ink text-on-accent" : "hover:bg-surface",
                )}
              >
                <span dir="ltr">{entry}</span>
              </Link>
            </li>
          ),
        )}
        <li>
          {page < totalPages ? (
            <Link
              href={hrefFor(page + 1)}
              rel="next"
              aria-label={t("nextPage")}
              className={cn(item, "hover:bg-surface")}
            >
              <ChevronRight aria-hidden="true" strokeWidth={1.5} className="size-20 rtl:-scale-x-100" />
            </Link>
          ) : (
            <span aria-hidden="true" className={cn(item, "text-cool-stone")}>
              <ChevronRight strokeWidth={1.5} className="size-20 rtl:-scale-x-100" />
            </span>
          )}
        </li>
      </ul>
    </nav>
  );
}
