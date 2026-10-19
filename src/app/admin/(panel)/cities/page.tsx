import { AdminForm, FormField, SubmitButton } from "@/components/admin/AdminForm";
import { PageHeader, Panel } from "@/components/admin/ui";
import { Input } from "@/components/ui/Input";
import { saveCity } from "@/lib/actions/admin/cities";
import { madInput } from "@/lib/admin/form";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function CitiesPage() {
  const cities = await db.city.findMany({ orderBy: { nameFr: "asc" } });
  return (
    <>
      <PageHeader
        title="Villes de livraison"
        description="Une ville inactive n'est plus proposée au paiement. Frais vides = frais standard des réglages."
      />
      <div className="grid grid-cols-1 gap-12 lg:grid-cols-2">
        {cities.map((city) => (
          <Panel key={city.id}>
            <AdminForm action={saveCity}>
              <input type="hidden" name="id" value={city.id} />
              <div className="flex items-baseline justify-between gap-8">
                <p className="text-body-lg font-semibold">{city.nameFr}</p>
                <p dir="rtl" lang="ar" className="text-body text-muted">
                  {city.nameAr}
                </p>
              </div>
              <div className="grid grid-cols-1 items-end gap-12 sm:grid-cols-[1fr_auto]">
                <FormField label="Frais spécifiques (MAD)" name="shippingFee">
                  <Input
                    id={`fee-${city.id}`}
                    name="shippingFee"
                    inputMode="decimal"
                    defaultValue={madInput(city.shippingFee)}
                    placeholder="Frais standard"
                    dir="ltr"
                  />
                </FormField>
                <label className="inline-flex min-h-44 cursor-pointer items-center gap-8 text-body-lg">
                  <input type="checkbox" name="isActive" defaultChecked={city.isActive} className="size-20 accent-accent" />
                  Active
                </label>
              </div>
              <div>
                <SubmitButton size="sm" pendingLabel="Enregistrement...">
                  Enregistrer
                </SubmitButton>
              </div>
            </AdminForm>
          </Panel>
        ))}
      </div>
    </>
  );
}
