// Listing logic shared by category, collection, sale, new and search pages:
// URL query parsing, filtering, facets, sorting and pagination. Pure functions
// working on already-loaded products (the catalog is small; filters are applied
// in memory so facet counts stay consistent).
import type { SizeGroup } from "@prisma/client";
import type { ListingProduct } from "@/lib/catalog";

export const PAGE_SIZE = 24;

export const SORT_KEYS = ["newest", "price-asc", "price-desc", "discount"] as const;
export type SortKey = (typeof SORT_KEYS)[number];

export type ListingQuery = {
  sizes: string[]; // `${group}:${label}`
  colors: string[]; // color ids
  min: number | null; // whole MAD
  max: number | null; // whole MAD
  sort: SortKey;
  page: number;
};

type RawParams = Record<string, string | string[] | undefined>;

function many(value: string | string[] | undefined): string[] {
  if (value === undefined) return [];
  return (Array.isArray(value) ? value : [value]).flatMap((v) => v.split(",")).filter(Boolean);
}

function one(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function wholeNumber(value: string | undefined): number | null {
  if (value === undefined || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : null;
}

export function parseListingQuery(params: RawParams, defaultSort: SortKey): ListingQuery {
  const sort = one(params.sort);
  const page = Number(one(params.page));
  return {
    sizes: many(params.size),
    colors: many(params.color),
    min: wholeNumber(one(params.min)),
    max: wholeNumber(one(params.max)),
    sort: (SORT_KEYS as readonly string[]).includes(sort ?? "")
      ? (sort as SortKey)
      : defaultSort,
    page: Number.isInteger(page) && page > 0 ? page : 1,
  };
}

/** Query string ("?a=b" or "") for a listing; default sort and page 1 are omitted. */
export function buildQueryString(
  query: ListingQuery,
  defaultSort: SortKey,
  extra: Record<string, string | undefined> = {},
): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(extra)) {
    if (value) params.set(key, value);
  }
  for (const size of query.sizes) params.append("size", size);
  for (const color of query.colors) params.append("color", color);
  if (query.min !== null) params.set("min", String(query.min));
  if (query.max !== null) params.set("max", String(query.max));
  if (query.sort !== defaultSort) params.set("sort", query.sort);
  if (query.page > 1) params.set("page", String(query.page));
  const text = params.toString();
  return text ? `?${text}` : "";
}

export function hasActiveFilters(query: ListingQuery): boolean {
  return (
    query.sizes.length > 0 ||
    query.colors.length > 0 ||
    query.min !== null ||
    query.max !== null
  );
}

// ------------------------------------------------------------------ filtering

type FilterOptions = { ignoreSizes?: boolean; ignoreColors?: boolean };

function matches(
  product: ListingProduct,
  query: ListingQuery,
  { ignoreSizes = false, ignoreColors = false }: FilterOptions = {},
): boolean {
  if (query.min !== null && product.price < query.min * 100) return false;
  if (query.max !== null && product.price > query.max * 100) return false;

  const wantSizes = !ignoreSizes && query.sizes.length > 0;
  const wantColors = !ignoreColors && query.colors.length > 0;
  if (!wantSizes && !wantColors) return true;

  // One in-stock variant must satisfy the selected sizes AND colors together.
  return product.variants.some(
    (v) =>
      v.stock > 0 &&
      (!wantSizes || query.sizes.includes(v.sizeKey)) &&
      (!wantColors || query.colors.includes(v.colorId)),
  );
}

export function applyFilters(products: ListingProduct[], query: ListingQuery): ListingProduct[] {
  return products.filter((p) => matches(p, query));
}

// --------------------------------------------------------------------- facets

export type SizeFacet = { value: string; label: string; count: number };
export type SizeGroupFacet = { group: SizeGroup; sizes: SizeFacet[] };
export type ColorFacet = { id: string; hex: string; name: string; count: number };
export type ListingFacets = {
  sizeGroups: SizeGroupFacet[];
  colors: ColorFacet[];
  priceBounds: { min: number; max: number } | null; // whole MAD
};

const GROUP_ORDER: SizeGroup[] = ["TOP", "BOTTOM", "SHOES", "ONE_SIZE"];

export function computeFacets(products: ListingProduct[], query: ListingQuery): ListingFacets {
  // Size counts ignore the size filter itself (so other sizes stay selectable),
  // color counts ignore the color filter.
  const forSizes = products.filter((p) => matches(p, query, { ignoreSizes: true }));
  const forColors = products.filter((p) => matches(p, query, { ignoreColors: true }));

  const sizeMap = new Map<string, SizeFacet & { group: SizeGroup; pos: number }>();
  for (const product of forSizes) {
    const seen = new Set<string>();
    for (const v of product.variants) {
      if (v.stock <= 0 || seen.has(v.sizeKey)) continue;
      seen.add(v.sizeKey);
      const entry = sizeMap.get(v.sizeKey);
      if (entry) entry.count += 1;
      else
        sizeMap.set(v.sizeKey, {
          value: v.sizeKey,
          label: v.sizeLabel,
          count: 1,
          group: v.group,
          pos: v.sizePos,
        });
    }
  }
  // A selected size with zero results must stay visible so it can be unchecked.
  for (const key of query.sizes) {
    if (!sizeMap.has(key)) {
      const [group, ...rest] = key.split(":");
      if (GROUP_ORDER.includes(group as SizeGroup)) {
        sizeMap.set(key, {
          value: key,
          label: rest.join(":"),
          count: 0,
          group: group as SizeGroup,
          pos: 999,
        });
      }
    }
  }
  const sizeGroups = GROUP_ORDER.map((group) => ({
    group,
    sizes: [...sizeMap.values()]
      .filter((s) => s.group === group)
      .sort((a, b) => a.pos - b.pos)
      .map(({ value, label, count }) => ({ value, label, count })),
  })).filter((g) => g.sizes.length > 0);

  const colorMap = new Map<string, ColorFacet>();
  for (const product of forColors) {
    const inStock = new Set(product.variants.filter((v) => v.stock > 0).map((v) => v.colorId));
    for (const color of product.colors) {
      if (!inStock.has(color.id)) continue;
      const entry = colorMap.get(color.id);
      if (entry) entry.count += 1;
      else colorMap.set(color.id, { ...color, count: 1 });
    }
  }

  const prices = products.map((p) => p.price);
  return {
    sizeGroups,
    colors: [...colorMap.values()].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name)),
    priceBounds:
      prices.length > 0
        ? {
            min: Math.floor(Math.min(...prices) / 100),
            max: Math.ceil(Math.max(...prices) / 100),
          }
        : null,
  };
}

// --------------------------------------------------------------------- sorting

export function sortProducts(products: ListingProduct[], sort: SortKey): ListingProduct[] {
  const newest = (a: ListingProduct, b: ListingProduct) =>
    (b.publishedAt ?? 0) - (a.publishedAt ?? 0) || a.id.localeCompare(b.id);
  const sorted = [...products];
  switch (sort) {
    case "price-asc":
      return sorted.sort((a, b) => a.price - b.price || newest(a, b));
    case "price-desc":
      return sorted.sort((a, b) => b.price - a.price || newest(a, b));
    case "discount":
      return sorted.sort((a, b) => b.percent - a.percent || newest(a, b));
    default:
      return sorted.sort(newest);
  }
}

export function paginate<T>(items: T[], page: number) {
  const totalPages = Math.max(1, Math.ceil(items.length / PAGE_SIZE));
  const current = Math.min(page, totalPages);
  return {
    items: items.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE),
    page: current,
    totalPages,
    total: items.length,
  };
}
