export const NEW_PRODUCT_DAYS = 30;
const DAY_MS = 24 * 60 * 60 * 1000;

/** Whole-number discount percent, 0 when the product is not on sale. */
export function discountPercent(
  price: number,
  compareAtPrice: number | null | undefined,
): number {
  if (!compareAtPrice || compareAtPrice <= price) return 0;
  return Math.round(((compareAtPrice - price) / compareAtPrice) * 100);
}

export function isOnSale(
  price: number,
  compareAtPrice: number | null | undefined,
): boolean {
  return !!compareAtPrice && compareAtPrice > price;
}

/** "Nouveau" badge: published within the last 30 days. */
export function isNewProduct(
  publishedAt: Date | number | null | undefined,
  now: number = Date.now(),
): boolean {
  if (publishedAt === null || publishedAt === undefined) return false;
  const time = typeof publishedAt === "number" ? publishedAt : publishedAt.getTime();
  return now - time <= NEW_PRODUCT_DAYS * DAY_MS;
}
