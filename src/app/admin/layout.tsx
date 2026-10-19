import type { Metadata } from "next";
import { ThemeProvider } from "@/components/ThemeProvider";
import { fontVariables } from "@/lib/fonts";
import { getTheme, htmlTheme, ThemeScript } from "@/lib/theme-server";
import { siteConfig } from "../../../site.config";
import "../globals.css";

export const metadata: Metadata = {
  title: `Admin | ${siteConfig.name}`,
  robots: { index: false, follow: false },
};

// Admin is French only and outside locale routing, so it has its own root layout.
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const theme = await getTheme();

  return (
    <html lang="fr" dir="ltr" data-theme={htmlTheme(theme)} className={fontVariables} suppressHydrationWarning>
      <head>
        <ThemeScript theme={theme} />
      </head>
      <body className="min-h-screen">
        <ThemeProvider initial={theme}>{children}</ThemeProvider>
      </body>
    </html>
  );
}
