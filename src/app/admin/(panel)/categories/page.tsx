import Link from "next/link";
import { ArrowDown, ArrowUp } from "lucide-react";
import { SubmitButton } from "@/components/admin/AdminForm";
import { ActiveBadge, first, LinkButton, Notice, PageHeader, Panel } from "@/components/admin/ui";
import { Select } from "@/components/ui/Input";
import { moveCategory, reparentCategory, toggleCategoryActive } from "@/lib/actions/admin/categories";
import { loadCategoryOptions } from "@/lib/admin/categories";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

const iconButton =
  "inline-flex size-40 items-center justify-center rounded-pill border border-line bg-surface shadow-sm hover:bg-canvas disabled:cursor-not-allowed disabled:text-muted";

export default async function CategoriesPage({ searchParams }: Props) {
  const sp = await searchParams;
  const [options, counts] = await Promise.all([
    loadCategoryOptions(),
    db.product.groupBy({ by: ["categoryId"], _count: { _all: true } }),
  ]);
  const productCount = new Map(counts.map((c) => [c.categoryId, c._count._all]));

  // Position among siblings (for disabling the first "up" / last "down").
  const siblingsOf = (parentId: string | null) => options.filter((o) => o.parentId === parentId);

  return (
    <>
      <PageHeader
        title="Catégories"
        description="Arbre des types de produits. Monter / descendre change l'ordre dans le même niveau ; « Déplacer » change le parent."
        actions={<LinkButton href="/admin/categories/new" variant="accent" size="md">Nouvelle catégorie</LinkButton>}
      />
      <Notice notice={first(sp.notice)} error={first(sp.error)} />

      <Panel>
        <ul className="flex flex-col">
          {options.map((option) => {
            const siblings = siblingsOf(option.parentId);
            const index = siblings.findIndex((s) => s.id === option.id);
            const parents = options.filter((o) => !option.subtreeIds.includes(o.id));
            return (
              <li key={option.id} className="border-b border-line py-12 last:border-b-0">
                <div className="flex flex-wrap items-center gap-12" style={{ paddingInlineStart: option.depth * 24 }}>
                  <div className="min-w-0 flex-1 basis-[200px]">
                    <Link href={`/admin/categories/${option.id}`} className="font-medium underline-offset-2 hover:underline">
                      {option.name}
                    </Link>
                    <span className="ms-8 text-body-sm text-muted">{productCount.get(option.id) ?? 0} produit(s)</span>
                  </div>
                  <ActiveBadge active={option.isActive} />

                  <div className="flex items-center gap-4">
                    <form action={moveCategory}>
                      <input type="hidden" name="id" value={option.id} />
                      <input type="hidden" name="direction" value="up" />
                      <button type="submit" className={iconButton} aria-label={`Monter ${option.name}`} disabled={index === 0}>
                        <ArrowUp aria-hidden="true" strokeWidth={1.5} className="size-16" />
                      </button>
                    </form>
                    <form action={moveCategory}>
                      <input type="hidden" name="id" value={option.id} />
                      <input type="hidden" name="direction" value="down" />
                      <button
                        type="submit"
                        className={iconButton}
                        aria-label={`Descendre ${option.name}`}
                        disabled={index === siblings.length - 1}
                      >
                        <ArrowDown aria-hidden="true" strokeWidth={1.5} className="size-16" />
                      </button>
                    </form>
                  </div>

                  <form action={reparentCategory} className="flex items-center gap-8">
                    <input type="hidden" name="id" value={option.id} />
                    <Select
                      name="parentId"
                      defaultValue={option.parentId ?? ""}
                      aria-label={`Parent de ${option.name}`}
                      className="min-h-40 max-w-[220px] text-body"
                    >
                      <option value="">Niveau principal</option>
                      {parents.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.label}
                        </option>
                      ))}
                    </Select>
                    <SubmitButton variant="secondary" size="sm">
                      Déplacer
                    </SubmitButton>
                  </form>

                  <form action={toggleCategoryActive}>
                    <input type="hidden" name="id" value={option.id} />
                    <SubmitButton variant="ghost" size="sm">
                      {option.isActive ? "Désactiver" : "Activer"}
                    </SubmitButton>
                  </form>
                </div>
              </li>
            );
          })}
        </ul>
      </Panel>
    </>
  );
}
