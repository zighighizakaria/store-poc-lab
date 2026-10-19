"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { useAdminForm } from "@/components/admin/AdminForm";

type Props = {
  /** File input name; the "remove" checkbox is `remove${Name}` (image -> removeImage). */
  name: string;
  label: string;
  currentUrl?: string | null;
  /** Hide the remove checkbox (required images). */
  required?: boolean;
  help?: string;
};

/** One image of a record: current preview, file input (validated server side), optional removal. */
export function ImageField({ name, label, currentUrl, required = false, help }: Props) {
  const { state } = useAdminForm();
  const [preview, setPreview] = useState<string | null>(null);
  const error = state.fieldErrors?.[name];

  useEffect(() => () => (preview ? URL.revokeObjectURL(preview) : undefined), [preview]);

  const shown = preview ?? currentUrl ?? null;
  const removeName = `remove${name.charAt(0).toUpperCase()}${name.slice(1)}`;

  return (
    <div className="flex flex-col gap-6">
      <label htmlFor={name} className="text-body font-medium">
        {label}
      </label>
      <div className="flex flex-wrap items-center gap-12">
        <div className="relative h-64 w-64 shrink-0 overflow-hidden rounded-image bg-canvas">
          {shown ? (
            <Image src={shown} alt="" fill sizes="64px" className="object-cover" unoptimized={!!preview} />
          ) : null}
        </div>
        <div className="flex min-w-0 flex-col gap-8">
          <input
            id={name}
            name={name}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            aria-invalid={!!error}
            className="max-w-full text-body"
            onChange={(e) => {
              const file = e.target.files?.[0];
              setPreview(file ? URL.createObjectURL(file) : null);
            }}
          />
          {currentUrl && !required ? (
            <label className="inline-flex items-center gap-8 text-body">
              <input type="checkbox" name={removeName} className="size-16 accent-accent" />
              Supprimer l&apos;image actuelle
            </label>
          ) : null}
        </div>
      </div>
      {error ? (
        <p role="alert" className="text-body-sm text-error">
          {error}
        </p>
      ) : (
        <p className="text-body-sm text-muted">{help ?? "JPEG, PNG ou WebP, 5 Mo maximum."}</p>
      )}
    </div>
  );
}
