"use client";

import { AdminForm, FormField, SubmitButton } from "@/components/admin/AdminForm";
import { LocaleTabs } from "@/components/admin/LocaleTabs";
import { MediaField } from "@/components/admin/MediaField";
import { Input } from "@/components/ui/Input";
import { saveBanner } from "@/lib/actions/admin/banners";

type MediaValue = { id: string; url: string };

type Props = {
  id?: string;
  texts: Record<string, string>;
  link: string;
  isActive: boolean;
  imageDesktop: MediaValue | null;
  imageMobile: MediaValue | null;
};

export function BannerForm({ id, texts, link, isActive, imageDesktop, imageMobile }: Props) {
  return (
    <AdminForm action={saveBanner}>
      {id ? <input type="hidden" name="id" value={id} /> : null}
      <LocaleTabs
        initial={texts}
        mainField="title"
        fields={[
          { name: "title", label: "Titre" },
          { name: "subtitle", label: "Sous-titre", kind: "textarea", rows: 2 },
          { name: "ctaLabel", label: "Texte du bouton" },
        ]}
      />
      <div className="grid grid-cols-1 gap-16 md:grid-cols-2">
        <MediaField
          name="desktopMediaAssetId"
          label="Image desktop"
          value={imageDesktop}
          required
          help="Obligatoire. Format large conseillé (1600 x 640)."
        />
        <MediaField
          name="mobileMediaAssetId"
          label="Image mobile (facultative)"
          value={imageMobile}
          help="Format portrait conseillé (800 x 1000). Sinon l'image desktop est utilisée."
        />
      </div>
      <FormField label="Lien du bouton" name="link" help="Chemin relatif (/soldes) ou adresse https://…">
        <Input id="link" name="link" defaultValue={link} dir="ltr" placeholder="/fr/soldes" />
      </FormField>
      <label className="inline-flex min-h-44 cursor-pointer items-center gap-12 text-body-lg">
        <input type="checkbox" name="isActive" defaultChecked={isActive} className="size-20 accent-accent" />
        Bannière active
      </label>
      <div>
        <SubmitButton variant="accent" pendingLabel="Enregistrement...">
          {id ? "Enregistrer" : "Créer la bannière"}
        </SubmitButton>
      </div>
    </AdminForm>
  );
}
