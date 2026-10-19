import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";

export type BadgeVariant = "sale" | "new" | "out-of-stock" | "low-stock";

const variants: Record<BadgeVariant, string> = {
  sale: "bg-error text-on-accent",
  new: "bg-surface text-ink shadow-sm",
  "out-of-stock": "bg-slate-ink text-on-accent",
  "low-stock": "bg-warning-wash text-warning",
};

type BadgeProps = ComponentProps<"span"> & { variant: BadgeVariant };

export function Badge({ variant, className, ...rest }: BadgeProps) {
  return (
    <span
      // "-X%" must not be reordered by the bidi algorithm inside Arabic text.
      dir={variant === "sale" ? "ltr" : undefined}
      className={cn(
        "inline-flex items-center rounded-pill px-10 py-4 text-caption font-semibold leading-none",
        variants[variant],
        className,
      )}
      {...rest}
    />
  );
}
