import type { NextConfig } from "next";
const config: NextConfig = {
  output: "standalone",
  transpilePackages: ["@factory/template-loader", "@factory/template-validator"],
};
export default config;
