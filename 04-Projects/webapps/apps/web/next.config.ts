import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Linting is handled centrally via the root eslint.config.js + `turbo run lint`, not
  // Next.js's own build-time ESLint step (which isn't wired to eslint-config-next here).
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
