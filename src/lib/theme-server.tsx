import { cookies } from "next/headers";
import { parseTheme, THEME_COOKIE, type Theme } from "@/lib/theme";

export async function getTheme(): Promise<Theme> {
  return parseTheme((await cookies()).get(THEME_COOKIE)?.value);
}

/** <html> attribute: the fixed theme, or none while the preference is "system". */
export function htmlTheme(theme: Theme) {
  return theme === "system" ? undefined : theme;
}

/**
 * Resolves "system" from prefers-color-scheme before first paint (inline in
 * <head>), so the page never flashes the wrong theme.
 */
export function ThemeScript({ theme }: { theme: Theme }) {
  if (theme !== "system") return null;
  return (
    <script
      dangerouslySetInnerHTML={{
        __html:
          'document.documentElement.dataset.theme=matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light"',
      }}
    />
  );
}
