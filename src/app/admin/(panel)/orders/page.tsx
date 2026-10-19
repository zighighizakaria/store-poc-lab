import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { SubmitButton } from "@/components/admin/AdminForm";
import {
  EmptyState,
  first,
  LinkButton,
  OrderStatusBadge,
  PageHeader,
  Pager,
  pageOf,
  Panel,
  TableWrap,
  tableClass,
  tdClass,
  thClass,
} from "@/components/admin/ui";
import { Input, Select } from "@/components/ui/Input";
import { cn } from "@/lib/cn";
import { db } from "@/lib/db";
import { formatDateTime, ORDER_STATUS_LABELS, ORDER_STATUSES } from "@/lib/admin/labels";
import { formatMoney } from "@/lib/money";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 25;
const DAY_REGEX = /^\d{4}-\d{2}-\d{2}$/;

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

function dayStart(value: string | undefined): Date | null {
  if (!value || !DAY_REGEX.test(value)) return null;
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

export default async function OrdersPage({ searchParams }: Props) {
  const sp = await searchParams;
  const status = first(sp.status);
  const city = first(sp.city)?.trim() || undefined;
  const q = first(sp.q)?.trim() || undefined;
  const from = first(sp.from);
  const to = first(sp.to);
  const page = pageOf(first(sp.page));

  const where: Prisma.OrderWhereInput = {};
  if (status && (ORDER_STATUSES as string[]).includes(status)) {
    where.status = status as (typeof ORDER_STATUSES)[number];
  }
  if (city) where.city = city;
  const fromDate = dayStart(from);
  const toDate = dayStart(to);
  if (fromDate || toDate) {
    where.createdAt = {
      ...(fromDate ? { gte: fromDate } : {}),
      ...(toDate ? { lt: new Date(toDate.getTime() + 24 * 60 * 60 * 1000) } : {}),
    };
  }
  if (q) {
    // Phones are stored as +212XXXXXXXXX: match on the national digits.
    const digits = q.replace(/\D/g, "").replace(/^(?:00)?(?:212|0)/, "");
    where.OR = [
      { number: { contains: q, mode: "insensitive" } },
      { firstName: { contains: q, mode: "insensitive" } },
      { lastName: { contains: q, mode: "insensitive" } },
      ...(digits.length >= 3 ? [{ phone: { contains: digits } }] : []),
    ];
  }

  const [total, orders, cities] = await Promise.all([
    db.order.count({ where }),
    db.order.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    db.city.findMany({ orderBy: { nameFr: "asc" }, select: { nameFr: true } }),
  ]);
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const hasFilters = !!(status || city || q || from || to);

  return (
    <>
      <PageHeader title="Commandes" description={`${total} commande(s)`} />

      <Panel className="mb-16">
        <form method="get" className="grid grid-cols-1 gap-12 sm:grid-cols-2 lg:grid-cols-6">
          <Input name="q" defaultValue={q} placeholder="N° ou téléphone" aria-label="Recherche" className="lg:col-span-2" />
          <Select name="status" defaultValue={status ?? ""} aria-label="Statut">
            <option value="">Tous les statuts</option>
            {ORDER_STATUSES.map((s) => (
              <option key={s} value={s}>
                {ORDER_STATUS_LABELS[s]}
              </option>
            ))}
          </Select>
          <Select name="city" defaultValue={city ?? ""} aria-label="Ville">
            <option value="">Toutes les villes</option>
            {cities.map((c) => (
              <option key={c.nameFr} value={c.nameFr}>
                {c.nameFr}
              </option>
            ))}
          </Select>
          <Input name="from" type="date" defaultValue={from} aria-label="Du" />
          <Input name="to" type="date" defaultValue={to} aria-label="Au" />
          <div className="flex gap-8 sm:col-span-2 lg:col-span-6">
            <SubmitButton size="sm">Filtrer</SubmitButton>
            {hasFilters ? <LinkButton href="/admin/orders">Réinitialiser</LinkButton> : null}
          </div>
        </form>
      </Panel>

      <Panel>
        {orders.length === 0 ? (
          <EmptyState>Aucune commande ne correspond.</EmptyState>
        ) : (
          <>
            {/* Phone: one card per order */}
            <ul className="flex flex-col gap-8 md:hidden">
              {orders.map((order) => (
                <li key={order.id}>
                  <Link
                    href={`/admin/orders/${order.id}`}
                    className={cn(
                      "block rounded-image border border-line p-12",
                      order.status === "NEW" && "bg-info-wash",
                    )}
                  >
                    <div className="flex items-center justify-between gap-8">
                      <span className="text-body-lg font-semibold">{order.number}</span>
                      <OrderStatusBadge status={order.status} />
                    </div>
                    <div className="mt-6 text-body">
                      {order.firstName} {order.lastName} · {order.city}
                    </div>
                    <div className="mt-4 flex items-center justify-between gap-8 text-body-sm text-muted">
                      <span dir="ltr">{order.phone}</span>
                      <span dir="ltr" className="font-semibold text-ink">
                        {formatMoney(order.total)}
                      </span>
                    </div>
                    <div className="mt-4 text-body-sm text-muted">{formatDateTime(order.createdAt)}</div>
                  </Link>
                </li>
              ))}
            </ul>

            <div className="hidden md:block">
              <TableWrap>
                <table className={tableClass}>
                  <thead>
                    <tr>
                      <th className={thClass}>N°</th>
                      <th className={thClass}>Date</th>
                      <th className={thClass}>Client</th>
                      <th className={thClass}>Téléphone</th>
                      <th className={thClass}>Ville</th>
                      <th className={thClass}>Total</th>
                      <th className={thClass}>Statut</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map((order) => (
                      <tr key={order.id} className={order.status === "NEW" ? "bg-info-wash" : undefined}>
                        <td className={tdClass}>
                          <Link href={`/admin/orders/${order.id}`} className="font-semibold underline-offset-2 hover:underline">
                            {order.number}
                          </Link>
                        </td>
                        <td className={cn(tdClass, "whitespace-nowrap")}>{formatDateTime(order.createdAt)}</td>
                        <td className={tdClass}>
                          {order.firstName} {order.lastName}
                        </td>
                        <td className={tdClass}>
                          <a href={`tel:${order.phone}`} dir="ltr" className="whitespace-nowrap underline-offset-2 hover:underline">
                            {order.phone}
                          </a>
                        </td>
                        <td className={tdClass}>{order.city}</td>
                        <td className={cn(tdClass, "whitespace-nowrap")}>
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
            </div>
          </>
        )}
        <Pager
          page={page}
          pageCount={pageCount}
          basePath="/admin/orders"
          params={{ q, status, city, from, to }}
        />
      </Panel>
    </>
  );
}
