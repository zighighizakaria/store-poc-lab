import { EmptyState, first, PageHeader, Pager, pageOf, Panel, TableWrap, tableClass, tdClass, thClass } from "@/components/admin/ui";
import { formatDateTime } from "@/lib/admin/labels";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 50;

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function NewsletterPage({ searchParams }: Props) {
  const sp = await searchParams;
  const page = pageOf(first(sp.page));
  const [total, subscribers] = await Promise.all([
    db.newsletterSubscriber.count(),
    db.newsletterSubscriber.findMany({
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
  ]);
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <>
      <PageHeader
        title="Newsletter"
        description={`${total} inscrit(s)`}
        actions={
          // Plain anchor: a file download, not a page navigation.
          // eslint-disable-next-line @next/next/no-html-link-for-pages
          <a
            href="/admin/newsletter/export"
            className="inline-flex min-h-44 items-center justify-center rounded-pill bg-ink px-20 text-body font-medium text-on-ink hover:bg-slate-ink"
          >
            Exporter en CSV
          </a>
        }
      />
      <Panel>
        {subscribers.length === 0 ? (
          <EmptyState>Aucun inscrit pour l&apos;instant.</EmptyState>
        ) : (
          <TableWrap>
            <table className={tableClass}>
              <thead>
                <tr>
                  <th className={thClass}>E-mail</th>
                  <th className={thClass}>Langue</th>
                  <th className={thClass}>Inscription</th>
                </tr>
              </thead>
              <tbody>
                {subscribers.map((s) => (
                  <tr key={s.id}>
                    <td className={tdClass}>
                      <span dir="ltr">{s.email}</span>
                    </td>
                    <td className={tdClass}>{s.locale.toUpperCase()}</td>
                    <td className={tdClass}>{formatDateTime(s.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableWrap>
        )}
        <Pager page={page} pageCount={pageCount} basePath="/admin/newsletter" params={{}} />
      </Panel>
    </>
  );
}
