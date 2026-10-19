"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "@/components/ThemeProvider";
import { cn } from "@/lib/cn";
import type { Theme } from "@/lib/theme";

const OPTIONS = [
  { value: "light", icon: Sun },
  { value: "dark", icon: Moon },
  { value: "system", icon: Monitor },
] as const;

type Props = {
  labels: Record<Theme | "group", string>;
  className?: string;
};

/** Light / dark / system switch: three icon buttons, the active one is pressed. */
export function ThemeToggle({ labels, className }: Props) {
  const { theme, setTheme } = useTheme();

  return (
    <div role="group" aria-label={labels.group} className={cn("flex items-center gap-4", className)}>
      {OPTIONS.map(({ value, icon: Icon }) => {
        const active = theme === value;
        return (
          <button
            key={value}
            type="button"
            aria-pressed={active}
            aria-label={labels[value]}
            title={labels[value]}
            onClick={() => setTheme(value)}
            className={cn(
              "inline-flex size-44 items-center justify-center rounded-pill",
              active ? "bg-ink text-on-ink" : "text-ink hover:bg-canvas",
            )}
          >
            <Icon aria-hidden="true" strokeWidth={1.5} className="size-20" />
          </button>
        );
      })}
    </div>
  );
}
