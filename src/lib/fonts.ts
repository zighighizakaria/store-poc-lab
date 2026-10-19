import { IBM_Plex_Sans_Arabic, Inter } from "next/font/google";

// Latin (fr, en). The kit's GT Standard is commercial, Inter replaces it.
export const inter = Inter({
  subsets: ["latin", "latin-ext"],
  variable: "--font-inter",
  display: "swap",
});

// Arabic. --font-sans is switched to this one for lang="ar" in globals.css.
export const plexArabic = IBM_Plex_Sans_Arabic({
  subsets: ["arabic"],
  weight: ["400", "500", "700"],
  variable: "--font-plex-arabic",
  display: "swap",
});

export const fontVariables = `${inter.variable} ${plexArabic.variable}`;
