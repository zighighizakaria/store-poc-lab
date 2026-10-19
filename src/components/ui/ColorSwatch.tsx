import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";

type Props = Omit<ComponentProps<"button">, "color"> & {
  /** Color hex from the database (data, not a design token). */
  hex: string;
  /** Accessible color name (translated). */
  name: string;
  selected?: boolean;
  /** sm: 16px dot in a 24px hit area (cards). md: 32px dot in a 44px hit area. */
  size?: "sm" | "md";
};

export function ColorSwatch({
  hex,
  name,
  selected = false,
  size = "md",
  className,
  type = "button",
  ...rest
}: Props) {
  return (
    <button
      type={type}
      aria-label={name}
      title={name}
      aria-pressed={selected}
      className={cn(
        "inline-flex items-center justify-center rounded-pill",
        size === "sm" ? "size-24" : "size-44",
        className,
      )}
      {...rest}
    >
      <span
        aria-hidden="true"
        style={{ backgroundColor: hex }}
        className={cn(
          "block rounded-pill border border-input-border",
          size === "sm" ? "size-16" : "size-32",
          selected && "ring-2 ring-ink ring-offset-2 ring-offset-surface",
        )}
      />
    </button>
  );
}
