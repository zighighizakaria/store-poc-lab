import type { ComponentProps, ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/cn";

const field =
  "min-h-44 w-full rounded-pill border border-input-border bg-surface px-20 text-body-lg text-ink placeholder:text-muted aria-[invalid=true]:border-error disabled:bg-canvas disabled:text-muted";

/** Pill text input (16px to avoid iOS zoom on focus). */
export function Input({ className, ...rest }: ComponentProps<"input">) {
  return <input className={cn(field, className)} {...rest} />;
}

/** Multi-line input: 20px radius (kit field radius) instead of a pill. */
export function Textarea({ className, ...rest }: ComponentProps<"textarea">) {
  return (
    <textarea
      className={cn(field, "resize-none rounded-field py-12", className)}
      {...rest}
    />
  );
}

/** Native select drawn as a pill, with the chevron on the inline-end side. */
export function Select({
  className,
  children,
  ...rest
}: ComponentProps<"select">) {
  return (
    <span className="relative block">
      <select
        className={cn(field, "cursor-pointer appearance-none pe-44", className)}
        {...rest}
      >
        {children}
      </select>
      <ChevronDown
        aria-hidden="true"
        strokeWidth={1.5}
        className="pointer-events-none absolute end-16 top-1/2 size-16 -translate-y-1/2 text-ink"
      />
    </span>
  );
}

type FieldProps = {
  label: string;
  htmlFor: string;
  error?: string;
  help?: string;
  children: ReactNode;
  className?: string;
};

/** Label + control + helper/error text. */
export function Field({ label, htmlFor, error, help, children, className }: FieldProps) {
  return (
    <div className={cn("flex flex-col gap-6", className)}>
      <label htmlFor={htmlFor} className="text-body font-medium text-ink">
        {label}
      </label>
      {children}
      {error ? (
        <p role="alert" className="text-body-sm text-error">
          {error}
        </p>
      ) : help ? (
        <p className="text-body-sm text-muted">{help}</p>
      ) : null}
    </div>
  );
}
