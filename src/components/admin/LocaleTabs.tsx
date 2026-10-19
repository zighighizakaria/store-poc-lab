"use client";

import { useState } from "react";
import { useAdminForm } from "@/components/admin/AdminForm";
import { Field, Input, Textarea } from "@/components/ui/Input";
import { cn } from "@/lib/cn";
import { LOCALE_LABELS } from "@/lib/admin/labels";
import { slugify } from "@/lib/slugify";

const LOCALES = ["fr", "ar", "en"] as const;
type Locale = (typeof LOCALES)[number];

export type TabField = {
  /** Base name; inputs are named `${name}_${locale}` (name_fr, slug_ar...). */
  name: string;
  label: string;
  kind?: "input" | "textarea";
  rows?: number;
  help?: string;
  /** Generate this field from `name` until the admin edits it (slugs). */
  slugFromName?: boolean;
};

type Props = {
  fields: TabField[];
  /** Initial values keyed `${name}_${locale}`. */
  initial: Record<string, string>;
  /** Field whose emptiness means "translation missing" in AR / EN. */
  mainField?: string;
};

/**
 * FR / AR / EN tabs for translated fields. FR is required, AR and EN are
 * optional ("traduction manquante" shows when their main field is empty).
 * Every tab stays in the DOM (hidden) so all values are submitted.
 */
export function LocaleTabs({ fields, initial, mainField = "name" }: Props) {
  const { state } = useAdminForm();
  const [active, setActive] = useState<Locale>("fr");
  const [values, setValues] = useState<Record<string, string>>(initial);
  // A slug follows the name only while it started empty and was not edited.
  const [manualSlug, setManualSlug] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(
      LOCALES.flatMap((l) =>
        fields.filter((f) => f.slugFromName).map((f) => [`${f.name}_${l}`, !!initial[`${f.name}_${l}`]]),
      ),
    ),
  );

  function change(key: string, value: string, locale: Locale) {
    setValues((previous) => {
      const next = { ...previous, [key]: value };
      if (key === `${mainField}_${locale}`) {
        for (const field of fields) {
          const slugKey = `${field.name}_${locale}`;
          if (field.slugFromName && !manualSlug[slugKey]) next[slugKey] = slugify(value);
        }
      }
      return next;
    });
  }

  const hasError = (locale: Locale) =>
    fields.some((f) => state.fieldErrors?.[`${f.name}_${locale}`]);

  return (
    <div>
      <div role="tablist" aria-label="Langues" className="mb-16 flex flex-wrap gap-8">
        {LOCALES.map((locale) => {
          const missing = locale !== "fr" && !values[`${mainField}_${locale}`]?.trim();
          const selected = active === locale;
          return (
            <button
              key={locale}
              type="button"
              role="tab"
              id={`tab-${locale}`}
              aria-selected={selected}
              aria-controls={`panel-${locale}`}
              onClick={() => setActive(locale)}
              className={cn(
                "inline-flex min-h-44 items-center gap-8 rounded-pill border px-16 text-body font-medium transition-colors duration-fast",
                selected ? "border-ink bg-ink text-on-ink" : "border-line bg-surface hover:bg-canvas",
              )}
            >
              {LOCALE_LABELS[locale]}
              {locale === "fr" ? <span className="text-caption opacity-80">obligatoire</span> : null}
              {missing ? (
                <span className="rounded-pill bg-warning-wash px-8 py-4 text-caption leading-none text-warning">
                  traduction manquante
                </span>
              ) : null}
              {hasError(locale) ? (
                <span aria-label="Erreur dans cet onglet" className="size-8 rounded-pill bg-error" />
              ) : null}
            </button>
          );
        })}
      </div>

      {LOCALES.map((locale) => (
        <div
          key={locale}
          role="tabpanel"
          id={`panel-${locale}`}
          aria-labelledby={`tab-${locale}`}
          hidden={active !== locale}
          className="flex flex-col gap-16"
        >
          {fields.map((field) => {
            const key = `${field.name}_${locale}`;
            const common = {
              id: key,
              name: key,
              value: values[key] ?? "",
              dir: locale === "ar" ? ("rtl" as const) : undefined,
              lang: locale,
              "aria-invalid": !!state.fieldErrors?.[key],
            };
            return (
              <Field
                key={key}
                label={`${field.label} (${locale.toUpperCase()})`}
                htmlFor={key}
                error={state.fieldErrors?.[key]}
                help={field.help}
              >
                {field.kind === "textarea" ? (
                  <Textarea
                    {...common}
                    rows={field.rows ?? 5}
                    onChange={(e) => change(key, e.target.value, locale)}
                  />
                ) : (
                  <Input
                    {...common}
                    onChange={(e) => {
                      if (field.slugFromName) setManualSlug((m) => ({ ...m, [key]: true }));
                      change(key, e.target.value, locale);
                    }}
                  />
                )}
              </Field>
            );
          })}
        </div>
      ))}
    </div>
  );
}
