import { NextResponse } from "next/server";
import { z } from "zod";
import { loadListingProducts, searchWhere } from "@/lib/catalog";
import { productPath } from "@/lib/routes";
import { routing } from "@/i18n/routing";

export const dynamic = "force-dynamic";

const querySchema = z.object({
  q: z.string().trim().min(2).max(80),
  locale: z.enum(routing.locales),
});

// Live search suggestions: top 6 active products matching name/description in
// the requested locale (FR fallback), with first image and price.
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const parsed = querySchema.safeParse({
    q: searchParams.get("q") ?? "",
    locale: searchParams.get("locale") ?? routing.defaultLocale,
  });
  if (!parsed.success) {
    return NextResponse.json({ items: [] }, { status: 400 });
  }

  const { q, locale } = parsed.data;
  const products = await loadListingProducts(searchWhere(q, locale), locale, {
    orderBy: { publishedAt: "desc" },
    take: 6,
  });

  return NextResponse.json(
    {
      items: products.map((product) => ({
        id: product.id,
        name: product.name,
        href: productPath(product.slug),
        image: product.images[0]?.url ?? null,
        price: product.price,
      })),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
