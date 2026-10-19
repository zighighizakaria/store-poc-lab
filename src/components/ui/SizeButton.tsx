import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";

type Props = ComponentProps<"button"> & { selected?: boolean };

/** Size choice. `disabled` (out of stock) renders struck through. */
export function SizeButton({
  selected = false,
  className,
  type = "button",
  ...rest
}: Props) {
  return (
    <button
      type={type}
      aria-pressed={selected}
      className={cn(
        "inline-flex min-h-44 min-w-44 items-center justify-center rounded-pill border px-16 text-body-lg font-medium transition-colors duration-fast",
        selected
          ? "border-ink bg-ink text-on-accent"
          : "border-line bg-surface text-ink hover:border-ink",
        "disabled:cursor-not-allowed disabled:border-line disabled:bg-canvas disabled:text-muted disabled:line-through disabled:hover:border-line",
        className,
      )}
      {...rest}
    />
  );
}
