"use server";

import { requireAdmin } from "@/lib/admin/session";
import { textOf, type FormState } from "@/lib/admin/form";
import { applyOrderStatusChange } from "@/lib/admin/order-status";
import { revalidateAdmin, revalidateStorefront } from "@/lib/admin/revalidate";

/** Move an order to another status (allowed transitions only, see transitionOrder). */
export async function changeOrderStatus(_previous: FormState, formData: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  const orderId = textOf(formData, "orderId");
  const result = await applyOrderStatusChange(
    { orderId, to: textOf(formData, "to"), note: textOf(formData, "note") },
    admin.id,
  );
  if (result.ok) {
    revalidateAdmin("/admin", "/admin/orders", `/admin/orders/${orderId}`);
    revalidateStorefront(); // stock may have been restored
  }
  return { ok: result.ok, message: result.message, fieldErrors: result.fieldErrors };
}
