import type { ComponentProps } from "react";
import { Loader2 } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/cn";

export type ButtonVariant = "primary" | "accent" | "secondary" | "ghost";
export type ButtonSize = "sm" | "md" | "lg";

type Shared = {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
};

const base =
  "inline-flex select-none items-center justify-center gap-8 rounded-pill font-medium whitespace-nowrap transition-colors duration-fast ease-out-soft disabled:cursor-not-allowed aria-disabled:cursor-not-allowed";

const variants: Record<ButtonVariant, string> = {
  primary:
    "bg-ink text-on-accent hover:bg-slate-ink active:bg-slate-ink disabled:bg-line disabled:text-muted",
  accent:
    "bg-accent text-on-accent shadow-lg-2 hover:bg-accent-hover active:bg-accent-hover disabled:bg-line disabled:text-muted disabled:shadow-none",
  secondary:
    "border border-line bg-surface text-ink shadow-sm hover:bg-canvas active:bg-canvas disabled:text-muted disabled:shadow-none",
  ghost:
    "bg-transparent text-ink hover:bg-canvas active:bg-canvas disabled:text-muted",
};

const sizes: Record<ButtonSize, string> = {
  sm: "min-h-40 px-16 text-body",
  md: "min-h-44 px-20 text-body",
  lg: "min-h-48 px-24 text-body-lg",
};

/** Class names of a button, for elements that cannot be a Button (e.g. a label). */
export function buttonClasses({
  variant = "primary",
  size = "md",
  fullWidth = false,
}: Shared = {}): string {
  return cn(base, variants[variant], sizes[size], fullWidth && "w-full");
}

export type ButtonProps = Shared &
  Omit<ComponentProps<"button">, keyof Shared> & {
    loading?: boolean;
  };

export function Button({
  variant,
  size,
  fullWidth,
  loading = false,
  disabled,
  className,
  children,
  type = "button",
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(buttonClasses({ variant, size, fullWidth }), className)}
      {...rest}
    >
      {loading ? (
        <Loader2 aria-hidden="true" className="size-16 animate-spin" strokeWidth={1.5} />
      ) : null}
      {children}
    </button>
  );
}

export type ButtonLinkProps = Shared &
  Omit<ComponentProps<typeof Link>, keyof Shared | "href"> & {
    href: string;
    /** Plain anchor (wa.me, mailto:, tel:, other sites) instead of the localized Link. */
    external?: boolean;
  };

/** Link styled as a button. Internal hrefs are locale-prefixed by next-intl. */
export function ButtonLink({
  variant,
  size,
  fullWidth,
  external = false,
  className,
  href,
  children,
  ...rest
}: ButtonLinkProps) {
  const classes = cn(buttonClasses({ variant, size, fullWidth }), className);
  if (external) {
    const isWeb = href.startsWith("http");
    return (
      <a
        href={href}
        className={classes}
        target={isWeb ? "_blank" : undefined}
        rel={isWeb ? "noopener noreferrer" : undefined}
        {...(rest as Omit<ComponentProps<"a">, "href" | "className">)}
      >
        {children}
      </a>
    );
  }
  return (
    <Link href={href} className={classes} {...rest}>
      {children}
    </Link>
  );
}
