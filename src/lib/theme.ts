// Theme preference: "light", "dark" or "system" (default). Saved in the
// `theme` cookie so server layouts can set <html data-theme> without a flash.
export const THEME_COOKIE = "theme";
export const THEMES = ["light", "dark", "system"] as const;
export type Theme = (typeof THEMES)[number];

export function parseTheme(value: string | undefined): Theme {
  return THEMES.find((theme) => theme === value) ?? "system";
}
