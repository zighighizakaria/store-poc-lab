import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      // Seed placeholder images. Replace with the real storage host later.
      { protocol: "https", hostname: "placehold.co" },
    ],
  },
  experimental: {
    // Admin image uploads go through server actions (max 5 MB per image; a
    // banner form can carry two). The default limit is 1 MB.
    serverActions: { bodySizeLimit: "12mb" },
    // The middleware (admin auth) buffers request bodies up to this size.
    middlewareClientMaxBodySize: "12mb",
  },
};

export default withNextIntl(nextConfig);
