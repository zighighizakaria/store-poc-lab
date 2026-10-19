"use client";

import { AdminForm, FormField, SubmitButton } from "@/components/admin/AdminForm";
import { LocaleTabs } from "@/components/admin/LocaleTabs";
import { MediaField } from "@/components/admin/MediaField";
import { Select } from "@/components/ui/Input";
import { saveCategory } from "@/lib/actions/admin/categories";

type Props = {
  id?: string;
  texts: Record<string, string>;
  parentId: string;
  sizeGuideId: string;
  isActive: boolean;
  image: { id: string; url: string } | null;
  /** Possible parents (own subtree already removed). */
  parents: { id: string; label: string }[];
  sizeGuides: { id: string; label: string }[];
};

export function CategoryForm({ id, texts, parentId, sizeGuideId, isActive, image, parents, sizeGuides }: Props) {
  return (
    <AdminForm action={saveCategory}>
      {id ? <input type="hidden" name="id" value={id} /> : null}
      <LocaleTabs
        initial={texts}
        fields={[
          { name: "name", label: "Nom" },
          { name: "slug", label: "Slug (URL)", slugFromName: true, help: "Unique dans la langue." },
          { name: "description", label: "Description", kind: "textarea", rows: 3 },
        ]}
      />
      <div className="grid grid-cols-1 gap-16 md:grid-cols-2">
        <FormField label="Catégorie parente" name="parentId">
          <Select id="parentId" name="parentId" defaultValue={parentId}>
            <option value="">Aucune (niveau principal)</option>
            {parents.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </Select>
        </FormField>
        <FormField label="Guide des tailles" name="sizeGuideId">
          <Select id="sizeGuideId" name="sizeGuideId" defaultValue={sizeGuideId}>
            <option value="">Aucun</option>
            {sizeGuides.map((g) => (
              <option key={g.id} value={g.id}>
                {g.label}
              </option>
            ))}
          </Select>
        </FormField>
      </div>
      <MediaField name="mediaAssetId" label="Image" value={image} />
      <label className="inline-flex min-h-44 cursor-pointer items-center gap-12 text-body-lg">
        <input type="checkbox" name="isActive" defaultChecked={isActive} className="size-20 accent-accent" />
        Catégorie active (visible dans la boutique)
      </label>
      <div>
        <SubmitButton variant="accent" pendingLabel="Enregistrement...">
          {id ? "Enregistrer" : "Créer la catégorie"}
        </SubmitButton>
      </div>
    </AdminForm>
  );
}
