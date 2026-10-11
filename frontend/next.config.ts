import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* Disable Turbopack for production builds to avoid font resolution issues */
  experimental: {},
};

export default nextConfig;
