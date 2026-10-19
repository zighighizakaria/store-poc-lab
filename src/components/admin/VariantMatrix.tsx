"use client";

import { useState, useTransition } from "react";
import { Trash2 } from "lucide-react";
import { AdminForm, SubmitButton, useAdminForm } from "@/components/admin/AdminForm";
import { tableClass, tdClass, thClass, TableWrap } from "@/components/admin/ui";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { deleteVariant, generateVariants, saveVariants } from "@/lib/actions/admin/variants";
import { SIZE_GROUP_LABELS } from "@/lib/admin/labels";
import { cn } from "@/lib/cn";
import type { SizeGroup } from "@prisma/client";

export type VariantRow = {
  id: string;
  colorName: string;
  colorHex: string;
  sizeLabel: string;
  sku: string;
  stock: number;
  price: string; // MAD override, "" = none
};

type Props = {
  productId: string;
  colors: { id: string; name: string; hex: string }[];
  sizes: { id: string; label: string; group: SizeGroup }[];
  rows: VariantRow[];
};

function Choice({ name, value, label, swatch }: { name: string; value: string; label: string; swatch?: string }) {
  return (
    <label className="relative inline-flex min-h-44 cursor-pointer items-center gap-8 rounded-pill border border-line bg-surface px-16 text-body has-[:checked]:border-ink has-[:checked]:bg-ink has-[:checked]:text-on-accent">
      <input type="checkbox" name={name} value={value} className="sr-only" />
      {swatch ? (
        <span aria-hidden="true" style={{ backgroundColor: swatch }} className="size-16 rounded-pill border border-input-border" />
      ) : null}
      {label}
    </label>
  );
}

function VariantsTable({ productId, rows }: { productId: string; rows: VariantRow[] }) {
  const { state } = useAdminForm();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function remove(id: string) {
    if (!window.confirm("Supprimer cette variante ?")) return;
    setError(null);
    startTransition(async () => {
      const result = await deleteVariant(id);
      if (!result.ok) setError(result.error);
    });
  }

  return (
    <>
      <input type="hidden" name="productId" value={productId} />
      <TableWrap>
        <table className={tableClass}>
          <thead>
            <tr>
              <th className={thClass}>Couleur</th>
              <th className={thClass}>Taille</th>
              <th className={thClass}>SKU</th>
              <th className={thClass}>Stock</th>
              <th className={thClass}>Prix spécifique (MAD)</th>
              <th className={thClass}>
                <span className="sr-only">Supprimer</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const cell = (key: string) => state.fieldErrors?.[`${key}_${row.id}`];
              return (
                <tr key={row.id}>
                  <td className={cn(tdClass, "whitespace-nowrap")}>
                    <span className="inline-flex items-center gap-8">
                      <span
                        aria-hidden="true"
                        style={{ backgroundColor: row.colorHex }}
                        className="size-16 rounded-pill border border-input-border"
                      />
                      {row.colorName}
                    </span>
                  </td>
                  <td className={tdClass}>{row.sizeLabel}</td>
                  <td className={tdClass}>
                    <input type="hidden" name="ids" value={row.id} />
                    <input type="hidden" name={`stock0_${row.id}`} value={row.stock} />
                    <Input
                      name={`sku_${row.id}`}
                      defaultValue={row.sku}
                      aria-label={`SKU ${row.colorName} ${row.sizeLabel}`}
                      aria-invalid={!!cell("sku")}
                      dir="ltr"
                      className="min-h-40 min-w-[200px] text-body"
                    />
                    {cell("sku") ? <p className="mt-4 text-body-sm text-error">{cell("sku")}</p> : null}
                  </td>
                  <td className={tdClass}>
                    <Input
                      name={`stock_${row.id}`}
                      type="number"
                      min={0}
                      step={1}
                      defaultValue={row.stock}
                      aria-label={`Stock ${row.colorName} ${row.sizeLabel}`}
                      aria-invalid={!!cell("stock")}
                      dir="ltr"
                      className="min-h-40 w-[96px] text-body"
                    />
                    {cell("stock") ? <p className="mt-4 text-body-sm text-error">{cell("stock")}</p> : null}
                  </td>
                  <td className={tdClass}>
                    <Input
                      name={`price_${row.id}`}
                      inputMode="decimal"
                      defaultValue={row.price}
                      placeholder="—"
                      aria-label={`Prix spécifique ${row.colorName} ${row.sizeLabel}`}
                      aria-invalid={!!cell("price")}
                      dir="ltr"
                      className="min-h-40 w-[120px] text-body"
                    />
                    {cell("price") ? <p className="mt-4 text-body-sm text-error">{cell("price")}</p> : null}
                  </td>
                  <td className={tdClass}>
                    <Button
                      variant="ghost"
                      size="sm"
                      aria-label={`Supprimer ${row.colorName} ${row.sizeLabel}`}
                      disabled={pending}
                      onClick={() => remove(row.id)}
                    >
                      <Trash2 aria-hidden="true" strokeWidth={1.5} className="size-16" />
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </TableWrap>
      {error ? (
        <p role="alert" className="rounded-field bg-error-wash px-16 py-12 text-body text-error">
          {error}
        </p>
      ) : null}
      <div>
        <SubmitButton variant="accent" pendingLabel="Enregistrement...">
          Enregistrer les variantes
        </SubmitButton>
      </div>
    </>
  );
}

/** Pick colors x sizes to generate the rows, then edit SKU / stock / price per row. */
export function VariantMatrix({ productId, colors, sizes, rows }: Props) {
  const groups = (Object.keys(SIZE_GROUP_LABELS) as SizeGroup[])
    .map((group) => ({ group, sizes: sizes.filter((s) => s.group === group) }))
    .filter((g) => g.sizes.length > 0);

  return (
    <div className="flex flex-col gap-24">
      <AdminForm action={generateVariants}>
        <input type="hidden" name="productId" value={productId} />
        <fieldset>
          <legend className="mb-8 text-body font-medium">Couleurs</legend>
          <div className="flex flex-wrap gap-8">
            {colors.map((c) => (
              <Choice key={c.id} name="colorIds" value={c.id} label={c.name} swatch={c.hex} />
            ))}
          </div>
        </fieldset>
        {groups.map(({ group, sizes: list }) => (
          <fieldset key={group}>
            <legend className="mb-8 text-body font-medium">Tailles : {SIZE_GROUP_LABELS[group]}</legend>
            <div className="flex flex-wrap gap-8">
              {list.map((s) => (
                <Choice key={s.id} name="sizeIds" value={s.id} label={s.label} />
              ))}
            </div>
          </fieldset>
        ))}
        <div>
          <SubmitButton variant="secondary" pendingLabel="Génération...">
            Générer les variantes
          </SubmitButton>
        </div>
      </AdminForm>

      {rows.length === 0 ? (
        <p className="text-body text-muted">Aucune variante : générez-en ci-dessus.</p>
      ) : (
        <AdminForm action={saveVariants}>
          <VariantsTable productId={productId} rows={rows} />
        </AdminForm>
      )}
    </div>
  );
}
