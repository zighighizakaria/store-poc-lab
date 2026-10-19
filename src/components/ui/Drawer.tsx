"use client";

import { useId, type ReactNode } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/cn";
import { Dialog } from "./Dialog";

type Props = {
  open: boolean;
  onClose: () => void;
  title: string;
  closeLabel: string;
  /** Inline side the panel slides from. "end" = right in LTR, left in RTL. */
  side?: "start" | "end";
  children: ReactNode;
  /** Pinned below the scrolling body (totals, main action). */
  footer?: ReactNode;
  bodyClassName?: string;
};

export function Drawer({
  open,
  onClose,
  title,
  closeLabel,
  side = "end",
  children,
  footer,
  bodyClassName,
}: Props) {
  const titleId = useId();
  return (
    <Dialog open={open} onClose={onClose} labelledBy={titleId}>
      <div
        className={cn(
          "flex h-full w-full max-w-drawer flex-col bg-surface shadow-lg",
          side === "end"
            ? "ms-auto animate-drawer-end rounded-s-card"
            : "me-auto animate-drawer-start rounded-e-card",
        )}
      >
        <div className="flex items-center justify-between gap-12 border-b border-line px-20 py-12">
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
        <div className={cn("min-h-0 flex-1 overflow-y-auto p-20", bodyClassName)}>
          {children}
        </div>
        {footer ? <div className="border-t border-line p-20">{footer}</div> : null}
      </div>
    </Dialog>
  );
}
