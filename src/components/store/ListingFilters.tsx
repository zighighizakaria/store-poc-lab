"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ColorSwatch } from "@/components/ui/ColorSwatch";
import { Drawer } from "@/components/ui/Drawer";
import { Input } from "@/components/ui/Input";
import { SizeButton } from "@/components/ui/SizeButton";
import { Link, useRouter } from "@/i18n/navigation";
import { cn } from "@/lib/cn";
import {
  buildQueryString,
  type ListingFacets,
  type ListingQuery,
  type SortKey,
} from "@/lib/listing";

export type SubcategoryLink = { key: string; label: string; href: string; active: boolean };

type Props = {
  basePath: string; // locale-less path of the listing
  extraQuery: Record<string, string | undefined>; // e.g. {q} on the search page
  defaultSort: SortKey;
  query: ListingQuery;
  facets: ListingFacets;
  subcategories: SubcategoryLink[];
  resultCount: number;
};

function toggle(list: string[], value: string): string[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

// Filters live in the URL: every change navigates (server-rendered results).
// The same panel is shown in a sidebar (desktop) and in a drawer (mobile).
export function FilterSidebar(props: Props) {
  const t = useTranslations("listing");
  return (
    <aside aria-label={t("filters")} className="hidden lg:block">
      <FilterPanel key={`${props.query.min}-${props.query.max}`} {...props} />
    </aside>
  );
}

export function FilterDrawerButton(props: Props) {
  const t = useTranslations("listing");
  const [open, setOpen] = useState(false);
  const { query, resultCount } = props;

  const activeCount =
    query.sizes.length + query.colors.length + (query.min !== null || query.max !== null ? 1 : 0);

  return (
    <>
      <Button
        variant="secondary"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        className="lg:hidden"
      >
        <SlidersHorizontal aria-hidden="true" strokeWidth={1.5} className="size-16" />
        {t("filterButton")}
        {activeCount > 0 ? (
          <span
            dir="ltr"
            className="inline-flex min-w-20 items-center justify-center rounded-pill bg-accent px-6 text-caption leading-[20px] text-on-accent"
          >
            {activeCount}
          </span>
        ) : null}
      </Button>

      <Drawer
        open={open}
        onClose={() => setOpen(false)}
        title={t("filters")}
        closeLabel={t("close")}
        footer={
          <Button fullWidth size="lg" onClick={() => setOpen(false)}>
            {t("showResults", { count: resultCount })}
          </Button>
        }
      >
        {/* Remount when the price filter changes from outside (chips) so the inputs resync. */}
        <FilterPanel key={`${query.min}-${query.max}`} {...props} />
      </Drawer>
    </>
  );
}

function FilterPanel({
  basePath,
  extraQuery,
  defaultSort,
  query,
  facets,
  subcategories,
}: Props) {
  const t = useTranslations("listing");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [min, setMin] = useState(query.min === null ? "" : String(query.min));
  const [max, setMax] = useState(query.max === null ? "" : String(query.max));

  const go = (next: Partial<ListingQuery>) => {
    const qs = buildQueryString({ ...query, ...next, page: 1 }, defaultSort, extraQuery);
    startTransition(() => router.push(`${basePath}${qs}`, { scroll: false }));
  };

  const applyPrice = (event?: FormEvent) => {
    event?.preventDefault();
    const parse = (value: string) => {
      const n = Number(value);
      return value.trim() !== "" && Number.isFinite(n) && n >= 0 ? Math.floor(n) : null;
    };
    let nextMin = parse(min);
    let nextMax = parse(max);
    if (nextMin !== null && nextMax !== null && nextMin > nextMax) {
      [nextMin, nextMax] = [nextMax, nextMin];
    }
    go({ min: nextMin, max: nextMax });
  };

  const heading = "mb-12 text-body-lg font-semibold text-ink";
  const bounds = facets.priceBounds;

  return (
    <div className={cn("flex flex-col gap-24 transition-opacity", pending && "opacity-60")}>
      {subcategories.length > 0 ? (
        <section aria-labelledby="filter-subcategories">
          <h2 id="filter-subcategories" className={heading}>
            {t("subcategories")}
          </h2>
          <ul className="flex flex-col">
            {subcategories.map((sub) => (
              <li key={sub.key}>
                <Link
                  href={sub.href}
                  aria-current={sub.active ? "page" : undefined}
                  className={cn(
                    "flex min-h-44 items-center rounded-pill px-12 text-body hover:bg-canvas",
                    sub.active ? "bg-canvas font-semibold text-ink" : "text-ink",
                  )}
                >
                  {sub.label}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {facets.sizeGroups.length > 0 ? (
        <section aria-labelledby="filter-size">
          <h2 id="filter-size" className={heading}>
            {t("size")}
          </h2>
          <div className="flex flex-col gap-16">
            {facets.sizeGroups.map((group) => (
              <div key={group.group} role="group" aria-label={t(`sizeGroups.${group.group}`)}>
                {facets.sizeGroups.length > 1 ? (
                  <p className="mb-8 text-body-sm text-muted">{t(`sizeGroups.${group.group}`)}</p>
                ) : null}
                <div className="flex flex-wrap gap-8">
                  {group.sizes.map((size) => {
                    const selected = query.sizes.includes(size.value);
                    return (
                      <SizeButton
                        key={size.value}
                        selected={selected}
                        disabled={size.count === 0 && !selected}
                        aria-label={t("sizeOption", { size: size.label, count: size.count })}
                        onClick={() => go({ sizes: toggle(query.sizes, size.value) })}
                        className="gap-6 px-12"
                      >
                        <span>{size.label}</span>
                        <span
                          dir="ltr"
                          className={cn(
                            "text-caption",
                            selected ? "text-on-accent" : "text-muted",
                          )}
                        >
                          {size.count}
                        </span>
                      </SizeButton>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {facets.colors.length > 0 ? (
        <section aria-labelledby="filter-color">
          <h2 id="filter-color" className={heading}>
            {t("color")}
          </h2>
          <div className="-ms-6 flex flex-wrap">
            {facets.colors.map((color) => (
              <ColorSwatch
                key={color.id}
                hex={color.hex}
                name={`${color.name} (${color.count})`}
                selected={query.colors.includes(color.id)}
                onClick={() => go({ colors: toggle(query.colors, color.id) })}
              />
            ))}
          </div>
        </section>
      ) : null}

      {bounds ? (
        <section aria-labelledby="filter-price">
          <h2 id="filter-price" className={heading}>
            {t("price")}
          </h2>
          <form onSubmit={applyPrice} className="flex flex-col gap-8">
            <div className="flex items-center gap-8" dir="ltr">
              <Input
                type="number"
                inputMode="numeric"
                min={0}
                value={min}
                placeholder={String(bounds.min)}
                aria-label={t("minPrice")}
                onChange={(event) => setMin(event.target.value)}
                className="px-16"
              />
              <span aria-hidden="true" className="text-muted">
                -
              </span>
              <Input
                type="number"
                inputMode="numeric"
                min={0}
                value={max}
                placeholder={String(bounds.max)}
                aria-label={t("maxPrice")}
                onChange={(event) => setMax(event.target.value)}
                className="px-16"
              />
            </div>
            <Button type="submit" variant="secondary" size="sm">
              {t("applyPrice")}
            </Button>
          </form>
        </section>
      ) : null}
    </div>
  );
}
