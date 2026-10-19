"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { cn } from "@/lib/cn";

// Shared base of Drawer and Modal, built on the native <dialog> element:
// showModal() gives a focus trap, Esc to close, inert background, top-layer
// stacking (above the sticky header) and focus restore on close.

let scrollLocks = 0;

function lockScroll() {
  if (scrollLocks++ === 0) document.documentElement.style.overflow = "hidden";
}

function unlockScroll() {
  if (--scrollLocks <= 0) {
    scrollLocks = 0;
    document.documentElement.style.overflow = "";
  }
}

type Props = {
  open: boolean;
  onClose: () => void;
  labelledBy: string;
  /** Classes of the full-viewport <dialog> (layout of the panel inside it). */
  className?: string;
  children: ReactNode;
};

export function Dialog({ open, onClose, labelledBy, className, children }: Props) {
  const ref = useRef<HTMLDialogElement>(null);

  // Sync the `open` prop to the element.
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    else if (!open && dialog.open) dialog.close();
  }, [open]);

  // Scroll lock (ref-counted so stacked dialogs do not unlock each other).
  useEffect(() => {
    if (!open) return;
    lockScroll();
    return unlockScroll;
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={labelledBy}
      onClose={onClose}
      onClick={(event) => {
        // A click on the dialog itself (outside the panel) is a backdrop click.
        if (event.target === event.currentTarget) onClose();
      }}
      className={cn(
        "fixed inset-0 m-0 size-full max-h-none max-w-none bg-transparent p-0 text-ink backdrop:animate-fade-in backdrop:bg-overlay",
        className,
      )}
    >
      {open ? children : null}
    </dialog>
  );
}
