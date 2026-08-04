import type { NextConfig } from "next";
const config: NextConfig = {
  output: "standalone",
  transpilePackages: [
    "@factory/publication-contract",
    "@factory/template-loader",
    "@factory/template-runtime",
  ],
};
export default config;
