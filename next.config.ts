import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Lets a dev/test server build into its own folder without clobbering the production build in .next.
  distDir: process.env.NEXT_DIST_DIR || ".next",
};

export default nextConfig;
