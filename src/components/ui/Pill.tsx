import type { ComponentProps } from "react";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/cn";

// Kit "Category Pill": 9999px, white, hairline border, soft shadow.
const base =
  "inline-flex min-h-44 items-center justify-center gap-8 rounded-pill border px-16 text-body-lg font-medium whitespace-nowrap shadow-sm transition-colors duration-fast ease-out-soft";

function pillClasses(selected: boolean) {
  return cn(
    base,
    selected
      ? "border-ink bg-ink text-on-ink"
      : "border-line bg-surface text-ink hover:bg-canvas",
  );
}

type PillButtonProps = ComponentProps<"button"> & { selected?: boolean };

/** Selectable chip (toggle). */
export function Pill({ selected = false, className, type = "button", ...rest }: PillButtonProps) {
  return (
    <button
      type={type}
      aria-pressed={selected}
      className={cn(pillClasses(selected), className)}
      {...rest}
    />
  );
}

type PillLinkProps = Omit<ComponentProps<typeof Link>, "href"> & {
  href: string;
  selected?: boolean;
};

/** Chip that navigates (category row, active-filter chips). */
export function PillLink({ selected = false, className, href, ...rest }: PillLinkProps) {
  return (
    <Link
      href={href}
      aria-current={selected ? "true" : undefined}
      className={cn(pillClasses(selected), className)}
      {...rest}
    />
  );
}
