import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Minimal Docker image (standalone server.js).
  output: "standalone",
  poweredByHeader: false,
  async headers() {
    const isProd = process.env.NODE_ENV === "production";
    // Scripts: own bundle + inline Next/theme scripts + Cloudflare Turnstile. Images may come from any https source
    // (articles are illustrated from their original site). `unsafe-eval` is only needed by the dev server.
    const csp = [
      "default-src 'self'",
      `script-src 'self' 'unsafe-inline'${isProd ? "" : " 'unsafe-eval'"} https://challenges.cloudflare.com`,
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https:",
      "font-src 'self' data:",
      "connect-src 'self' https://challenges.cloudflare.com",
      "frame-src https://challenges.cloudflare.com",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "object-src 'none'",
      ...(isProd ? ["upgrade-insecure-requests"] : []),
    ].join("; ");
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Content-Security-Policy", value: csp },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()" },
        ],
      },
    ];
  },
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
