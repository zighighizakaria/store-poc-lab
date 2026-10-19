import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MessageCircle, Phone } from "lucide-react";
import { OrderStatusActions } from "@/components/admin/OrderStatusActions";
import { PrintButton } from "@/components/admin/PrintButton";
import {
  LinkButton,
  OrderStatusBadge,
  PageHeader,
  Panel,
  TableWrap,
  tableClass,
  tdClass,
  thClass,
} from "@/components/admin/ui";
import { db } from "@/lib/db";
import { formatDateTime, ORDER_STATUS_LABELS } from "@/lib/admin/labels";
import { formatMoney } from "@/lib/money";
import { ALLOWED_TRANSITIONS } from "@/lib/orders";
import { siteConfig } from "../../../../../../site.config";

export const dynamic = "force-dynamic";

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-12 py-6 text-body">
      <dt className="text-muted">{label}</dt>
      <dd className="text-end font-medium">{children}</dd>
    </div>
  );
}

export default async function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const order = await db.order.findUnique({
    where: { id },
    include: {
      items: { orderBy: { createdAt: "asc" } },
      statusEvents: {
        orderBy: { createdAt: "desc" },
        include: { adminUser: { select: { name: true } } },
      },
    },
  });
  if (!order) notFound();

  const customer = `${order.firstName} ${order.lastName}`;
  const waNumber = order.phone.replace(/\D/g, "");
  const waText = encodeURIComponent(`Bonjour ${order.firstName}, au sujet de votre commande ${order.number}.`);
  const allowed = [...ALLOWED_TRANSITIONS[order.status]];

  return (
    <>
      <div className="print:hidden">
        <PageHeader
          title={`Commande ${order.number}`}
          description={`Passée le ${formatDateTime(order.createdAt)}`}
          actions={
            <>
              <OrderStatusBadge status={order.status} />
              <PrintButton>Bon de livraison</PrintButton>
              <LinkButton href="/admin/orders">Retour</LinkButton>
            </>
          }
        />

        <div className="grid grid-cols-1 gap-16 xl:grid-cols-3">
          <div className="flex flex-col gap-16 xl:col-span-2">
            <Panel title="Articles">
              <TableWrap>
                <table className={tableClass}>
                  <thead>
                    <tr>
                      <th className={thClass}>Article</th>
                      <th className={thClass}>SKU</th>
                      <th className={thClass}>Prix</th>
                      <th className={thClass}>Qté</th>
                      <th className={thClass}>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {order.items.map((item) => (
                      <tr key={item.id}>
                        <td className={tdClass}>
                          <div className="flex items-center gap-12">
                            <div className="relative h-48 w-40 shrink-0 overflow-hidden rounded-lg bg-canvas">
                              {item.image ? (
                                <Image src={item.image} alt="" fill sizes="40px" className="object-cover" />
                              ) : null}
                            </div>
                            <div className="min-w-0">
                              <div className="font-medium">{item.productName}</div>
                              <div className="text-body-sm text-muted">
                                {item.colorName} / {item.sizeLabel}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className={tdClass}>
                          <span dir="ltr" className="text-body-sm text-muted">
                            {item.sku}
                          </span>
                        </td>
                        <td className={tdClass}>
                          <span dir="ltr" className="whitespace-nowrap">
                            {formatMoney(item.unitPrice)}
                          </span>
                        </td>
                        <td className={tdClass}>{item.quantity}</td>
                        <td className={tdClass}>
                          <span dir="ltr" className="whitespace-nowrap font-medium">
                            {formatMoney(item.unitPrice * item.quantity)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </TableWrap>
              <dl className="mt-12 border-t border-line pt-8">
                <Row label="Sous-total">
                  <span dir="ltr">{formatMoney(order.subtotal)}</span>
                </Row>
                <Row label="Livraison">
                  <span dir="ltr">{order.shippingFee === 0 ? "Gratuite" : formatMoney(order.shippingFee)}</span>
                </Row>
                <Row label="Total à encaisser (paiement à la livraison)">
                  <span dir="ltr" className="text-body-lg font-semibold">
                    {formatMoney(order.total)}
                  </span>
                </Row>
              </dl>
            </Panel>

            <Panel title="Historique">
              <ol className="flex flex-col gap-12">
                {order.statusEvents.map((event) => (
                  <li key={event.id} className="border-s-2 border-line ps-12">
                    <div className="flex flex-wrap items-center gap-8">
                      {event.from ? (
                        <>
                          <OrderStatusBadge status={event.from} />
                          <span aria-hidden="true">→</span>
                        </>
                      ) : null}
                      <OrderStatusBadge status={event.to} />
                      <span className="text-body-sm text-muted">{formatDateTime(event.createdAt)}</span>
                    </div>
                    <p className="mt-4 text-body-sm text-muted">
                      {event.adminUser?.name ?? (event.from === null ? "Commande passée par le client" : "Système")}
                    </p>
                    {event.note ? <p className="mt-4 text-body">{event.note}</p> : null}
                  </li>
                ))}
              </ol>
            </Panel>
          </div>

          <div className="flex flex-col gap-16">
            <Panel title={`Statut : ${ORDER_STATUS_LABELS[order.status]}`}>
              <OrderStatusActions orderId={order.id} allowed={allowed} />
            </Panel>

            <Panel title="Client">
              <p className="text-body-lg font-semibold">{customer}</p>
              <p dir="ltr" className="mt-4 text-body text-start">
                {order.phone}
              </p>
              <div className="mt-12 flex flex-wrap gap-8">
                <a
                  href={`tel:${order.phone}`}
                  className="inline-flex min-h-44 items-center gap-8 rounded-pill bg-ink px-20 text-body font-medium text-on-ink hover:bg-slate-ink"
                >
                  <Phone aria-hidden="true" strokeWidth={1.5} className="size-16" />
                  Appeler
                </a>
                <a
                  href={`https://wa.me/${waNumber}?text=${waText}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-44 items-center gap-8 rounded-pill border border-line bg-surface px-20 text-body font-medium shadow-sm hover:bg-canvas"
                >
                  <MessageCircle aria-hidden="true" strokeWidth={1.5} className="size-16" />
                  WhatsApp
                </a>
              </div>
              <dl className="mt-12 border-t border-line pt-8">
                <Row label="Ville">{order.city}</Row>
                <Row label="Adresse">{order.address}</Row>
                {order.email ? (
                  <Row label="E-mail">
                    <a href={`mailto:${order.email}`} className="underline-offset-2 hover:underline">
                      {order.email}
                    </a>
                  </Row>
                ) : null}
                <Row label="Langue">{order.locale.toUpperCase()}</Row>
                <Row label="Paiement">À la livraison</Row>
                {order.note ? <Row label="Note du client">{order.note}</Row> : null}
              </dl>
            </Panel>

            <p className="text-body-sm text-muted">
              <Link href={`/${order.locale}/order/${encodeURIComponent(order.number)}?t=${order.accessToken}`} className="underline underline-offset-2">
                Voir la page de confirmation du client
              </Link>
            </p>
          </div>
        </div>
      </div>

      {/* Printable delivery slip: only visible when printing. */}
      <section className="hidden bg-surface p-24 text-ink print:block">
        <div className="flex items-start justify-between gap-16 border-b border-ink pb-12">
          <div>
            <p className="text-title font-semibold">{siteConfig.name}</p>
            <p className="text-body">Bon de livraison</p>
          </div>
          <div className="text-end">
            <p className="text-title font-semibold">{order.number}</p>
            <p className="text-body">{formatDateTime(order.createdAt)}</p>
          </div>
        </div>
        <div className="mt-16">
          <p className="text-body-lg font-semibold">{customer}</p>
          <p dir="ltr" className="text-start text-body-lg">
            {order.phone}
          </p>
          <p className="text-body-lg">{order.address}</p>
          <p className="text-body-lg font-semibold">{order.city}</p>
          {order.note ? <p className="mt-8 text-body">Note : {order.note}</p> : null}
        </div>
        <table className="mt-16 w-full text-start text-body">
          <thead>
            <tr className="border-b border-ink">
              <th className="py-6 text-start font-semibold">Article</th>
              <th className="py-6 text-start font-semibold">SKU</th>
              <th className="py-6 text-start font-semibold">Qté</th>
              <th className="py-6 text-start font-semibold">Total</th>
            </tr>
          </thead>
          <tbody>
            {order.items.map((item) => (
              <tr key={item.id} className="border-b border-line">
                <td className="py-6">
                  {item.productName} ({item.colorName} / {item.sizeLabel})
                </td>
                <td dir="ltr" className="py-6 text-start">
                  {item.sku}
                </td>
                <td className="py-6">{item.quantity}</td>
                <td dir="ltr" className="py-6 text-start">
                  {formatMoney(item.unitPrice * item.quantity)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="mt-16 flex flex-col items-end gap-4 text-body-lg">
          <p>
            Livraison : <span dir="ltr">{order.shippingFee === 0 ? "gratuite" : formatMoney(order.shippingFee)}</span>
          </p>
          <p className="text-title font-semibold">
            À encaisser : <span dir="ltr">{formatMoney(order.total)}</span>
          </p>
          <p className="text-body">Paiement à la livraison (espèces)</p>
        </div>
      </section>
    </>
  );
}
