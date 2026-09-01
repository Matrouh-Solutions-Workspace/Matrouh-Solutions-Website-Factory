import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    exclude: ["**/node_modules/**", "**/.next/**", "**/dist/**"],
    coverage: {
      provider: "v8",
      thresholds: {
        branches: 49,
        functions: 24,
        lines: 5,
        statements: 5,
      },
    },
  },
});
