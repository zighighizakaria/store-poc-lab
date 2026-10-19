import { CollectionForm } from "@/components/admin/CollectionForm";
import { LinkButton, PageHeader, Panel } from "@/components/admin/ui";
import { loadProductOptions } from "@/lib/admin/categories";

export const dynamic = "force-dynamic";

export default async function NewCollectionPage() {
  const allProducts = await loadProductOptions();
  return (
    <>
      <PageHeader title="Nouvelle collection" actions={<LinkButton href="/admin/collections">Retour</LinkButton>} />
      <Panel>
        <CollectionForm texts={{}} isActive showOnHome={false} image={null} allProducts={allProducts} selected={[]} />
      </Panel>
    </>
  );
}
