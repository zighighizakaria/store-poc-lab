import { ProductForm } from "@/components/admin/ProductForm";
import { LinkButton, PageHeader, Panel } from "@/components/admin/ui";
import { loadCategoryOptions, loadCollectionOptions } from "@/lib/admin/categories";

export const dynamic = "force-dynamic";

export default async function NewProductPage() {
  const [categories, collections] = await Promise.all([loadCategoryOptions(), loadCollectionOptions()]);
  return (
    <>
      <PageHeader
        title="Nouveau produit"
        description="Les images et les variantes s'ajoutent après la création."
        actions={<LinkButton href="/admin/products">Retour</LinkButton>}
      />
      <Panel>
        <ProductForm
          categories={categories}
          collections={collections}
          values={{
            texts: {},
            categoryId: "",
            collectionIds: [],
            price: "",
            compareAt: "",
            status: "DRAFT",
            publishedAt: "",
            isFeatured: false,
          }}
        />
      </Panel>
    </>
  );
}
