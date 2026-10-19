import type { ReactNode } from "react";
import { getTranslations } from "next-intl/server";
import { X } from "lucide-react";
import { Link } from "@/i18n/navigation";
import type { ListingProduct } from "@/lib/catalog";
import {
  applyFilters,
  buildQueryString,
  computeFacets,
  hasActiveFilters,
  paginate,
  parseListingQuery,
  sortProducts,
  type ListingQuery,
  type SortKey,
} from "@/lib/listing";
import { toCardProduct } from "@/lib/catalog";
import { Breadcrumb, type Crumb } from "./Breadcrumb";
import { FilterDrawerButton, FilterSidebar, type SubcategoryLink } from "./ListingFilters";
import { Pagination } from "./Pagination";
import { ProductGrid } from "./ProductGrid";
import { SortSelect } from "./SortSelect";

type Props = {
  /** Locale-less path of this listing, used for filter, sort and page links. */
  basePath: string;
  title: string;
  description?: string | null;
  breadcrumb: Crumb[];
  /** Every product of the listing scope (before filters). */
  products: ListingProduct[];
  searchParams: Record<string, string | string[] | undefined>;
  defaultSort?: SortKey;
  subcategories?: SubcategoryLink[];
  /** Query params that belong to the page itself (e.g. {q} on search). */
  extraQuery?: Record<string, string | undefined>;
  /** Shown instead of the grid when the scope itself has no product. */
  emptyState?: ReactNode;
};

export async function ListingView({
  basePath,
  title,
  description,
  breadcrumb,
  products,
  searchParams,
  defaultSort = "newest",
  subcategories = [],
  extraQuery = {},
  emptyState,
}: Props) {
  const t = await getTranslations("listing");

  const query = parseListingQuery(searchParams, defaultSort);
  const facets = computeFacets(products, query);
  const filtered = sortProducts(applyFilters(products, query), query.sort);
  const pageData = paginate(filtered, query.page);

  const hrefFor = (next: Partial<ListingQuery>) =>
    `${basePath}${buildQueryString({ ...query, ...next }, defaultSort, extraQuery)}`;

  // Active filter chips (each removes itself).
  const colorNames = new Map(products.flatMap((p) => p.colors).map((c) => [c.id, c.name]));
  const sizeLabels = new Map(
    products.flatMap((p) => p.variants).map((v) => [v.sizeKey, v.sizeLabel]),
  );
  const chips: { key: string; label: string; href: string }[] = [
    ...query.sizes.map((size) => ({
      key: `size-${size}`,
      label: `${t("size")} ${sizeLabels.get(size) ?? size.split(":").slice(1).join(":")}`,
      href: hrefFor({ sizes: query.sizes.filter((s) => s !== size), page: 1 }),
    })),
    ...query.colors.map((color) => ({
      key: `color-${color}`,
      label: colorNames.get(color) ?? t("color"),
      href: hrefFor({ colors: query.colors.filter((c) => c !== color), page: 1 }),
    })),
  ];
  if (query.min !== null || query.max !== null) {
    chips.push({
      key: "price",
      label: `${t("price")} ${query.min ?? facets.priceBounds?.min ?? 0} - ${query.max ?? facets.priceBounds?.max ?? ""} MAD`,
      href: hrefFor({ min: null, max: null, page: 1 }),
    });
  }
  const clearAllHref = hrefFor({ sizes: [], colors: [], min: null, max: null, page: 1 });

  const filterProps = {
    basePath,
    extraQuery,
    defaultSort,
    query,
    facets,
    subcategories,
    resultCount: pageData.total,
  };

  return (
    <div className="mx-auto max-w-page px-16 pt-12">
      <Breadcrumb items={breadcrumb} />

      <header className="mt-8 mb-24 flex flex-col gap-8">
        <h1 className="text-display-sm font-semibold tracking-tight md:text-display">{title}</h1>
        {description ? <p className="max-w-narrow text-body-lg text-muted">{description}</p> : null}
      </header>

      {products.length === 0 && emptyState ? (
        emptyState
      ) : (
        <div className="lg:grid lg:grid-cols-[var(--container-sidebar)_1fr] lg:items-start lg:gap-x-32">
          <FilterSidebar {...filterProps} />

          <div>
            <div className="mb-16 flex items-center justify-between gap-12">
              <p className="text-body text-muted" aria-live="polite">
                {t("count", { count: pageData.total })}
              </p>
              <div className="flex items-center gap-8">
                <FilterDrawerButton {...filterProps} />
                <SortSelect
                  basePath={basePath}
                  extraQuery={extraQuery}
                  defaultSort={defaultSort}
                  query={query}
                />
              </div>
            </div>

            {hasActiveFilters(query) ? (
              <div className="mb-16 flex flex-wrap items-center gap-8">
                <span className="sr-only">{t("activeFilters")}</span>
                {chips.map((chip) => (
                  <Link
                    key={chip.key}
                    href={chip.href}
                    scroll={false}
                    aria-label={t("removeFilter", { filter: chip.label })}
                    className="inline-flex min-h-40 items-center gap-8 rounded-pill border border-line bg-surface px-16 text-body shadow-sm hover:bg-canvas"
                  >
                    {chip.label}
                    <X aria-hidden="true" strokeWidth={1.5} className="size-16" />
                  </Link>
                ))}
                <Link
                  href={clearAllHref}
                  scroll={false}
                  className="inline-flex min-h-44 items-center rounded-pill px-8 text-body font-medium underline"
                >
                  {t("clearAll")}
                </Link>
              </div>
            ) : null}

            {pageData.items.length === 0 ? (
              <div className="rounded-card bg-surface p-32 text-center shadow-sm">
                <p className="text-title font-semibold">{t("noResults")}</p>
                <p className="mt-8 text-body text-muted">{t("noResultsHint")}</p>
                {hasActiveFilters(query) ? (
                  <Link
                    href={clearAllHref}
                    className="mt-16 inline-flex min-h-44 items-center rounded-pill bg-ink px-20 text-body font-medium text-on-accent hover:bg-slate-ink"
                  >
                    {t("clearAll")}
                  </Link>
                ) : null}
              </div>
            ) : (
              <>
                <ProductGrid
                  products={pageData.items.map(toCardProduct)}
                  columns={3}
                  priorityCount={4}
                  className="lg:grid-cols-3"
                />
                <Pagination
                  page={pageData.page}
                  totalPages={pageData.totalPages}
                  hrefFor={(page) => hrefFor({ page })}
                />
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
