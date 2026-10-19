"use client";

import { useState } from "react";
import { ArrowDown, ArrowUp, Plus, X } from "lucide-react";
import { AdminForm, SubmitButton } from "@/components/admin/AdminForm";
import { ImageField } from "@/components/admin/ImageField";
import { LocaleTabs } from "@/components/admin/LocaleTabs";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Input";
import { saveCollection } from "@/lib/actions/admin/collections";

type ProductOption = { id: string; name: string };

type Props = {
  id?: string;
  texts: Record<string, string>;
  isActive: boolean;
  showOnHome: boolean;
  image: string | null;
  allProducts: ProductOption[];
  /** Product ids in display order. */
  selected: string[];
};

function ProductPicker({ allProducts, selected: initial }: Pick<Props, "allProducts" | "selected">) {
  const [selected, setSelected] = useState(initial);
  const [toAdd, setToAdd] = useState("");
  const byId = new Map(allProducts.map((p) => [p.id, p.name]));
  const available = allProducts.filter((p) => !selected.includes(p.id));

  const move = (index: number, delta: number) =>
    setSelected((list) => {
      const next = [...list];
      [next[index], next[index + delta]] = [next[index + delta], next[index]];
      return next;
    });

  return (
    <fieldset className="flex flex-col gap-8">
      <legend className="mb-4 text-body font-medium">Produits ({selected.length}), dans l&apos;ordre d&apos;affichage</legend>
      {selected.map((id) => (
        <input key={id} type="hidden" name="productIds" value={id} />
      ))}
      <div className="flex gap-8">
        <div className="min-w-0 flex-1">
          <Select value={toAdd} onChange={(e) => setToAdd(e.target.value)} aria-label="Produit à ajouter">
            <option value="">Ajouter un produit…</option>
            {available.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </Select>
        </div>
        <Button
          variant="secondary"
          disabled={!toAdd}
          onClick={() => {
            setSelected((list) => [...list, toAdd]);
            setToAdd("");
          }}
        >
          <Plus aria-hidden="true" strokeWidth={1.5} className="size-16" />
          Ajouter
        </Button>
      </div>
      {selected.length === 0 ? (
        <p className="text-body text-muted">Aucun produit dans cette collection.</p>
      ) : (
        <ol className="flex flex-col gap-4">
          {selected.map((id, index) => (
            <li key={id} className="flex items-center gap-8 rounded-pill border border-line bg-surface ps-16 pe-4 py-4">
              <span className="w-24 text-body-sm text-muted" dir="ltr">
                {index + 1}
              </span>
              <span className="min-w-0 flex-1 truncate text-body">{byId.get(id) ?? id}</span>
              <Button variant="ghost" size="sm" aria-label="Monter" disabled={index === 0} onClick={() => move(index, -1)}>
                <ArrowUp aria-hidden="true" strokeWidth={1.5} className="size-16" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                aria-label="Descendre"
                disabled={index === selected.length - 1}
                onClick={() => move(index, 1)}
              >
                <ArrowDown aria-hidden="true" strokeWidth={1.5} className="size-16" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                aria-label="Retirer"
                onClick={() => setSelected((list) => list.filter((x) => x !== id))}
              >
                <X aria-hidden="true" strokeWidth={1.5} className="size-16" />
              </Button>
            </li>
          ))}
        </ol>
      )}
    </fieldset>
  );
}

export function CollectionForm({ id, texts, isActive, showOnHome, image, allProducts, selected }: Props) {
  return (
    <AdminForm action={saveCollection}>
      {id ? <input type="hidden" name="id" value={id} /> : null}
      <LocaleTabs
        initial={texts}
        fields={[
          { name: "name", label: "Nom" },
          { name: "slug", label: "Slug (URL)", slugFromName: true, help: "Unique dans la langue." },
          { name: "description", label: "Description", kind: "textarea", rows: 3 },
        ]}
      />
      <ImageField name="image" label="Image" currentUrl={image} />
      <div className="flex flex-wrap gap-24">
        <label className="inline-flex min-h-44 cursor-pointer items-center gap-12 text-body-lg">
          <input type="checkbox" name="isActive" defaultChecked={isActive} className="size-20 accent-accent" />
          Collection active
        </label>
        <label className="inline-flex min-h-44 cursor-pointer items-center gap-12 text-body-lg">
          <input type="checkbox" name="showOnHome" defaultChecked={showOnHome} className="size-20 accent-accent" />
          Afficher sur la page d&apos;accueil
        </label>
      </div>
      <ProductPicker allProducts={allProducts} selected={selected} />
      <div>
        <SubmitButton variant="accent" pendingLabel="Enregistrement...">
          {id ? "Enregistrer" : "Créer la collection"}
        </SubmitButton>
      </div>
    </AdminForm>
  );
}
