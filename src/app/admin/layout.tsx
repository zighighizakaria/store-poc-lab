import type { Metadata } from "next";
import { fontVariables } from "@/lib/fonts";
import { siteConfig } from "../../../site.config";
import "../globals.css";

export const metadata: Metadata = {
  title: `Admin | ${siteConfig.name}`,
  robots: { index: false, follow: false },
};

// Admin is French only and outside locale routing, so it has its own root layout.
export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr" dir="ltr" className={fontVariables}>
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
