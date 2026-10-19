import { db } from "@/lib/db";

/** City name for display. Orders store the French name; Arabic comes from City. */
export async function cityDisplayName(nameFr: string, locale: string): Promise<string> {
  if (locale !== "ar") return nameFr;
  const city = await db.city.findUnique({ where: { nameFr }, select: { nameAr: true } });
  return city?.nameAr ?? nameFr;
}
