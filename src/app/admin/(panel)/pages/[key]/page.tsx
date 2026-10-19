import { notFound } from "next/navigation";
import { AdminForm, SubmitButton } from "@/components/admin/AdminForm";
import { LocaleTabs } from "@/components/admin/LocaleTabs";
import { LinkButton, PageHeader, Panel } from "@/components/admin/ui";
import { savePage } from "@/lib/actions/admin/pages";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function EditPagePage({ params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;
  const page = await db.page.findUnique({ where: { key }, include: { translations: true } });
  if (!page) notFound();

  const texts: Record<string, string> = {};
  for (const t of page.translations) {
    texts[`title_${t.locale}`] = t.title;
    texts[`body_${t.locale}`] = t.body;
  }

  return (
    <>
      <PageHeader
        title={`Page « ${page.key} »`}
        description="Texte simple : une ligne vide sépare les paragraphes."
        actions={<LinkButton href="/admin/pages">Retour</LinkButton>}
      />
      <Panel>
        <AdminForm action={savePage}>
          <input type="hidden" name="key" value={page.key} />
          <LocaleTabs
            initial={texts}
            mainField="title"
            fields={[
              { name: "title", label: "Titre" },
              { name: "body", label: "Texte", kind: "textarea", rows: 14 },
            ]}
          />
          <div>
            <SubmitButton variant="accent" pendingLabel="Enregistrement...">
              Enregistrer
            </SubmitButton>
          </div>
        </AdminForm>
      </Panel>
    </>
  );
}
