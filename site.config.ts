// Single source for brand identity. Never hardcode the brand name elsewhere.
// All values are placeholders until the real brand is decided.
export const siteConfig = {
  name: "Brand",
  logo: {
    src: "/logo.svg", // placeholder path, file added with the real logo
    width: 120,
    height: 32,
  },
  url: "http://localhost:3000",
  currency: "MAD",
  whatsapp: {
    // International format, digits only (used for wa.me links).
    number: "212600000000",
  },
  contact: {
    email: "contact@example.com",
    phone: "+212 600 000 000",
  },
  social: {
    instagram: "https://instagram.com/brand",
    facebook: "https://facebook.com/brand",
    tiktok: "https://tiktok.com/@brand",
  },
} as const;

export type SiteConfig = typeof siteConfig;
