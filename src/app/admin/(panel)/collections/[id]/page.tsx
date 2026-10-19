import { notFound } from "next/navigation";
import { CollectionForm } from "@/components/admin/CollectionForm";
import { ConfirmSubmit } from "@/components/admin/AdminForm";
import { first, LinkButton, Notice, PageHeader, Panel } from "@/components/admin/ui";
import { deleteCollection } from "@/lib/actions/admin/collections";
import { loadProductOptions } from "@/lib/admin/categories";
import { db } from "@/lib/db";
import { getTranslation } from "@/lib/i18n";
import { mediaValue } from "@/lib/media/url";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function EditCollectionPage({ params, searchParams }: Props) {
  const { id } = await params;
  const sp = await searchParams;
  const collection = await db.collection.findUnique({
    where: { id },
    include: {
      translations: true,
      mediaAsset: true,
      products: { orderBy: { position: "asc" }, select: { productId: true } },
    },
  });
  if (!collection) notFound();

  const allProducts = await loadProductOptions();
  // Archived products already in the collection must stay listed so saving does not drop them silently.
  const known = new Set(allProducts.map((p) => p.id));
  const missing = collection.products.map((p) => p.productId).filter((pid) => !known.has(pid));
  if (missing.length > 0) {
    const extra = await db.product.findMany({ where: { id: { in: missing } }, include: { translations: true } });
    for (const p of extra) allProducts.push({ id: p.id, name: `${getTranslation(p, "fr").name} (archivé)` });
  }

  const texts: Record<string, string> = {};
  for (const t of collection.translations) {
    texts[`name_${t.locale}`] = t.name;
    texts[`slug_${t.locale}`] = t.slug;
    texts[`description_${t.locale}`] = t.description ?? "";
  }

  return (
    <>
      <PageHeader
        title={getTranslation(collection, "fr").name}
        actions={<LinkButton href="/admin/collections">Retour</LinkButton>}
      />
      <Notice notice={first(sp.notice)} error={first(sp.error)} />
      <div className="flex flex-col gap-16">
        <Panel>
          <CollectionForm
            id={collection.id}
            texts={texts}
            isActive={collection.isActive}
            showOnHome={collection.showOnHome}
            image={mediaValue(collection.mediaAsset)}
            allProducts={allProducts}
            selected={collection.products.map((p) => p.productId)}
          />
        </Panel>
        <Panel title="Zone sensible">
          <p className="mb-12 text-body text-muted">
            Une collection qui contient encore des produits est désactivée au lieu d&apos;être supprimée.
          </p>
          <form action={deleteCollection}>
            <input type="hidden" name="id" value={collection.id} />
            <ConfirmSubmit variant="secondary" message="Supprimer cette collection ? (désactivée si elle contient des produits)">
              Supprimer la collection
            </ConfirmSubmit>
          </form>
        </Panel>
      </div>
    </>
  );
}
