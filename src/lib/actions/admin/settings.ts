"use server";

import { z } from "zod";
import { db } from "@/lib/db";
import { fail, fieldErrorsOf, formToObject, parseMad, success, type FormState } from "@/lib/admin/form";
import { revalidateAdmin, revalidateStorefront } from "@/lib/admin/revalidate";
import { requireAdmin } from "@/lib/admin/session";

const mad = (label: string) =>
  z
    .string()
    .trim()
    .transform((value, ctx) => {
      const centimes = parseMad(value);
      if (centimes === null) {
        ctx.addIssue({ code: "custom", message: `${label} : montant invalide (ex. 30 ou 30.50)` });
        return z.NEVER;
      }
      return centimes;
    });

const settingsSchema = z.object({
  shippingFee: mad("Frais de livraison"),
  freeShippingThreshold: mad("Seuil de livraison gratuite"),
  // International format, digits only (wa.me links): "+212 6 00 00 00 00" is accepted and cleaned.
  whatsappNumber: z
    .string()
    .trim()
    .transform((v) => v.replace(/[\s+().-]/g, ""))
    .refine((v) => v === "" || /^\d{8,15}$/.test(v), "Numéro invalide (8 à 15 chiffres, format international)"),
  adminNotifyEmail: z
    .string()
    .trim()
    .max(254)
    .refine((v) => v === "" || z.email().safeParse(v).success, "Adresse e-mail invalide"),
  lowStockThreshold: z.coerce.number().int("Entier requis").min(0, "≥ 0").max(1000, "1000 maximum"),
});

/** Update the Settings singleton. */
export async function saveSettings(_previous: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  const parsed = settingsSchema.safeParse(formToObject(formData));
  if (!parsed.success) return fail("Corrigez les champs en erreur.", fieldErrorsOf(parsed.error));
  const { whatsappNumber, adminNotifyEmail, ...rest } = parsed.data;
  const data = {
    ...rest,
    whatsappNumber: whatsappNumber || null,
    adminNotifyEmail: adminNotifyEmail || null,
  };
  await db.settings.upsert({
    where: { id: "singleton" },
    update: data,
    create: { id: "singleton", ...data },
  });
  revalidateAdmin("/admin/settings", "/admin");
  revalidateStorefront();
  return success("Réglages enregistrés.");
}
