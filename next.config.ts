import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  experimental: {
    // Admin image uploads go through server actions, one file (max 5 MB) per
    // request. The default limit is 1 MB.
    serverActions: { bodySizeLimit: "12mb" },
    // The middleware (admin auth) buffers request bodies up to this size.
    middlewareClientMaxBodySize: "12mb",
  },
};

export default withNextIntl(nextConfig);
