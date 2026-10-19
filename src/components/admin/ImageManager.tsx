"use client";

import Image from "next/image";
import { useRef, useState, useTransition } from "react";
import { ArrowDown, ArrowUp, Trash2, Upload } from "lucide-react";
import { Button, buttonClasses } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Input";
import {
  deleteProductImage,
  moveProductImage,
  updateProductImage,
  uploadProductImage,
  type ImageActionResult,
} from "@/lib/actions/admin/product-images";
import { cn } from "@/lib/cn";

export type ManagedImage = {
  id: string;
  url: string;
  colorId: string | null;
  alt: { fr: string; ar: string; en: string };
};

type Props = {
  productId: string;
  images: ManagedImage[];
  colors: { id: string; name: string }[];
};

function ImageCard({
  image,
  index,
  count,
  colors,
  run,
}: {
  image: ManagedImage;
  index: number;
  count: number;
  colors: Props["colors"];
  run: (task: () => Promise<ImageActionResult>) => void;
}) {
  const [colorId, setColorId] = useState(image.colorId ?? "");
  const [alt, setAlt] = useState(image.alt);
  const save = (next: { colorId?: string; alt?: typeof alt }) =>
    run(() =>
      updateProductImage(image.id, {
        colorId: (next.colorId ?? colorId) || null,
        alt: next.alt ?? alt,
      }),
    );

  return (
    <li className="flex flex-col gap-8 rounded-image border border-line p-8">
      <div className="relative aspect-[4/5] overflow-hidden rounded-lg bg-canvas">
        <Image src={image.url} alt={image.alt.fr || ""} fill sizes="200px" className="object-cover" />
        <span className="absolute start-6 top-6 rounded-pill bg-surface px-8 py-4 text-caption font-semibold shadow-sm">
          {index + 1}
        </span>
      </div>
      <Select
        value={colorId}
        aria-label="Couleur de l'image"
        className="min-h-40 text-body"
        onChange={(e) => {
          setColorId(e.target.value);
          save({ colorId: e.target.value });
        }}
      >
        <option value="">Toutes les couleurs</option>
        {colors.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </Select>
      <details>
        <summary className="cursor-pointer text-body-sm text-muted">Texte alternatif (traduit)</summary>
        <div className="mt-8 flex flex-col gap-6">
          {(["fr", "ar", "en"] as const).map((locale) => (
            <Input
              key={locale}
              value={alt[locale]}
              dir={locale === "ar" ? "rtl" : undefined}
              placeholder={`Alt ${locale.toUpperCase()}`}
              aria-label={`Texte alternatif ${locale.toUpperCase()}`}
              maxLength={200}
              className="min-h-40 text-body"
              onChange={(e) => setAlt({ ...alt, [locale]: e.target.value })}
              onBlur={() => save({})}
            />
          ))}
        </div>
      </details>
      <div className="flex items-center justify-between gap-4">
        <div className="flex gap-4">
          <Button
            variant="secondary"
            size="sm"
            aria-label="Monter"
            disabled={index === 0}
            onClick={() => run(() => moveProductImage(image.id, "up"))}
          >
            <ArrowUp aria-hidden="true" strokeWidth={1.5} className="size-16" />
          </Button>
          <Button
            variant="secondary"
            size="sm"
            aria-label="Descendre"
            disabled={index === count - 1}
            onClick={() => run(() => moveProductImage(image.id, "down"))}
          >
            <ArrowDown aria-hidden="true" strokeWidth={1.5} className="size-16" />
          </Button>
        </div>
        <Button
          variant="secondary"
          size="sm"
          aria-label="Supprimer l'image"
          onClick={() => {
            if (window.confirm("Supprimer cette image ?")) run(() => deleteProductImage(image.id));
          }}
        >
          <Trash2 aria-hidden="true" strokeWidth={1.5} className="size-16" />
        </Button>
      </div>
    </li>
  );
}

/** Upload (one file per request), reorder with arrows, assign to a color, delete. */
export function ImageManager({ productId, images, colors }: Props) {
  const [pending, startTransition] = useTransition();
  const [errors, setErrors] = useState<string[]>([]);
  const input = useRef<HTMLInputElement>(null);

  function run(task: () => Promise<ImageActionResult>) {
    startTransition(async () => {
      const result = await task();
      if (!result.ok) setErrors([result.error]);
    });
  }

  function upload(files: FileList | null) {
    if (!files || files.length === 0) return;
    const list = [...files];
    setErrors([]);
    startTransition(async () => {
      const failures: string[] = [];
      for (const file of list) {
        const formData = new FormData();
        formData.set("productId", productId);
        formData.set("file", file);
        const result = await uploadProductImage(formData);
        if (!result.ok) failures.push(result.error);
      }
      setErrors(failures);
      if (input.current) input.current.value = "";
    });
  }

  return (
    <div>
      <div className="mb-12 flex flex-wrap items-center gap-12">
        <label className={cn(buttonClasses({ variant: "primary", size: "md" }), "relative cursor-pointer", pending && "opacity-60")}>
          <Upload aria-hidden="true" strokeWidth={1.5} className="size-16" />
          {pending ? "Envoi en cours…" : "Ajouter des images"}
          <input
            ref={input}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            disabled={pending}
            className="sr-only"
            onChange={(e) => upload(e.target.files)}
          />
        </label>
        <span className="text-body-sm text-muted">JPEG, PNG ou WebP, 5 Mo maximum chacune.</span>
      </div>

      {errors.length > 0 ? (
        <ul role="alert" className="mb-12 rounded-field bg-error-wash px-16 py-12 text-body text-error">
          {errors.map((error) => (
            <li key={error}>{error}</li>
          ))}
        </ul>
      ) : null}

      {images.length === 0 ? (
        <p className="py-16 text-body text-muted">Aucune image pour l&apos;instant.</p>
      ) : (
        <ul className="grid grid-cols-2 gap-12 sm:grid-cols-3 lg:grid-cols-5">
          {images.map((image, index) => (
            <ImageCard
              key={`${image.id}-${image.colorId}-${image.alt.fr}-${image.alt.ar}-${image.alt.en}`}
              image={image}
              index={index}
              count={images.length}
              colors={colors}
              run={run}
            />
          ))}
        </ul>
      )}
    </div>
  );
}
