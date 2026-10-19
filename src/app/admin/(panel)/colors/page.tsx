import { AdminForm, ConfirmSubmit, FormField, SubmitButton } from "@/components/admin/AdminForm";
import { first, Notice, PageHeader, Panel } from "@/components/admin/ui";
import { Input } from "@/components/ui/Input";
import { deleteColor, saveColor } from "@/lib/actions/admin/colors";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

function ColorFields({
  prefix,
  values,
}: {
  prefix: string;
  values: { hex: string; fr: string; ar: string; en: string };
}) {
  return (
    <div className="grid grid-cols-2 gap-12 md:grid-cols-[80px_1fr_1fr_1fr]">
      <FormField label="Couleur" name="hex">
        <input
          id={`${prefix}-hex`}
          name="hex"
          type="color"
          defaultValue={values.hex}
          className="h-44 w-full cursor-pointer rounded-pill border border-input-border bg-surface p-4"
        />
      </FormField>
      <FormField label="Nom (FR)" name="name_fr">
        <Input id={`${prefix}-fr`} name="name_fr" defaultValue={values.fr} />
      </FormField>
      <FormField label="Nom (AR)" name="name_ar">
        <Input id={`${prefix}-ar`} name="name_ar" defaultValue={values.ar} dir="rtl" lang="ar" />
      </FormField>
      <FormField label="Nom (EN)" name="name_en">
        <Input id={`${prefix}-en`} name="name_en" defaultValue={values.en} />
      </FormField>
    </div>
  );
}

export default async function ColorsPage({ searchParams }: Props) {
  const sp = await searchParams;
  const colors = await db.color.findMany({
    orderBy: { createdAt: "asc" },
    include: { translations: true, _count: { select: { variants: true } } },
  });

  return (
    <>
      <PageHeader title="Couleurs" description="Partagées par tous les produits. Le nom français est obligatoire." />
      <Notice notice={first(sp.notice)} error={first(sp.error)} />

      <Panel title="Ajouter une couleur" className="mb-16">
        <AdminForm action={saveColor}>
          <ColorFields prefix="new" values={{ hex: "#111111", fr: "", ar: "", en: "" }} />
          <div>
            <SubmitButton variant="accent" pendingLabel="Ajout...">
              Ajouter
            </SubmitButton>
          </div>
        </AdminForm>
      </Panel>

      <div className="flex flex-col gap-12">
        {colors.map((color) => {
          const name = (locale: "fr" | "ar" | "en") => color.translations.find((t) => t.locale === locale)?.name ?? "";
          return (
            <Panel key={color.id}>
              <AdminForm action={saveColor}>
                <input type="hidden" name="id" value={color.id} />
                <ColorFields
                  prefix={color.id}
                  values={{ hex: color.hex, fr: name("fr"), ar: name("ar"), en: name("en") }}
                />
                <div className="flex flex-wrap items-center gap-8">
                  <SubmitButton size="sm" pendingLabel="Enregistrement...">
                    Enregistrer
                  </SubmitButton>
                  <span className="text-body-sm text-muted">{color._count.variants} variante(s)</span>
                </div>
              </AdminForm>
              <form action={deleteColor} className="mt-8">
                <input type="hidden" name="id" value={color.id} />
                <ConfirmSubmit variant="ghost" size="sm" message="Supprimer cette couleur ?">
                  Supprimer
                </ConfirmSubmit>
              </form>
            </Panel>
          );
        })}
      </div>
    </>
  );
}
