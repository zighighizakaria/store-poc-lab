import { notFound } from "next/navigation";
import { CategoryForm } from "@/components/admin/CategoryForm";
import { ConfirmSubmit } from "@/components/admin/AdminForm";
import { first, LinkButton, Notice, PageHeader, Panel } from "@/components/admin/ui";
import { deleteCategory } from "@/lib/actions/admin/categories";
import { loadCategoryOptions, loadSizeGuideOptions } from "@/lib/admin/categories";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function EditCategoryPage({ params, searchParams }: Props) {
  const { id } = await params;
  const sp = await searchParams;
  const category = await db.category.findUnique({ where: { id }, include: { translations: true } });
  if (!category) notFound();

  const [options, sizeGuides] = await Promise.all([loadCategoryOptions(), loadSizeGuideOptions()]);
  const self = options.find((o) => o.id === id);
  const texts: Record<string, string> = {};
  for (const t of category.translations) {
    texts[`name_${t.locale}`] = t.name;
    texts[`slug_${t.locale}`] = t.slug;
    texts[`description_${t.locale}`] = t.description ?? "";
  }

  return (
    <>
      <PageHeader title={self?.label ?? "Catégorie"} actions={<LinkButton href="/admin/categories">Retour</LinkButton>} />
      <Notice notice={first(sp.notice)} error={first(sp.error)} />
      <div className="flex flex-col gap-16">
        <Panel>
          <CategoryForm
            id={category.id}
            texts={texts}
            parentId={category.parentId ?? ""}
            sizeGuideId={category.sizeGuideId ?? ""}
            isActive={category.isActive}
            image={category.image}
            parents={options.filter((o) => !self?.subtreeIds.includes(o.id))}
            sizeGuides={sizeGuides}
          />
        </Panel>
        <Panel title="Zone sensible">
          <p className="mb-12 text-body text-muted">
            Une catégorie qui contient des produits ou des sous-catégories est désactivée au lieu d&apos;être supprimée.
          </p>
          <form action={deleteCategory}>
            <input type="hidden" name="id" value={category.id} />
            <ConfirmSubmit variant="secondary" message="Supprimer cette catégorie ? (désactivée si elle est utilisée)">
              Supprimer la catégorie
            </ConfirmSubmit>
          </form>
        </Panel>
      </div>
    </>
  );
}
