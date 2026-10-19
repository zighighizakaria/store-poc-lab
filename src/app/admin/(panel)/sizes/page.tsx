import type { SizeGroup } from "@prisma/client";
import { AdminForm, ConfirmSubmit, FormField, SubmitButton } from "@/components/admin/AdminForm";
import { first, Notice, PageHeader, Panel } from "@/components/admin/ui";
import { Input, Select } from "@/components/ui/Input";
import { deleteSize, saveSize } from "@/lib/actions/admin/sizes";
import { SIZE_GROUP_LABELS, SIZE_GROUPS } from "@/lib/admin/labels";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

function SizeFields({
  prefix,
  values,
}: {
  prefix: string;
  values: { label: string; group: SizeGroup; position: number };
}) {
  return (
    <div className="grid grid-cols-1 gap-12 sm:grid-cols-3">
      <FormField label="Libellé (jamais traduit)" name="label">
        <Input id={`${prefix}-label`} name="label" defaultValue={values.label} maxLength={12} />
      </FormField>
      <FormField label="Groupe" name="group">
        <Select id={`${prefix}-group`} name="group" defaultValue={values.group}>
          {SIZE_GROUPS.map((g) => (
            <option key={g} value={g}>
              {SIZE_GROUP_LABELS[g]}
            </option>
          ))}
        </Select>
      </FormField>
      <FormField label="Position" name="position">
        <Input id={`${prefix}-position`} name="position" type="number" min={0} defaultValue={values.position} dir="ltr" />
      </FormField>
    </div>
  );
}

export default async function SizesPage({ searchParams }: Props) {
  const sp = await searchParams;
  const sizes = await db.size.findMany({
    orderBy: [{ group: "asc" }, { position: "asc" }],
    include: { _count: { select: { variants: true } } },
  });

  return (
    <>
      <PageHeader title="Tailles" description="La position règle l'ordre d'affichage dans chaque groupe." />
      <Notice notice={first(sp.notice)} error={first(sp.error)} />

      <Panel title="Ajouter une taille" className="mb-16">
        <AdminForm action={saveSize}>
          <SizeFields prefix="new" values={{ label: "", group: "TOP", position: 0 }} />
          <div>
            <SubmitButton variant="accent" pendingLabel="Ajout...">
              Ajouter
            </SubmitButton>
          </div>
        </AdminForm>
      </Panel>

      {SIZE_GROUPS.map((group) => {
        const list = sizes.filter((s) => s.group === group);
        if (list.length === 0) return null;
        return (
          <section key={group} className="mb-16">
            <h2 className="mb-8 text-body-lg font-semibold">{SIZE_GROUP_LABELS[group]}</h2>
            <div className="flex flex-col gap-8">
              {list.map((size) => (
                <Panel key={size.id}>
                  <AdminForm action={saveSize}>
                    <input type="hidden" name="id" value={size.id} />
                    <SizeFields prefix={size.id} values={size} />
                    <div className="flex flex-wrap items-center gap-8">
                      <SubmitButton size="sm" pendingLabel="Enregistrement...">
                        Enregistrer
                      </SubmitButton>
                      <span className="text-body-sm text-muted">{size._count.variants} variante(s)</span>
                    </div>
                  </AdminForm>
                  <form action={deleteSize} className="mt-8">
                    <input type="hidden" name="id" value={size.id} />
                    <ConfirmSubmit variant="ghost" size="sm" message="Supprimer cette taille ?">
                      Supprimer
                    </ConfirmSubmit>
                  </form>
                </Panel>
              ))}
            </div>
          </section>
        );
      })}
    </>
  );
}
