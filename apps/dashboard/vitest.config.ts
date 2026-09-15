import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    exclude: ["**/node_modules/**", "**/.next/**", "**/dist/**"],
    coverage: {
      exclude: [
        "**/.next/**",
        "**/coverage/**",
        "**/dist/**",
        "**/node_modules/**",
        "src/app/**/layout.tsx",
        "src/app/**/loading.tsx",
        "src/app/**/not-found.tsx",
        "src/app/**/page.tsx",
      ],
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
