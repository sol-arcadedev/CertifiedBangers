import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Default 1MB is too small for cover image uploads (WP1.2).
      bodySizeLimit: "5mb",
    },
  },
};

export default nextConfig;
