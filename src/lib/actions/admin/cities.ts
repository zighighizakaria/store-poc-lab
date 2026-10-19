"use server";

import { db } from "@/lib/db";
import { fail, parseMad, success, textOf, type FormState } from "@/lib/admin/form";
import { revalidateAdmin, revalidateStorefront } from "@/lib/admin/revalidate";
import { requireAdmin } from "@/lib/admin/session";

/** Active toggle + optional shipping fee override (MAD in the form, centimes in the database). */
export async function saveCity(_previous: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  const id = textOf(formData, "id");
  const feeText = textOf(formData, "shippingFee").trim();
  const fee = feeText === "" ? null : parseMad(feeText);
  if (feeText !== "" && fee === null) return fail("Montant invalide.", { shippingFee: "Ex. 30 ou 30.50" });

  const city = await db.city.findUnique({ where: { id }, select: { id: true } });
  if (!city) return fail("Ville introuvable.");
  await db.city.update({
    where: { id },
    data: { isActive: formData.get("isActive") === "on", shippingFee: fee },
  });
  revalidateAdmin("/admin/cities");
  revalidateStorefront();
  return success("Ville enregistrée.");
}
