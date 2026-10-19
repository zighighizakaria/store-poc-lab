"use client";

import type { OrderStatus } from "@prisma/client";
import { AdminForm, ConfirmSubmit, SubmitButton } from "@/components/admin/AdminForm";
import { Textarea } from "@/components/ui/Input";
import { changeOrderStatus } from "@/lib/actions/admin/orders";
import { ORDER_ACTION_LABELS } from "@/lib/admin/labels";

/** One button per allowed transition (the server enforces the same map). */
export function OrderStatusActions({
  orderId,
  allowed,
}: {
  orderId: string;
  allowed: OrderStatus[];
}) {
  if (allowed.length === 0) {
    return <p className="text-body text-muted">Cette commande est dans un état final.</p>;
  }
  return (
    <AdminForm action={changeOrderStatus}>
      <input type="hidden" name="orderId" value={orderId} />
      <Textarea name="note" rows={2} maxLength={500} placeholder="Note (facultative, ajoutée à l'historique)" aria-label="Note" />
      <div className="flex flex-wrap gap-8">
        {allowed.map((to) => {
          const destructive = to === "CANCELLED" || to === "RETURNED";
          return destructive ? (
            <ConfirmSubmit
              key={to}
              name="to"
              value={to}
              variant="secondary"
              message={`${ORDER_ACTION_LABELS[to]} ? Le stock des articles sera remis en vente.`}
            >
              {ORDER_ACTION_LABELS[to]}
            </ConfirmSubmit>
          ) : (
            <SubmitButton key={to} name="to" value={to} variant="primary">
              {ORDER_ACTION_LABELS[to]}
            </SubmitButton>
          );
        })}
      </div>
    </AdminForm>
  );
}
