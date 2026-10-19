"use client";

import {
  AdminForm,
  FormField,
  SubmitButton,
  useFieldError,
} from "@/components/admin/AdminForm";
import { LocaleTabs } from "@/components/admin/LocaleTabs";
import { Input, Select } from "@/components/ui/Input";
import { saveProduct } from "@/lib/actions/admin/products";
import { PRODUCT_STATUS_LABELS } from "@/lib/admin/labels";

export type ProductFormValues = {
  id?: string;
  texts: Record<string, string>; // name_fr, slug_ar, description_en...
  categoryId: string;
  collectionIds: string[];
  price: string; // MAD
  compareAt: string; // MAD
  status: "DRAFT" | "ACTIVE" | "ARCHIVED";
  publishedAt: string; // datetime-local
  isFeatured: boolean;
};

type Props = {
  values: ProductFormValues;
  categories: { id: string; label: string; isActive: boolean }[];
  collections: { id: string; name: string; isActive: boolean }[];
};

function Body({ values, categories, collections }: Props) {
  const categoryError = useFieldError("categoryId");
  const priceError = useFieldError("price");
  const compareError = useFieldError("compareAt");
  const statusError = useFieldError("status");
  const publishedError = useFieldError("publishedAt");

  return (
    <>
      {values.id ? <input type="hidden" name="id" value={values.id} /> : null}

      <LocaleTabs
        initial={values.texts}
        fields={[
          { name: "name", label: "Nom" },
          {
            name: "slug",
            label: "Slug (URL)",
            slugFromName: true,
            help: "Généré depuis le nom ; modifiable. Doit être unique dans la langue.",
          },
          { name: "description", label: "Description", kind: "textarea" },
        ]}
      />

      <div className="grid grid-cols-1 gap-16 md:grid-cols-2">
        <FormField label="Catégorie" name="categoryId">
          <Select id="categoryId" name="categoryId" defaultValue={values.categoryId} aria-invalid={!!categoryError}>
            <option value="">Choisir…</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
                {c.isActive ? "" : " (inactive)"}
              </option>
            ))}
          </Select>
        </FormField>

        <FormField label="Statut" name="status">
          <Select id="status" name="status" defaultValue={values.status} aria-invalid={!!statusError}>
            {(Object.keys(PRODUCT_STATUS_LABELS) as (keyof typeof PRODUCT_STATUS_LABELS)[]).map((s) => (
              <option key={s} value={s}>
                {PRODUCT_STATUS_LABELS[s]}
              </option>
            ))}
          </Select>
        </FormField>

        <FormField label="Prix (MAD)" name="price">
          <Input
            id="price"
            name="price"
            inputMode="decimal"
            defaultValue={values.price}
            placeholder="199"
            aria-invalid={!!priceError}
          />
        </FormField>

        <FormField label="Prix barré (MAD)" name="compareAt" help="Facultatif. Doit être supérieur au prix : le produit apparaît alors dans Soldes.">
          <Input
            id="compareAt"
            name="compareAt"
            inputMode="decimal"
            defaultValue={values.compareAt}
            placeholder="249"
            aria-invalid={!!compareError}
          />
        </FormField>

        <FormField label="Date de publication" name="publishedAt" help="Vide = maintenant à la mise en ligne. Détermine le tri « Nouveautés ».">
          <Input
            id="publishedAt"
            name="publishedAt"
            type="datetime-local"
            defaultValue={values.publishedAt}
            aria-invalid={!!publishedError}
          />
        </FormField>

        <div className="flex items-end pb-6">
          <label className="inline-flex min-h-44 cursor-pointer items-center gap-12 text-body-lg">
            <input type="checkbox" name="isFeatured" defaultChecked={values.isFeatured} className="size-20 accent-accent" />
            Produit mis en avant
          </label>
        </div>
      </div>

      <fieldset>
        <legend className="mb-8 text-body font-medium">Collections</legend>
        {collections.length === 0 ? (
          <p className="text-body text-muted">Aucune collection.</p>
        ) : (
          <div className="flex flex-wrap gap-8">
            {collections.map((c) => (
              <label
                key={c.id}
                className="inline-flex min-h-44 cursor-pointer items-center gap-8 rounded-pill border border-line bg-surface px-16 text-body"
              >
                <input
                  type="checkbox"
                  name="collectionIds"
                  value={c.id}
                  defaultChecked={values.collectionIds.includes(c.id)}
                  className="size-16 accent-accent"
                />
                {c.name}
                {c.isActive ? "" : " (inactive)"}
              </label>
            ))}
          </div>
        )}
      </fieldset>

      <div>
        <SubmitButton variant="accent" pendingLabel="Enregistrement...">
          {values.id ? "Enregistrer le produit" : "Créer le produit"}
        </SubmitButton>
      </div>
    </>
  );
}

export function ProductForm(props: Props) {
  return (
    <AdminForm action={saveProduct}>
      <Body {...props} />
    </AdminForm>
  );
}
