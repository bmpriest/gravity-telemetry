import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Ship images are served from /public, so no external image domains needed
  output: "standalone",
};

export default nextConfig;
