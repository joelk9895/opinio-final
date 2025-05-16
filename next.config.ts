import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Ensure we're not trying to use pages directory features
  typescript: {
    ignoreBuildErrors: false,
  },
  swcMinify: true,
};

export default nextConfig;
