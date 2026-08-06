import type { NextConfig } from "next";

const isDevelopment = process.env.NODE_ENV !== "production";
const scriptSrc = isDevelopment
  ? "script-src 'self' 'unsafe-inline' 'unsafe-eval'"
  : "script-src 'self' 'unsafe-inline'";

const config: NextConfig = {
  output: "standalone",
  transpilePackages: [
    "@factory/database",
    "@factory/domains",
    "@factory/publication-contract",
    "@factory/template-loader",
    "@factory/template-runtime",
  ],
  async headers() {
    return [
      {
        source: "/preview/:path*",
        headers: [
          { key: "Cache-Control", value: "private, no-store, max-age=0" },
          { key: "Pragma", value: "no-cache" },
          { key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" },
        ],
      },
      {
        source: "/((?!preview(?:/|$)|api(?:/|$)).*)",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=0, must-revalidate",
          },
          {
            key: "Content-Security-Policy",
            value:
              `default-src 'self'; img-src 'self' https: data:; style-src 'self' 'unsafe-inline'; ${scriptSrc}; object-src 'none'; base-uri 'self'; frame-ancestors 'none'`,
          },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Content-Type-Options", value: "nosniff" },
        ],
      },
    ];
  },
};
export default config;
