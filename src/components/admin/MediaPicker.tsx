"use client";

import Image from "next/image";
import { useEffect, useId, useRef, useState } from "react";
import { Check, X } from "lucide-react";
import { MediaUploader } from "@/components/admin/MediaUploader";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { Input } from "@/components/ui/Input";
import { listMedia } from "@/lib/actions/admin/media";
import { cn } from "@/lib/cn";
import type { MediaCard } from "@/lib/media/library";

type Props = {
  open: boolean;
  onClose: () => void;
  /** Called with the chosen asset(s); the picker closes itself. */
  onPick: (items: MediaCard[]) => void;
  /** Pick several assets (confirm button) instead of one (click). */
  multiple?: boolean;
  title?: string;
};

function PickerBody({
  titleId,
  onClose,
  onPick,
  multiple = false,
  title = "Choisir une image",
}: Omit<Props, "open"> & { titleId: string }) {
  const [q, setQ] = useState("");
  const [items, setItems] = useState<MediaCard[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<MediaCard[]>([]);
  const latest = useRef(0);

  // Load the first page (debounced while typing); later responses of an older query are ignored.
  useEffect(() => {
    const request = ++latest.current;
    const timer = setTimeout(async () => {
      setLoading(true);
      const page = await listMedia({ q });
      if (request !== latest.current) return;
      setItems(page.items);
      setCursor(page.nextCursor);
      setLoading(false);
    }, q ? 250 : 0);
    return () => clearTimeout(timer);
  }, [q]);

  async function loadMore() {
    if (!cursor) return;
    setLoading(true);
    const page = await listMedia({ q, cursor });
    setItems((current) => [...current, ...page.items]);
    setCursor(page.nextCursor);
    setLoading(false);
  }

  function choose(card: MediaCard) {
    if (!multiple) {
      onPick([card]);
      onClose();
      return;
    }
    setSelected((current) =>
      current.some((c) => c.id === card.id) ? current.filter((c) => c.id !== card.id) : [...current, card],
    );
  }

  function uploaded(card: MediaCard) {
    setItems((current) => [card, ...current]);
    if (!multiple) {
      onPick([card]);
      onClose();
    } else {
      setSelected((current) => [...current, card]);
    }
  }

  return (
    <div className="flex max-h-full w-full max-w-[960px] animate-modal-in flex-col rounded-card bg-surface shadow-lg">
      <div className="flex items-center justify-between gap-12 px-24 pt-20 pb-12">
        <h2 id={titleId} className="text-title font-semibold tracking-tight">
          {title}
        </h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="Fermer"
          className="inline-flex size-44 items-center justify-center rounded-pill text-ink hover:bg-canvas"
        >
          <X aria-hidden="true" strokeWidth={1.5} className="size-24" />
        </button>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-12 overflow-y-auto px-24 pb-16">
        <MediaUploader multiple={multiple} onUploaded={uploaded} />
        <Input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") e.preventDefault(); // the picker may sit inside a form
          }}
          placeholder="Rechercher (nom de fichier ou texte alternatif)"
          aria-label="Rechercher dans la médiathèque"
        />
        {items.length === 0 && !loading ? (
          <p className="py-24 text-center text-body text-muted">Aucun média.</p>
        ) : (
          <ul className="grid grid-cols-2 gap-8 sm:grid-cols-4 md:grid-cols-5">
            {items.map((card) => {
              const isSelected = selected.some((c) => c.id === card.id);
              return (
                <li key={card.id}>
                  <button
                    type="button"
                    onClick={() => choose(card)}
                    aria-pressed={multiple ? isSelected : undefined}
                    title={card.name}
                    className={cn(
                      "relative block aspect-square w-full overflow-hidden rounded-image border bg-canvas",
                      isSelected ? "border-accent ring-2 ring-accent" : "border-line hover:border-ink",
                    )}
                  >
                    <Image src={card.url} alt={card.alt} fill sizes="160px" className="object-cover" />
                    {isSelected ? (
                      <span className="absolute end-6 top-6 inline-flex size-24 items-center justify-center rounded-pill bg-accent text-on-accent">
                        <Check aria-hidden="true" strokeWidth={2} className="size-16" />
                      </span>
                    ) : null}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
        {cursor ? (
          <div className="text-center">
            <Button variant="secondary" size="sm" loading={loading} onClick={() => void loadMore()}>
              Charger plus
            </Button>
          </div>
        ) : null}
        {loading && items.length === 0 ? <p className="py-24 text-center text-body text-muted">Chargement…</p> : null}
      </div>

      {multiple ? (
        <div className="flex items-center justify-between gap-12 border-t border-line px-24 py-12">
          <span className="text-body text-muted">{selected.length} sélectionnée(s)</span>
          <Button
            variant="accent"
            disabled={selected.length === 0}
            onClick={() => {
              onPick(selected);
              onClose();
            }}
          >
            Ajouter
          </Button>
        </div>
      ) : null}
    </div>
  );
}

/** Modal to pick existing media or upload new ones. Its state resets every time it opens. */
export function MediaPicker({ open, onClose, ...rest }: Props) {
  const titleId = useId();
  return (
    <Dialog open={open} onClose={onClose} labelledBy={titleId} className="p-16 open:flex open:items-center open:justify-center">
      <PickerBody titleId={titleId} onClose={onClose} {...rest} />
    </Dialog>
  );
}
