import Link from "next/link";
import { OrderStatusBadge, PageHeader, Panel, tableClass, tdClass, thClass, TableWrap, LinkButton } from "@/components/admin/ui";
import { db } from "@/lib/db";
import { formatDateTime } from "@/lib/admin/labels";
import { getTranslation } from "@/lib/i18n";
import { formatMoney } from "@/lib/money";
import { getSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

function startOfDay(now: Date) {
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <Panel>
      <p className="text-body text-muted">{label}</p>
      <p dir="ltr" className="mt-4 text-display-sm font-semibold tracking-tight">
        {value}
      </p>
      {hint ? <p className="mt-4 text-body-sm text-muted">{hint}</p> : null}
    </Panel>
  );
}

export default async function DashboardPage() {
  const now = new Date();
  const dayStart = startOfDay(now);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const { lowStockThreshold } = await getSettings();

  const [todayCount, newCount, newOrders, deliveredEvents, lowStock] = await Promise.all([
    db.order.count({ where: { createdAt: { gte: dayStart } } }),
    db.order.count({ where: { status: "NEW" } }),
    db.order.findMany({
      where: { status: "NEW" },
      orderBy: { createdAt: "asc" },
      take: 10,
      select: { id: true, number: true, createdAt: true, firstName: true, lastName: true, phone: true, city: true, total: true, status: true },
    }),
    // Revenue = orders DELIVERED this month (by delivery date), still DELIVERED today.
    db.orderStatusEvent.findMany({
      where: { to: "DELIVERED", createdAt: { gte: monthStart }, order: { status: "DELIVERED" } },
      select: { order: { select: { id: true, total: true } } },
    }),
    db.variant.findMany({
      where: { stock: { lte: lowStockThreshold }, product: { status: { not: "ARCHIVED" } } },
      orderBy: [{ stock: "asc" }, { sku: "asc" }],
      take: 20,
      include: {
        size: true,
        color: { include: { translations: true } },
        product: { include: { translations: true } },
      },
    }),
  ]);

  const deliveredOrders = new Map(deliveredEvents.map((e) => [e.order.id, e.order.total]));
  const revenue = [...deliveredOrders.values()].reduce((sum, total) => sum + total, 0);

  return (
    <>
      <PageHeader title="Tableau de bord" />

      <div className="grid grid-cols-1 gap-16 sm:grid-cols-3">
        <Stat label="Commandes aujourd'hui" value={String(todayCount)} />
        <Stat label="À confirmer (nouvelles)" value={String(newCount)} />
        <Stat
          label="Chiffre d'affaires du mois"
          value={formatMoney(revenue)}
          hint={`${deliveredOrders.size} commande(s) livrée(s)`}
        />
      </div>

      <div className="mt-16 grid grid-cols-1 gap-16 xl:grid-cols-2">
        <Panel
          title="Commandes à confirmer"
          actions={<LinkButton href="/admin/orders?status=NEW">Tout voir</LinkButton>}
        >
          {newOrders.length === 0 ? (
            <p className="py-16 text-body text-muted">Aucune nouvelle commande.</p>
          ) : (
            <TableWrap>
              <table className={tableClass}>
                <thead>
                  <tr>
                    <th className={thClass}>Commande</th>
                    <th className={thClass}>Client</th>
                    <th className={thClass}>Ville</th>
                    <th className={thClass}>Total</th>
                    <th className={thClass}>Statut</th>
                  </tr>
                </thead>
                <tbody>
                  {newOrders.map((order) => (
                    <tr key={order.id}>
                      <td className={tdClass}>
                        <Link href={`/admin/orders/${order.id}`} className="font-medium underline-offset-2 hover:underline">
                          {order.number}
                        </Link>
                        <div className="text-body-sm text-muted">{formatDateTime(order.createdAt)}</div>
                      </td>
                      <td className={tdClass}>
                        {order.firstName} {order.lastName}
                        <div dir="ltr" className="text-body-sm text-muted">
                          {order.phone}
                        </div>
                      </td>
                      <td className={tdClass}>{order.city}</td>
                      <td className={tdClass}>
                        <span dir="ltr">{formatMoney(order.total)}</span>
                      </td>
                      <td className={tdClass}>
                        <OrderStatusBadge status={order.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TableWrap>
          )}
        </Panel>

        <Panel title={`Stock faible (${lowStockThreshold} ou moins)`}>
          {lowStock.length === 0 ? (
            <p className="py-16 text-body text-muted">Aucune variante en stock faible.</p>
          ) : (
            <TableWrap>
              <table className={tableClass}>
                <thead>
                  <tr>
                    <th className={thClass}>Produit</th>
                    <th className={thClass}>Variante</th>
                    <th className={thClass}>SKU</th>
                    <th className={thClass}>Stock</th>
                  </tr>
                </thead>
                <tbody>
                  {lowStock.map((variant) => (
                    <tr key={variant.id}>
                      <td className={tdClass}>
                        <Link
                          href={`/admin/products/${variant.productId}`}
                          className="font-medium underline-offset-2 hover:underline"
                        >
                          {getTranslation(variant.product, "fr").name}
                        </Link>
                      </td>
                      <td className={tdClass}>
                        {getTranslation(variant.color, "fr").name} / {variant.size.label}
                      </td>
                      <td className={tdClass}>
                        <span dir="ltr" className="text-body-sm text-muted">
                          {variant.sku}
                        </span>
                      </td>
                      <td className={tdClass}>
                        <span className={variant.stock === 0 ? "font-semibold text-error" : "font-semibold text-warning"}>
                          {variant.stock}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TableWrap>
          )}
        </Panel>
      </div>
    </>
  );
}
