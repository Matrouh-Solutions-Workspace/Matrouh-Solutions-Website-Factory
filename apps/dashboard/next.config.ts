import type { NextConfig } from "next";
const config: NextConfig = {
  output: "standalone",
  transpilePackages: ["@factory/template-loader"],
  experimental: {
    serverActions: { bodySizeLimit: "6mb" },
  },
};
export default config;
