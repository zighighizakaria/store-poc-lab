// Storefront data access: categories, collections and products, already
// resolved to the requested locale (FR fallback through getTranslation).
import { cache } from "react";
import type { Prisma, SizeGroup } from "@prisma/client";
import { db } from "@/lib/db";
import { getTranslation } from "@/lib/i18n";
import { mediaUrl } from "@/lib/media/url";
import { discountPercent, isNewProduct } from "@/lib/pricing";
import { categoryPath, collectionPath, type LocalePaths } from "@/lib/routes";
import { routing, type AppLocale } from "@/i18n/routing";

// ---------------------------------------------------------------- categories

const categoryArgs = {
  include: { translations: true },
} satisfies Prisma.CategoryDefaultArgs;

type CategoryRow = Prisma.CategoryGetPayload<typeof categoryArgs>;

export type CategoryNode = CategoryRow & {
  parent: CategoryNode | null;
  children: CategoryNode[];
};

export type CategoryIndex = {
  roots: CategoryNode[];
  byId: Map<string, CategoryNode>;
};

// The whole tree is tiny (about 16 rows): load it once per request and resolve
// slugs, parents and descendants in memory.
export const getCategoryIndex = cache(async (): Promise<CategoryIndex> => {
  const rows = await db.category.findMany({
    where: { isActive: true },
    orderBy: { position: "asc" },
    ...categoryArgs,
  });
  const byId = new Map<string, CategoryNode>(
    rows.map((row) => [row.id, { ...row, parent: null, children: [] }]),
  );
  const roots: CategoryNode[] = [];
  for (const node of byId.values()) {
    const parent = node.parentId ? byId.get(node.parentId) : undefined;
    if (parent) {
      node.parent = parent;
      parent.children.push(node);
    } else if (!node.parentId) {
      roots.push(node);
    }
  }
  return { roots, byId };
});

export function categoryText(node: CategoryNode, locale: string) {
  return getTranslation(node, locale);
}

/** Slugs from the root down to `node`, in `locale` (FR fallback). */
export function categorySlugs(node: CategoryNode, locale: string): string[] {
  const chain: string[] = [];
  for (let current: CategoryNode | null = node; current; current = current.parent) {
    chain.unshift(getTranslation(current, locale).slug);
  }
  return chain;
}

export function categoryHref(node: CategoryNode, locale: string): string {
  return categoryPath(categorySlugs(node, locale));
}

export function categoryPathsByLocale(node: CategoryNode): LocalePaths {
  return Object.fromEntries(
    routing.locales.map((l) => [l, categoryHref(node, l)]),
  );
}

/** Resolve `/c/a/b`. Each segment may be a slug in any locale. */
export function findCategoryBySegments(
  index: CategoryIndex,
  segments: string[],
): CategoryNode | null {
  let level = index.roots;
  let found: CategoryNode | null = null;
  for (const segment of segments) {
    found =
      level.find((node) => node.translations.some((t) => t.slug === segment)) ??
      null;
    if (!found) return null;
    level = found.children;
  }
  return found;
}

export function categoryAndDescendantIds(node: CategoryNode): string[] {
  return [node.id, ...node.children.flatMap(categoryAndDescendantIds)];
}

export function categoryRoot(node: CategoryNode): CategoryNode {
  return node.parent ? categoryRoot(node.parent) : node;
}

// --------------------------------------------------------------- collections

const collectionArgs = {
  include: { translations: true, mediaAsset: true },
} satisfies Prisma.CollectionDefaultArgs;

export type CollectionRow = Prisma.CollectionGetPayload<typeof collectionArgs>;

export function collectionPathsByLocale(collection: CollectionRow): LocalePaths {
  return Object.fromEntries(
    routing.locales.map((l) => [
      l,
      collectionPath(getTranslation(collection, l).slug),
    ]),
  );
}

export async function getCollectionBySlug(
  slug: string,
  locale: string,
): Promise<CollectionRow | null> {
  const where = (extra: Prisma.CollectionTranslationWhereInput) => ({
    isActive: true,
    translations: { some: extra },
  });
  return (
    (await db.collection.findFirst({
      where: where({ locale: locale as AppLocale, slug }),
      ...collectionArgs,
    })) ??
    (await db.collection.findFirst({ where: where({ slug }), ...collectionArgs }))
  );
}

export async function getHomeCollections(): Promise<CollectionRow[]> {
  return db.collection.findMany({
    where: { isActive: true, showOnHome: true },
    orderBy: { position: "asc" },
    ...collectionArgs,
  });
}

// ------------------------------------------------------------------ products

const listingArgs = {
  include: {
    translations: true,
    images: { orderBy: { position: "asc" }, include: { mediaAsset: true } },
    variants: {
      include: { color: { include: { translations: true } }, size: true },
    },
  },
} satisfies Prisma.ProductDefaultArgs;

type ListingRow = Prisma.ProductGetPayload<typeof listingArgs>;

export type ListingVariant = {
  colorId: string;
  sizeKey: string; // `${group}:${label}` (labels such as 40 exist in two groups)
  sizeLabel: string;
  group: SizeGroup;
  sizePos: number;
  stock: number;
};

export type ProductColor = { id: string; hex: string; name: string };

export type ListingProduct = {
  id: string;
  slug: string;
  name: string;
  price: number;
  compareAtPrice: number | null;
  percent: number;
  isNew: boolean;
  soldOut: boolean;
  publishedAt: number | null;
  images: { url: string; colorId: string | null }[];
  colors: ProductColor[];
  variants: ListingVariant[];
};

/** What the product card (a client component) needs. */
export type CardProduct = Omit<ListingProduct, "variants" | "publishedAt">;

export function toCardProduct(product: ListingProduct): CardProduct {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { variants, publishedAt, ...card } = product;
  return card;
}

export function toListingProduct(row: ListingRow, locale: string): ListingProduct {
  const text = getTranslation(row, locale);

  const colorById = new Map<string, ProductColor>();
  for (const variant of row.variants) {
    colorById.set(variant.colorId, {
      id: variant.colorId,
      hex: variant.color.hex,
      name: getTranslation(variant.color, locale).name,
    });
  }
  // Order colors by first image, then the remaining ones.
  const orderedIds: string[] = [];
  for (const image of row.images) {
    if (image.colorId && colorById.has(image.colorId) && !orderedIds.includes(image.colorId)) {
      orderedIds.push(image.colorId);
    }
  }
  for (const id of colorById.keys()) if (!orderedIds.includes(id)) orderedIds.push(id);

  return {
    id: row.id,
    slug: text.slug,
    name: text.name,
    price: row.price,
    compareAtPrice: row.compareAtPrice,
    percent: discountPercent(row.price, row.compareAtPrice),
    isNew: isNewProduct(row.publishedAt),
    soldOut: row.variants.every((v) => v.stock <= 0),
    publishedAt: row.publishedAt ? row.publishedAt.getTime() : null,
    images: row.images.map((image) => ({ url: mediaUrl(image.mediaAsset.storageKey), colorId: image.colorId })),
    colors: orderedIds.map((id) => colorById.get(id)!),
    variants: row.variants.map((v) => ({
      colorId: v.colorId,
      sizeKey: `${v.size.group}:${v.size.label}`,
      sizeLabel: v.size.label,
      group: v.size.group,
      sizePos: v.size.position,
      stock: v.stock,
    })),
  };
}

export async function loadListingProducts(
  where: Prisma.ProductWhereInput,
  locale: string,
  options: { orderBy?: Prisma.ProductOrderByWithRelationInput; take?: number } = {},
): Promise<ListingProduct[]> {
  const rows = await db.product.findMany({
    where: { status: "ACTIVE", ...where },
    orderBy: options.orderBy,
    take: options.take,
    ...listingArgs,
  });
  return rows.map((row) => toListingProduct(row, locale));
}

/** Products on sale (compareAtPrice > price). Prisma cannot compare two columns, so filter here. */
export async function loadSaleProducts(locale: string): Promise<ListingProduct[]> {
  const products = await loadListingProducts({ compareAtPrice: { not: null } }, locale);
  return products.filter((p) => p.percent > 0);
}

/** Active products whose name or description matches every search term. */
export function searchWhere(query: string, locale: string): Prisma.ProductWhereInput {
  const terms = query.split(/\s+/).filter(Boolean).slice(0, 5);
  return {
    AND: terms.map((term) => ({
      translations: {
        some: {
          locale: { in: [locale as AppLocale, routing.defaultLocale] },
          OR: [
            { name: { contains: term, mode: "insensitive" as const } },
            { description: { contains: term, mode: "insensitive" as const } },
          ],
        },
      },
    })),
  };
}

// ------------------------------------------------------------ product detail

const detailArgs = {
  include: {
    translations: true,
    category: {
      include: {
        translations: true,
        sizeGuide: { include: { translations: true } },
        parent: {
          include: { sizeGuide: { include: { translations: true } } },
        },
      },
    },
    images: {
      orderBy: { position: "asc" },
      include: { mediaAsset: { include: { translations: true } } },
    },
    variants: {
      include: { color: { include: { translations: true } }, size: true },
    },
  },
} satisfies Prisma.ProductDefaultArgs;

export type ProductDetailRow = Prisma.ProductGetPayload<typeof detailArgs>;

export async function getProductBySlug(
  slug: string,
  locale: string,
): Promise<ProductDetailRow | null> {
  return (
    (await db.product.findFirst({
      where: {
        status: "ACTIVE",
        translations: { some: { locale: locale as AppLocale, slug } },
      },
      ...detailArgs,
    })) ??
    (await db.product.findFirst({
      where: { status: "ACTIVE", translations: { some: { slug } } },
      ...detailArgs,
    }))
  );
}

export function productPathsByLocale(row: {
  translations: { locale: AppLocale; slug: string }[];
}): LocalePaths {
  return Object.fromEntries(
    routing.locales.map((l) => [l, `/p/${encodeURIComponent(getTranslation(row, l).slug)}`]),
  );
}

/** Up to 8 related products: same category first, then the same section; in stock first. */
export async function getRelatedProducts(
  product: ProductDetailRow,
  locale: string,
): Promise<ListingProduct[]> {
  const index = await getCategoryIndex();
  const node = index.byId.get(product.categoryId);
  const scopeIds = node ? categoryAndDescendantIds(categoryRoot(node)) : [product.categoryId];
  const candidates = await loadListingProducts(
    { id: { not: product.id }, categoryId: { in: scopeIds } },
    locale,
  );
  const sameCategory = new Map(
    (await db.product.findMany({
      where: { id: { in: candidates.map((c) => c.id) }, categoryId: product.categoryId },
      select: { id: true },
    })).map((r) => [r.id, true]),
  );
  return candidates
    .sort(
      (a, b) =>
        Number(a.soldOut) - Number(b.soldOut) ||
        Number(!sameCategory.has(a.id)) - Number(!sameCategory.has(b.id)) ||
        (b.publishedAt ?? 0) - (a.publishedAt ?? 0),
    )
    .slice(0, 8);
}
