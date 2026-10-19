import { AdminForm, FormField, SubmitButton } from "@/components/admin/AdminForm";
import { PageHeader, Panel } from "@/components/admin/ui";
import { Input } from "@/components/ui/Input";
import { saveSettings } from "@/lib/actions/admin/settings";
import { madInput } from "@/lib/admin/form";
import { db } from "@/lib/db";
import { siteConfig } from "../../../../../site.config";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const row = await db.settings.findUnique({ where: { id: "singleton" } });
  return (
    <>
      <PageHeader title="Réglages" />
      <Panel>
        <AdminForm action={saveSettings} className="max-w-narrow">
          <div className="grid grid-cols-1 gap-16 md:grid-cols-2">
            <FormField
              label="Frais de livraison (MAD)"
              name="shippingFee"
              help="Frais forfaitaires, sauf ville avec frais spécifiques."
            >
              <Input
                id="shippingFee"
                name="shippingFee"
                inputMode="decimal"
                defaultValue={madInput(row?.shippingFee ?? 3000)}
                dir="ltr"
              />
            </FormField>
            <FormField
              label="Livraison gratuite à partir de (MAD)"
              name="freeShippingThreshold"
              help="Sous-total à atteindre. Affiché dans la barre du panier."
            >
              <Input
                id="freeShippingThreshold"
                name="freeShippingThreshold"
                inputMode="decimal"
                defaultValue={madInput(row?.freeShippingThreshold ?? 49900)}
                dir="ltr"
              />
            </FormField>
            <FormField
              label="Numéro WhatsApp"
              name="whatsappNumber"
              help="Format international, chiffres seulement (ex. 212600000000)."
            >
              <Input
                id="whatsappNumber"
                name="whatsappNumber"
                inputMode="numeric"
                defaultValue={row?.whatsappNumber ?? siteConfig.whatsapp.number}
                dir="ltr"
              />
            </FormField>
            <FormField label="E-mail de notification des commandes" name="adminNotifyEmail">
              <Input
                id="adminNotifyEmail"
                name="adminNotifyEmail"
                type="email"
                defaultValue={row?.adminNotifyEmail ?? ""}
                dir="ltr"
              />
            </FormField>
            <FormField
              label="Seuil de stock faible"
              name="lowStockThreshold"
              help="Une variante est « faible » à ce stock ou en dessous."
            >
              <Input
                id="lowStockThreshold"
                name="lowStockThreshold"
                type="number"
                min={0}
                defaultValue={row?.lowStockThreshold ?? 3}
                dir="ltr"
              />
            </FormField>
          </div>
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
