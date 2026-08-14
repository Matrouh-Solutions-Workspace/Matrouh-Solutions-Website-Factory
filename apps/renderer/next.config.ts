import type { NextConfig } from "next";

const isDevelopment = process.env.NODE_ENV !== "production";
const scriptSrc = isDevelopment
  ? "script-src 'self' 'unsafe-inline' 'unsafe-eval'"
  : "script-src 'self' 'unsafe-inline'";
const dashboardFrameAncestor = new URL(
  process.env.FACTORY_DASHBOARD_PUBLIC_URL ?? "http://localhost:3000",
).origin;

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
        source: "/template-preview/:path*",
        headers: [
          { key: "Cache-Control", value: "private, no-store, max-age=0" },
          { key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" },
          {
            key: "Content-Security-Policy",
            value: `default-src 'self'; img-src 'self' https: data:; style-src 'self' 'unsafe-inline'; ${scriptSrc}; frame-src https://www.google.com https://maps.google.com; object-src 'none'; base-uri 'self'; frame-ancestors *`,
          },
        ],
      },
      {
        source: "/commerce-template-preview/:path*",
        headers: [
          { key: "Cache-Control", value: "private, no-store, max-age=0" },
          { key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" },
          {
            key: "Content-Security-Policy",
            value: `default-src 'self'; img-src 'self' https: data:; style-src 'self' 'unsafe-inline'; ${scriptSrc}; frame-src https://www.google.com https://maps.google.com; object-src 'none'; base-uri 'self'; frame-ancestors *`,
          },
        ],
      },
      {
        source: "/templates",
        headers: [
          {
            key: "Content-Security-Policy",
            value: `default-src 'self'; img-src 'self' https: data:; style-src 'self' 'unsafe-inline'; ${scriptSrc}; frame-src 'self' https://www.google.com https://maps.google.com; object-src 'none'; base-uri 'self'; frame-ancestors 'none'`,
          },
        ],
      },
      {
        source:
          "/((?!preview(?:/|$)|template-preview(?:/|$)|commerce-template-preview(?:/|$)|templates(?:/|$)|api(?:/|$)).*)",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=0, must-revalidate",
          },
          {
            key: "Content-Security-Policy",
            value: `default-src 'self'; img-src 'self' https: data:; style-src 'self' 'unsafe-inline'; ${scriptSrc}; frame-src https://www.google.com https://maps.google.com; object-src 'none'; base-uri 'self'; frame-ancestors ${dashboardFrameAncestor}`,
          },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Content-Type-Options", value: "nosniff" },
        ],
      },
    ];
  },
};
export default config;
