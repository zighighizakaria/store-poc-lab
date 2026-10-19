"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { Upload } from "lucide-react";
import { uploadMedia } from "@/lib/actions/admin/media";
import { cn } from "@/lib/cn";
import type { MediaCard } from "@/lib/media/library";

type Props = {
  /** Called for each file stored, as soon as it is. */
  onUploaded?: (card: MediaCard) => void;
  /** Called once the whole batch is done. */
  onDone?: () => void;
  multiple?: boolean;
  className?: string;
};

/** Drag-and-drop (or browse) upload. Files go to the server one per request, in order. */
export function MediaUploader({ onUploaded, onDone, multiple = true, className }: Props) {
  const input = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const busy = progress !== null;

  async function upload(list: File[]) {
    const files = multiple ? list : list.slice(0, 1);
    if (files.length === 0 || busy) return;
    const failures: string[] = [];
    setErrors([]);
    for (const [index, file] of files.entries()) {
      setProgress({ done: index, total: files.length });
      const formData = new FormData();
      formData.set("file", file);
      try {
        const result = await uploadMedia(formData);
        if (result.ok) onUploaded?.(result.card);
        else failures.push(result.error);
      } catch {
        failures.push(`${file.name} : échec de l'envoi.`);
      }
    }
    setProgress(null);
    setErrors(failures);
    if (input.current) input.current.value = "";
    onDone?.();
  }

  return (
    <div className={className}>
      <label
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          void upload([...e.dataTransfer.files]);
        }}
        className={cn(
          "flex min-h-64 cursor-pointer flex-col items-center justify-center gap-4 rounded-image border border-dashed border-line px-16 py-12 text-center text-body transition-colors duration-fast hover:bg-canvas",
          dragging && "border-accent bg-canvas",
          busy && "cursor-progress opacity-60",
        )}
      >
        <Upload aria-hidden="true" strokeWidth={1.5} className="size-20" />
        <span className="font-medium">
          {busy
            ? `Envoi en cours… ${progress.done + 1} / ${progress.total}`
            : multiple
              ? "Glissez des images ici ou cliquez pour parcourir"
              : "Glissez une image ici ou cliquez pour parcourir"}
        </span>
        <span className="text-body-sm text-muted">
          JPEG, PNG ou WebP, 5 Mo maximum. Redimensionnées (2400 px) et converties en WebP.
        </span>
        <input
          ref={input}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple={multiple}
          disabled={busy}
          className="sr-only"
          onChange={(e) => void upload([...(e.target.files ?? [])])}
        />
      </label>
      {errors.length > 0 ? (
        <ul role="alert" className="mt-8 rounded-field bg-error-wash px-16 py-12 text-body text-error">
          {errors.map((error) => (
            <li key={error}>{error}</li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

/** The uploader of the library page: refreshes the grid once a batch is done. */
export function LibraryUploader() {
  const router = useRouter();
  return <MediaUploader onDone={() => router.refresh()} />;
}
