import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import type { OrderStatus, ProductStatus } from "@prisma/client";
import { buttonClasses, type ButtonSize, type ButtonVariant } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/cn";
import { ORDER_STATUS_LABELS, PRODUCT_STATUS_LABELS } from "@/lib/admin/labels";

// Small server-safe building blocks of the admin (kit style, denser layout).

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-20 flex flex-wrap items-start justify-between gap-12">
      <div className="min-w-0">
        <h1 className="text-title font-semibold tracking-tight md:text-display-sm">{title}</h1>
        {description ? <p className="mt-4 text-body text-muted">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-8">{actions}</div> : null}
    </div>
  );
}

export function Panel({
  title,
  actions,
  children,
  className,
}: {
  title?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Card className={cn("p-16 md:p-20", className)}>
      {title || actions ? (
        <div className="mb-12 flex flex-wrap items-center justify-between gap-8">
          {title ? <h2 className="text-body-lg font-semibold">{title}</h2> : <span />}
          {actions}
        </div>
      ) : null}
      {children}
    </Card>
  );
}

type LinkButtonProps = Omit<ComponentProps<typeof Link>, "className"> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
};

/** Plain Next link styled as a kit button (the kit ButtonLink adds the locale prefix, not wanted here). */
export function LinkButton({ variant = "secondary", size = "sm", className, ...rest }: LinkButtonProps) {
  return <Link className={cn(buttonClasses({ variant, size }), className)} {...rest} />;
}

export const tableClass = "w-full text-start text-body";
export const thClass =
  "whitespace-nowrap border-b border-line px-12 py-8 text-start text-body-sm font-medium text-muted";
export const tdClass = "border-b border-line px-12 py-10 align-middle";

/** Horizontally scrollable table wrapper (relative: sr-only cells must not escape the scroller). */
export function TableWrap({ children }: { children: ReactNode }) {
  return <div className="relative -mx-4 overflow-x-auto px-4">{children}</div>;
}

export function EmptyState({ children }: { children: ReactNode }) {
  return <p className="py-32 text-center text-body text-muted">{children}</p>;
}

const orderTone: Record<OrderStatus, string> = {
  NEW: "bg-info-wash text-info",
  CONFIRMED: "bg-accent-wash text-ink",
  SHIPPED: "bg-warning-wash text-warning",
  DELIVERED: "bg-success-wash text-success",
  CANCELLED: "bg-error-wash text-error",
  RETURNED: "bg-canvas text-slate-ink",
};

const pill = "inline-flex items-center rounded-pill px-10 py-4 text-caption font-semibold leading-none whitespace-nowrap";

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  return <span className={cn(pill, orderTone[status])}>{ORDER_STATUS_LABELS[status]}</span>;
}

const productTone: Record<ProductStatus, string> = {
  DRAFT: "bg-warning-wash text-warning",
  ACTIVE: "bg-success-wash text-success",
  ARCHIVED: "bg-canvas text-slate-ink",
};

export function ProductStatusBadge({ status }: { status: ProductStatus }) {
  return <span className={cn(pill, productTone[status])}>{PRODUCT_STATUS_LABELS[status]}</span>;
}

export function ActiveBadge({ active }: { active: boolean }) {
  return (
    <span className={cn(pill, active ? "bg-success-wash text-success" : "bg-canvas text-slate-ink")}>
      {active ? "Actif" : "Inactif"}
    </span>
  );
}

/** One-shot message from ?notice=... / ?error=... (see redirectWithNotice). */
export function Notice({ notice, error }: { notice?: string; error?: string }) {
  if (!notice && !error) return null;
  return (
    <p
      role={error ? "alert" : "status"}
      className={cn(
        "mb-16 rounded-field px-16 py-12 text-body",
        error ? "bg-error-wash text-error" : "bg-success-wash text-success",
      )}
    >
      {error ?? notice}
    </p>
  );
}

/** Previous / next links that keep the current filters. */
export function Pager({
  page,
  pageCount,
  basePath,
  params,
}: {
  page: number;
  pageCount: number;
  basePath: string;
  params: Record<string, string | undefined>;
}) {
  if (pageCount <= 1) return null;
  const href = (target: number) => {
    const qs = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) if (value) qs.set(key, value);
    if (target > 1) qs.set("page", String(target));
    const text = qs.toString();
    return text ? `${basePath}?${text}` : basePath;
  };
  return (
    <nav aria-label="Pagination" className="mt-16 flex items-center justify-between gap-12">
      {page > 1 ? (
        <LinkButton href={href(page - 1)}>Précédent</LinkButton>
      ) : (
        <span />
      )}
      <span className="text-body text-muted">
        Page {page} / {pageCount}
      </span>
      {page < pageCount ? <LinkButton href={href(page + 1)}>Suivant</LinkButton> : <span />}
    </nav>
  );
}

export function pageOf(value: string | undefined): number {
  const n = Number.parseInt(value ?? "", 10);
  return Number.isFinite(n) && n > 0 ? n : 1;
}

/** First value of a search param. */
export function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}
