import { Minus, Plus } from "lucide-react";
import { cn } from "@/lib/cn";

type Props = {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  labels: { decrease: string; increase: string; quantity: string };
  className?: string;
};

export function QuantityStepper({
  value,
  onChange,
  min = 1,
  max = 99,
  labels,
  className,
}: Props) {
  const button =
    "inline-flex size-44 items-center justify-center rounded-pill text-ink transition-colors duration-fast hover:bg-canvas disabled:cursor-not-allowed disabled:text-cool-stone disabled:hover:bg-transparent";
  return (
    <div
      role="group"
      aria-label={labels.quantity}
      className={cn(
        "inline-flex items-center rounded-pill border border-input-border bg-surface",
        className,
      )}
    >
      <button
        type="button"
        className={button}
        aria-label={labels.decrease}
        disabled={value <= min}
        onClick={() => onChange(Math.max(min, value - 1))}
      >
        <Minus aria-hidden="true" strokeWidth={1.5} className="size-16" />
      </button>
      <output
        aria-live="polite"
        dir="ltr"
        className="min-w-32 text-center text-body-lg font-medium"
      >
        {value}
      </output>
      <button
        type="button"
        className={button}
        aria-label={labels.increase}
        disabled={value >= max}
        onClick={() => onChange(Math.min(max, value + 1))}
      >
        <Plus aria-hidden="true" strokeWidth={1.5} className="size-16" />
      </button>
    </div>
  );
}
