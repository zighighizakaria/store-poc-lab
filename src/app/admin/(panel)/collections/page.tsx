import Image from "next/image";
import Link from "next/link";
import { SubmitButton } from "@/components/admin/AdminForm";
import {
  ActiveBadge,
  EmptyState,
  first,
  LinkButton,
  Notice,
  PageHeader,
  Panel,
  TableWrap,
  tableClass,
  tdClass,
  thClass,
} from "@/components/admin/ui";
import { toggleCollectionActive } from "@/lib/actions/admin/collections";
import { db } from "@/lib/db";
import { getTranslation } from "@/lib/i18n";
import { mediaUrl } from "@/lib/media/url";

export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function CollectionsPage({ searchParams }: Props) {
  const sp = await searchParams;
  const collections = await db.collection.findMany({
    orderBy: [{ position: "asc" }, { createdAt: "asc" }],
    include: { translations: true, mediaAsset: true, _count: { select: { products: true } } },
  });

  return (
    <>
      <PageHeader
        title="Collections"
        description={`${collections.length} collection(s)`}
        actions={<LinkButton href="/admin/collections/new" variant="accent" size="md">Nouvelle collection</LinkButton>}
      />
      <Notice notice={first(sp.notice)} error={first(sp.error)} />
      <Panel>
        {collections.length === 0 ? (
          <EmptyState>Aucune collection.</EmptyState>
        ) : (
          <TableWrap>
            <table className={tableClass}>
              <thead>
                <tr>
                  <th className={thClass}>
                    <span className="sr-only">Image</span>
                  </th>
                  <th className={thClass}>Nom</th>
                  <th className={thClass}>Produits</th>
                  <th className={thClass}>Accueil</th>
                  <th className={thClass}>Statut</th>
                  <th className={thClass}>
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {collections.map((collection) => {
                  const name = getTranslation(collection, "fr").name;
                  return (
                    <tr key={collection.id}>
                      <td className={tdClass}>
                        <div className="relative h-48 w-40 overflow-hidden rounded-lg bg-tile">
                          {collection.mediaAsset ? (
                            <Image src={mediaUrl(collection.mediaAsset.storageKey)} alt="" fill sizes="40px" className="object-cover" />
                          ) : null}
                        </div>
                      </td>
                      <td className={tdClass}>
                        <Link href={`/admin/collections/${collection.id}`} className="font-medium underline-offset-2 hover:underline">
                          {name}
                        </Link>
                      </td>
                      <td className={tdClass}>{collection._count.products}</td>
                      <td className={tdClass}>{collection.showOnHome ? "Oui" : "Non"}</td>
                      <td className={tdClass}>
                        <ActiveBadge active={collection.isActive} />
                      </td>
                      <td className={tdClass}>
                        <form action={toggleCollectionActive}>
                          <input type="hidden" name="id" value={collection.id} />
                          <SubmitButton variant="ghost" size="sm">
                            {collection.isActive ? "Désactiver" : "Activer"}
                          </SubmitButton>
                        </form>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </TableWrap>
        )}
      </Panel>
    </>
  );
}
