import { z } from "zod";
import type { OrderStatus } from "@prisma/client";
import { fail, fieldErrorsOf, success, type FormState } from "@/lib/admin/form";
import { ORDER_STATUS_LABELS, ORDER_STATUSES } from "@/lib/admin/labels";
import { transitionOrder } from "@/lib/orders";

const schema = z.object({
  orderId: z.string().min(1).max(64),
  to: z.enum(ORDER_STATUSES as [OrderStatus, ...OrderStatus[]]),
  note: z.string().trim().max(500, "500 caractères maximum").optional(),
});

/**
 * Admin status change: validates the input, then delegates to transitionOrder,
 * the single place that enforces ALLOWED_TRANSITIONS, restores stock and
 * writes the OrderStatusEvent. Pure of Next.js (the action revalidates).
 */
export async function applyOrderStatusChange(
  input: unknown,
  adminUserId: string,
): Promise<FormState & { orderId?: string }> {
  const parsed = schema.safeParse(input);
  if (!parsed.success) return fail("Données invalides.", fieldErrorsOf(parsed.error));

  const { orderId, note } = parsed.data;
  const { to } = parsed.data;
  const result = await transitionOrder(orderId, to, { adminUserId, note: note || null });

  if (result.ok) {
    return { ...success(`Commande passée à « ${ORDER_STATUS_LABELS[to]} ».`), orderId };
  }
  if (result.reason === "not_found") return fail("Commande introuvable.");
  if (result.reason === "forbidden") {
    return fail(
      `Changement non autorisé : une commande « ${ORDER_STATUS_LABELS[result.from]} » ne peut pas passer à « ${ORDER_STATUS_LABELS[to]} ».`,
    );
  }
  return fail("La commande vient d'être modifiée par quelqu'un d'autre. Rechargez la page.");
}
