"use client";

import { useId, type ReactNode } from "react";
import { X } from "lucide-react";
import { Dialog } from "./Dialog";

type Props = {
  open: boolean;
  onClose: () => void;
  title: string;
  closeLabel: string;
  children: ReactNode;
};

export function Modal({ open, onClose, title, closeLabel, children }: Props) {
  const titleId = useId();
  return (
    <Dialog
      open={open}
      onClose={onClose}
      labelledBy={titleId}
      className="p-16 open:flex open:items-center open:justify-center"
    >
      <div className="flex max-h-full w-full max-w-modal animate-modal-in flex-col rounded-card bg-surface shadow-lg">
        <div className="flex items-center justify-between gap-12 px-24 pt-20 pb-12">
          <h2 id={titleId} className="text-title font-semibold tracking-tight">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={closeLabel}
            className="inline-flex size-44 items-center justify-center rounded-pill text-ink hover:bg-canvas"
          >
            <X aria-hidden="true" strokeWidth={1.5} className="size-24" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-24 pb-24">{children}</div>
      </div>
    </Dialog>
  );
}
