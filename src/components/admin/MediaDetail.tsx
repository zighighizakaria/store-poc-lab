"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { RefreshCw } from "lucide-react";
import { AdminForm, ConfirmSubmit, FormField, SubmitButton } from "@/components/admin/AdminForm";
import { buttonClasses } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { deleteMedia, replaceMedia, saveMediaAlt } from "@/lib/actions/admin/media";
import { cn } from "@/lib/cn";
import type { AltTexts, MediaUsage } from "@/lib/media/library";

export type MediaDetailData = {
  id: string;
  url: string;
  name: string;
  mime: string;
  size: number | null;
  width: number | null;
  height: number | null;
  createdAt: string;
  uploadedBy: string | null;
  sourceUrl: string | null;
  author: string | null;
  license: string | null;
  alt: AltTexts;
};

const sizeText = (bytes: number | null) =>
  bytes === null ? "inconnue" : bytes < 1024 * 1024 ? `${Math.round(bytes / 1024)} Ko` : `${(bytes / 1024 / 1024).toFixed(1)} Mo`;

function ReplaceFile({ id }: { id: string }) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  function replace(file: File | undefined) {
    if (!file) return;
    const formData = new FormData();
    formData.set("id", id);
    formData.set("file", file);
    setMessage(null);
    startTransition(async () => {
      const result = await replaceMedia(formData);
      setMessage(result.ok ? { ok: true, text: "Fichier remplacé." } : { ok: false, text: result.error });
      if (input.current) input.current.value = "";
      if (result.ok) router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <label className={cn(buttonClasses({ variant: "secondary", size: "sm" }), "cursor-pointer self-start", pending && "opacity-60")}>
        <RefreshCw aria-hidden="true" strokeWidth={1.5} className="size-16" />
        {pending ? "Envoi en cours…" : "Remplacer le fichier"}
        <input
          ref={input}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          disabled={pending}
          className="sr-only"
          onChange={(e) => replace(e.target.files?.[0])}
        />
      </label>
      <p className="text-body-sm text-muted">
        Garde le même média : tous les endroits où il est utilisé affichent le nouveau fichier.
      </p>
      {message ? (
        <p role={message.ok ? "status" : "alert"} className={cn("text-body-sm", message.ok ? "text-success" : "text-error")}>
          {message.text}
        </p>
      ) : null}
    </div>
  );
}

/** Side panel of the media library: preview, alt texts, usage, replace and delete. */
export function MediaDetail({ asset, usage }: { asset: MediaDetailData; usage: MediaUsage[] }) {
  const dimensions = asset.width && asset.height ? `${asset.width} × ${asset.height} px` : "inconnues";
  return (
    <div className="flex flex-col gap-16">
      <div className="relative aspect-square overflow-hidden rounded-image bg-canvas">
        <Image src={asset.url} alt={asset.alt.fr} fill sizes="360px" className="object-contain" />
      </div>

      <dl className="grid grid-cols-[auto_1fr] gap-x-12 gap-y-4 text-body-sm">
        <dt className="text-muted">Fichier</dt>
        <dd className="min-w-0 break-words">{asset.name}</dd>
        <dt className="text-muted">Dimensions</dt>
        <dd>{dimensions}</dd>
        <dt className="text-muted">Poids</dt>
        <dd>{sizeText(asset.size)}</dd>
        <dt className="text-muted">Type</dt>
        <dd>{asset.mime}</dd>
        <dt className="text-muted">Ajouté le</dt>
        <dd>
          {asset.createdAt}
          {asset.uploadedBy ? ` par ${asset.uploadedBy}` : ""}
        </dd>
        {asset.author || asset.license || asset.sourceUrl ? (
          <>
            <dt className="text-muted">Source</dt>
            <dd className="min-w-0 break-words">
              {[asset.author, asset.license].filter(Boolean).join(" - ")}{" "}
              {asset.sourceUrl ? (
                <a href={asset.sourceUrl} target="_blank" rel="noreferrer" className="underline underline-offset-2">
                  Voir l&apos;original
                </a>
              ) : null}
            </dd>
          </>
        ) : null}
      </dl>

      <AdminForm key={asset.id + asset.alt.fr + asset.alt.ar + asset.alt.en} action={saveMediaAlt}>
        <input type="hidden" name="id" value={asset.id} />
        <h3 className="text-body font-semibold">Texte alternatif</h3>
        {(["fr", "ar", "en"] as const).map((locale) => (
          <FormField key={locale} label={locale.toUpperCase()} name={`alt_${locale}`}>
            <Input
              id={`alt_${locale}`}
              name={`alt_${locale}`}
              defaultValue={asset.alt[locale]}
              dir={locale === "ar" ? "rtl" : undefined}
              maxLength={200}
            />
          </FormField>
        ))}
        <p className="text-body-sm text-muted">Le français sert de repli quand une traduction manque.</p>
        <div>
          <SubmitButton variant="accent" size="sm" pendingLabel="Enregistrement...">
            Enregistrer
          </SubmitButton>
        </div>
      </AdminForm>

      <section>
        <h3 className="mb-6 text-body font-semibold">Utilisé dans</h3>
        {usage.length === 0 ? (
          <p className="text-body-sm text-muted">Non utilisé.</p>
        ) : (
          <ul className="flex flex-col gap-4 text-body-sm">
            {usage.map((place) => (
              <li key={`${place.kind}-${place.href}`}>
                <span className="text-muted">{place.kind} : </span>
                <Link href={place.href} className="underline underline-offset-2">
                  {place.label}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <ReplaceFile id={asset.id} />

      <form action={deleteMedia} className="flex flex-col gap-6">
        <input type="hidden" name="id" value={asset.id} />
        <ConfirmSubmit
          variant="secondary"
          size="sm"
          disabled={usage.length > 0}
          message="Supprimer définitivement ce média ?"
          className="self-start"
        >
          Supprimer
        </ConfirmSubmit>
        {usage.length > 0 ? (
          <p className="text-body-sm text-muted">Suppression impossible tant que le média est utilisé.</p>
        ) : null}
      </form>
    </div>
  );
}
