"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, useTransition } from "react";
import { ArrowDown, ArrowUp, ImagePlus, Repeat, Trash2 } from "lucide-react";
import { MediaPicker } from "@/components/admin/MediaPicker";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Input";
import {
  addProductImages,
  deleteProductImage,
  moveProductImage,
  setProductImageColor,
  swapProductImage,
  type ImageActionResult,
} from "@/lib/actions/admin/product-images";

export type ManagedImage = {
  id: string;
  mediaAssetId: string;
  url: string;
  name: string;
  /** French alt text of the asset (edited in the media library). */
  alt: string;
  colorId: string | null;
};

type Props = {
  productId: string;
  images: ManagedImage[];
  colors: { id: string; name: string }[];
};

type Run = (task: () => Promise<ImageActionResult>) => void;

function ImageCard({
  image,
  index,
  count,
  colors,
  run,
  onSwap,
}: {
  image: ManagedImage;
  index: number;
  count: number;
  colors: Props["colors"];
  run: Run;
  onSwap: () => void;
}) {
  return (
    <li className="flex flex-col gap-8 rounded-image border border-line p-8">
      <div className="relative aspect-[4/5] overflow-hidden rounded-lg bg-tile">
        <Image src={image.url} alt={image.alt} fill sizes="200px" className="object-cover" />
        <span className="absolute start-6 top-6 rounded-pill bg-surface px-8 py-4 text-caption font-semibold shadow-sm">
          {index + 1}
        </span>
      </div>
      <Select
        value={image.colorId ?? ""}
        aria-label="Couleur de l'image"
        className="min-h-40 text-body"
        onChange={(e) => run(() => setProductImageColor(image.id, e.target.value || null))}
      >
        <option value="">Toutes les couleurs</option>
        {colors.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </Select>
      <Link
        href={`/admin/media?asset=${image.mediaAssetId}`}
        className="truncate text-body-sm text-muted underline-offset-2 hover:underline"
        title={image.name}
      >
        {image.alt || "Ajouter un texte alternatif"}
      </Link>
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
        <div className="flex gap-4">
          <Button variant="secondary" size="sm" aria-label="Remplacer par un autre média" onClick={onSwap}>
            <Repeat aria-hidden="true" strokeWidth={1.5} className="size-16" />
          </Button>
          <Button
            variant="secondary"
            size="sm"
            aria-label="Retirer l'image du produit"
            onClick={() => {
              if (window.confirm("Retirer cette image du produit ? Le fichier reste dans la médiathèque.")) {
                run(() => deleteProductImage(image.id));
              }
            }}
          >
            <Trash2 aria-hidden="true" strokeWidth={1.5} className="size-16" />
          </Button>
        </div>
      </div>
    </li>
  );
}

/** Add images from the media library, swap, reorder with arrows, assign to a color, remove. */
export function ImageManager({ productId, images, colors }: Props) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [swapping, setSwapping] = useState<string | null>(null); // product image id

  const run: Run = (task) => {
    setError(null);
    startTransition(async () => {
      const result = await task();
      if (!result.ok) setError(result.error);
    });
  };

  return (
    <div>
      <div className="mb-12 flex flex-wrap items-center gap-12">
        <Button variant="primary" loading={pending} onClick={() => setAdding(true)}>
          <ImagePlus aria-hidden="true" strokeWidth={1.5} className="size-16" />
          Ajouter des images
        </Button>
        <span className="text-body-sm text-muted">Choisies dans la médiathèque, ou envoyées depuis la fenêtre.</span>
      </div>

      {error ? (
        <p role="alert" className="mb-12 rounded-field bg-error-wash px-16 py-12 text-body text-error">
          {error}
        </p>
      ) : null}

      {images.length === 0 ? (
        <p className="py-16 text-body text-muted">Aucune image pour l&apos;instant.</p>
      ) : (
        <ul className="grid grid-cols-2 gap-12 sm:grid-cols-3 lg:grid-cols-5">
          {images.map((image, index) => (
            <ImageCard
              key={image.id}
              image={image}
              index={index}
              count={images.length}
              colors={colors}
              run={run}
              onSwap={() => setSwapping(image.id)}
            />
          ))}
        </ul>
      )}

      <MediaPicker
        open={adding}
        multiple
        title="Ajouter des images"
        onClose={() => setAdding(false)}
        onPick={(cards) =>
          run(() =>
            addProductImages(
              productId,
              cards.map((c) => c.id),
            ),
          )
        }
      />
      <MediaPicker
        open={swapping !== null}
        title="Remplacer l'image"
        onClose={() => setSwapping(null)}
        onPick={([card]) => {
          const imageId = swapping;
          if (imageId) run(() => swapProductImage(imageId, card.id));
        }}
      />
    </div>
  );
}
