import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  output: "standalone",
  // Keep the server-only Postgres client out of client bundles via module boundaries.
  serverExternalPackages: ["pg"],
  // pg (>=8.x) conditionally requires "pg-cloudflare" (its Cloudflare Workers socket
  // shim) from lib/stream.js. esbuild's "workerd" export condition resolves that to
  // pg-cloudflare/esm/index.mjs, but Next's output tracer only copies the CJS "dist/"
  // subset of external packages — so the OpenNext bundle fails to resolve it. Force the
  // full package (incl. esm/) into the output trace so the Worker bundle can resolve +
  // inline CloudflareSocket for pg-on-Workers (with Hyperdrive).
  outputFileTracingIncludes: {
    "/**": ["./node_modules/pg-cloudflare/**/*"],
  },
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "no-referrer" },
          { key: "X-DNS-Prefetch-Control", value: "off" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
          { key: "Cross-Origin-Resource-Policy", value: "same-origin" },
          {
            key: "Content-Security-Policy",
            value: "base-uri 'self'; form-action 'self'; frame-ancestors 'none'; object-src 'none'",
          },
          ...(process.env.NODE_ENV === "production"
            ? [
                {
                  key: "Strict-Transport-Security",
                  value: "max-age=31536000; includeSubDomains",
                },
              ]
            : []),
        ],
      },
    ];
  },
};

export default nextConfig;
