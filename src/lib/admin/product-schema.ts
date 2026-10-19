import { z } from "zod";
import { fieldErrorsOf, parseMad } from "@/lib/admin/form";
import { slugify } from "@/lib/slugify";

// Validation of the product form. Pure (no database, no Next), so it is unit
// tested. Slug uniqueness is checked against the database by the action.

export const ADMIN_LOCALES = ["fr", "ar", "en"] as const;
export type AdminLocale = (typeof ADMIN_LOCALES)[number];

const optionalText = (max: number) => z.string().trim().max(max, `${max} caractères maximum`).default("");

const madField = (label: string) =>
  z
    .string()
    .trim()
    .transform((value, ctx) => {
      if (value === "") return null;
      const centimes = parseMad(value);
      if (centimes === null) {
        ctx.addIssue({ code: "custom", message: `${label} : montant invalide (ex. 199 ou 199.50)` });
        return z.NEVER;
      }
      return centimes;
    });

const productFormSchema = z
  .object({
    name_fr: z.string().trim().min(1, "Le nom français est obligatoire").max(200, "200 caractères maximum"),
    name_ar: optionalText(200),
    name_en: optionalText(200),
    slug_fr: optionalText(200),
    slug_ar: optionalText(200),
    slug_en: optionalText(200),
    description_fr: optionalText(5000),
    description_ar: optionalText(5000),
    description_en: optionalText(5000),
    categoryId: z.string().trim().min(1, "Choisissez une catégorie"),
    collectionIds: z.array(z.string().min(1)).max(100).default([]),
    price: madField("Prix").refine((v) => v !== null && v > 0, "Le prix est obligatoire (supérieur à 0)"),
    compareAt: madField("Prix barré"),
    status: z.enum(["DRAFT", "ACTIVE", "ARCHIVED"]),
    publishedAt: z
      .string()
      .trim()
      .default("")
      .transform((value, ctx) => {
        if (value === "") return null;
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) {
          ctx.addIssue({ code: "custom", message: "Date de publication invalide" });
          return z.NEVER;
        }
        return date;
      }),
    isFeatured: z.boolean().default(false),
  })
  .superRefine((data, ctx) => {
    if (data.compareAt !== null && data.price !== null && data.compareAt <= data.price) {
      ctx.addIssue({
        code: "custom",
        path: ["compareAt"],
        message: "Le prix barré doit être supérieur au prix",
      });
    }
  });

export type ProductTranslationInput = { name: string; slug: string; description: string | null };

export type ProductInput = {
  /** FR is always present; AR and EN only when their name is filled. */
  translations: { fr: ProductTranslationInput } & Partial<
    Record<Exclude<AdminLocale, "fr">, ProductTranslationInput>
  >;
  categoryId: string;
  collectionIds: string[];
  price: number;
  compareAtPrice: number | null;
  status: "DRAFT" | "ACTIVE" | "ARCHIVED";
  publishedAt: Date | null;
  isFeatured: boolean;
};

export type ParsedProduct =
  | { success: true; data: ProductInput }
  | { success: false; fieldErrors: Record<string, string> };

/**
 * Parse the raw product form values (names as in the form: name_fr, slug_ar,
 * price, compareAt...). Slugs are generated from the name when empty and are
 * always normalized with slugify.
 */
export function parseProductForm(raw: Record<string, unknown>): ParsedProduct {
  const parsed = productFormSchema.safeParse({
    name_fr: "",
    categoryId: "",
    price: "",
    compareAt: "",
    status: "DRAFT",
    ...raw,
    collectionIds: raw.collectionIds === undefined ? [] : [raw.collectionIds].flat(),
    isFeatured: raw.isFeatured === "on" || raw.isFeatured === true,
  });
  if (!parsed.success) return { success: false, fieldErrors: fieldErrorsOf(parsed.error) };
  const data = parsed.data;

  const fieldErrors: Record<string, string> = {};
  const translations: ProductInput["translations"] = {
    fr: { name: data.name_fr, slug: "", description: data.description_fr || null },
  };
  for (const locale of ADMIN_LOCALES) {
    const name = data[`name_${locale}`];
    if (locale !== "fr" && name === "") continue;
    const slug = slugify(data[`slug_${locale}`] || name);
    if (!slug) {
      fieldErrors[`slug_${locale}`] = "Slug invalide : utilisez des lettres ou des chiffres";
      continue;
    }
    translations[locale] = {
      name,
      slug,
      description: data[`description_${locale}`] || null,
    };
  }
  if (Object.keys(fieldErrors).length > 0) return { success: false, fieldErrors };

  return {
    success: true,
    data: {
      translations,
      categoryId: data.categoryId,
      collectionIds: [...new Set(data.collectionIds)],
      price: data.price as number,
      compareAtPrice: data.compareAt,
      status: data.status,
      publishedAt: data.publishedAt,
      isFeatured: data.isFeatured,
    },
  };
}
