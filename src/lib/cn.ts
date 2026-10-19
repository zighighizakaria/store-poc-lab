import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

// Teach tailwind-merge the project's custom tokens (theme.css) so that, for
// example, `text-body` (font size) and `text-muted` (color) do not override
// each other.
const twMerge = extendTailwindMerge({
  extend: {
    theme: {
      text: [
        "micro",
        "caption",
        "body-sm",
        "body",
        "body-lg",
        "title",
        "display-sm",
        "display",
        "display-lg",
      ],
      radius: ["card", "image", "pill", "field"],
    },
  },
});

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
