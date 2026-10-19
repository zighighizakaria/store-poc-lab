import { AdminForm, ConfirmSubmit, FormField, SubmitButton } from "@/components/admin/AdminForm";
import { first, Notice, PageHeader, Panel } from "@/components/admin/ui";
import { Input } from "@/components/ui/Input";
import { createAdmin, deleteAdmin, resetAdminPassword } from "@/lib/actions/admin/admins";
import { formatDay } from "@/lib/admin/labels";
import { requireAdmin } from "@/lib/admin/session";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function AdminsPage({ searchParams }: Props) {
  const sp = await searchParams;
  const me = await requireAdmin();
  const admins = await db.adminUser.findMany({ orderBy: { createdAt: "asc" } });

  return (
    <>
      <PageHeader title="Administrateurs" description="Tous les administrateurs ont les mêmes droits." />
      <Notice notice={first(sp.notice)} error={first(sp.error)} />

      <Panel title="Ajouter un administrateur" className="mb-16">
        <AdminForm action={createAdmin}>
          <div className="grid grid-cols-1 gap-12 md:grid-cols-3">
            <FormField label="Nom" name="name">
              <Input id="name" name="name" autoComplete="off" />
            </FormField>
            <FormField label="E-mail" name="email">
              <Input id="email" name="email" type="email" autoComplete="off" dir="ltr" />
            </FormField>
            <FormField label="Mot de passe" name="password" help="10 caractères minimum.">
              <Input id="password" name="password" type="password" autoComplete="new-password" />
            </FormField>
          </div>
          <div>
            <SubmitButton variant="accent" pendingLabel="Création...">
              Créer
            </SubmitButton>
          </div>
        </AdminForm>
      </Panel>

      <div className="flex flex-col gap-12">
        {admins.map((admin) => (
          <Panel key={admin.id}>
            <div className="mb-12 flex flex-wrap items-baseline justify-between gap-8">
              <p className="text-body-lg font-semibold">
                {admin.name}
                {admin.id === me.id ? <span className="ms-8 text-body-sm font-normal text-muted">(vous)</span> : null}
              </p>
              <p className="text-body text-muted">
                <span dir="ltr">{admin.email}</span> · créé le {formatDay(admin.createdAt)}
              </p>
            </div>
            <AdminForm action={resetAdminPassword}>
              <input type="hidden" name="id" value={admin.id} />
              <div className="grid grid-cols-1 items-end gap-12 sm:grid-cols-[1fr_auto]">
                <FormField label="Nouveau mot de passe" name="password" help="10 caractères minimum.">
                  <Input id={`pw-${admin.id}`} name="password" type="password" autoComplete="new-password" />
                </FormField>
                <SubmitButton size="md" variant="secondary" pendingLabel="...">
                  Réinitialiser
                </SubmitButton>
              </div>
            </AdminForm>
            {admin.id === me.id ? null : (
              <form action={deleteAdmin} className="mt-8">
                <input type="hidden" name="id" value={admin.id} />
                <ConfirmSubmit variant="ghost" size="sm" message={`Supprimer l'administrateur ${admin.email} ?`}>
                  Supprimer
                </ConfirmSubmit>
              </form>
            )}
          </Panel>
        ))}
      </div>
    </>
  );
}
