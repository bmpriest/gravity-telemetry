import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Standalone output produces a self-contained `.next/standalone/` directory
  // with only the runtime files needed to boot the server. The Dockerfile
  // copies that into the runner stage, which keeps the final image well under
  // 200 MB instead of carrying every node_module from devDependencies.
  output: "standalone",

  // ESLint here is `strictTypeChecked` + `stylisticTypeChecked`, which the
  // existing codebase does not fully satisfy (run `npm run lint` to see).
  // Linting stays a dev/editor concern and must not block production builds or
  // the Docker image. TypeScript type-checking still runs during `next build`.
  eslint: { ignoreDuringBuilds: true },

  // Ship images are served from /public, so no external image domains needed.
};

export default nextConfig;
