"use client";

import Image from "next/image";
import { useState } from "react";
import { useAdminForm } from "@/components/admin/AdminForm";
import { MediaPicker } from "@/components/admin/MediaPicker";
import { Button } from "@/components/ui/Button";

type Props = {
  /** Name of the hidden input that carries the media asset id ("" = no image). */
  name: string;
  label: string;
  value?: { id: string; url: string } | null;
  /** Hide the remove button (required images). */
  required?: boolean;
  help?: string;
};

/** One image of a record, chosen from the media library (or uploaded there on the spot). */
export function MediaField({ name, label, value = null, required = false, help }: Props) {
  const { state } = useAdminForm();
  const [current, setCurrent] = useState(value);
  const [open, setOpen] = useState(false);
  const error = state.fieldErrors?.[name];

  return (
    <div className="flex flex-col gap-6">
      <span className="text-body font-medium">{label}</span>
      <input type="hidden" name={name} value={current?.id ?? ""} />
      <div className="flex flex-wrap items-center gap-12">
        <div className="relative h-64 w-64 shrink-0 overflow-hidden rounded-image bg-canvas">
          {current ? <Image src={current.url} alt="" fill sizes="64px" className="object-cover" /> : null}
        </div>
        <Button variant="secondary" size="sm" onClick={() => setOpen(true)}>
          {current ? "Changer l'image" : "Choisir une image"}
        </Button>
        {current && !required ? (
          <Button variant="ghost" size="sm" onClick={() => setCurrent(null)}>
            Retirer l&apos;image
          </Button>
        ) : null}
      </div>
      {error ? (
        <p role="alert" className="text-body-sm text-error">
          {error}
        </p>
      ) : (
        <p className="text-body-sm text-muted">{help ?? "Choisissez une image de la médiathèque ou envoyez-en une nouvelle."}</p>
      )}
      <MediaPicker
        open={open}
        onClose={() => setOpen(false)}
        title={label}
        onPick={([card]) => setCurrent({ id: card.id, url: card.url })}
      />
    </div>
  );
}
