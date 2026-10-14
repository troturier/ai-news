import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Minimal Docker image (standalone server.js).
  output: "standalone",
  /* config options here */
  // Deliberately disabled (as in Daily Planner): simple dynamic rendering, `dynamic = "force-dynamic"` usable.
  cacheComponents: false,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
