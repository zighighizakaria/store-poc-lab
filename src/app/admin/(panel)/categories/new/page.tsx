import { CategoryForm } from "@/components/admin/CategoryForm";
import { LinkButton, PageHeader, Panel } from "@/components/admin/ui";
import { loadCategoryOptions, loadSizeGuideOptions } from "@/lib/admin/categories";

export const dynamic = "force-dynamic";

export default async function NewCategoryPage({
  searchParams,
}: {
  searchParams: Promise<{ parentId?: string }>;
}) {
  const { parentId } = await searchParams;
  const [options, sizeGuides] = await Promise.all([loadCategoryOptions(), loadSizeGuideOptions()]);
  return (
    <>
      <PageHeader title="Nouvelle catégorie" actions={<LinkButton href="/admin/categories">Retour</LinkButton>} />
      <Panel>
        <CategoryForm
          texts={{}}
          parentId={options.some((o) => o.id === parentId) ? (parentId as string) : ""}
          sizeGuideId=""
          isActive
          image={null}
          parents={options}
          sizeGuides={sizeGuides}
        />
      </Panel>
    </>
  );
}
