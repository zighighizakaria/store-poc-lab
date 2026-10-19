import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";

/** Kit elevated card: white, 28px radius, dual-layer shadow, no border. */
export function Card({ className, ...rest }: ComponentProps<"div">) {
  return (
    <div
      className={cn("rounded-card bg-surface p-8 shadow-sm-2", className)}
      {...rest}
    />
  );
}

/**
 * Image area of a card: 20px inner radius, so a thin white frame separates the
 * picture from the 28px card edge. Overlays (badges, labels) go in children.
 */
export function ProductImageTile({
  className,
  children,
  ...rest
}: ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "relative aspect-[4/5] overflow-hidden rounded-image bg-canvas",
        className,
      )}
      {...rest}
    >
      {children}
    </div>
  );
}
