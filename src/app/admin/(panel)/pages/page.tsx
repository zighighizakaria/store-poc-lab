import Link from "next/link";
import { PageHeader, Panel, TableWrap, tableClass, tdClass, thClass } from "@/components/admin/ui";
import { db } from "@/lib/db";
import { getTranslation } from "@/lib/i18n";

export const dynamic = "force-dynamic";

export default async function PagesPage() {
  const pages = await db.page.findMany({ orderBy: { key: "asc" }, include: { translations: true } });
  return (
    <>
      <PageHeader title="Pages" description="À propos et pages d'information (livraison, retours, conditions…)." />
      <Panel>
        <TableWrap>
          <table className={tableClass}>
            <thead>
              <tr>
                <th className={thClass}>Page</th>
                <th className={thClass}>Titre (FR)</th>
                <th className={thClass}>Langues</th>
              </tr>
            </thead>
            <tbody>
              {pages.map((page) => (
                <tr key={page.id}>
                  <td className={tdClass}>
                    <Link href={`/admin/pages/${page.key}`} className="font-medium underline-offset-2 hover:underline">
                      {page.key}
                    </Link>
                  </td>
                  <td className={tdClass}>{getTranslation(page, "fr").title}</td>
                  <td className={tdClass}>{page.translations.map((t) => t.locale.toUpperCase()).join(" · ")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableWrap>
      </Panel>
    </>
  );
}
