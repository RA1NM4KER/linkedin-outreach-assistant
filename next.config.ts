import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingExcludes: {
    "/*": [".playwright-profile/**/*", "data/**/*", "test-results/**/*"],
  },
};

export default nextConfig;
