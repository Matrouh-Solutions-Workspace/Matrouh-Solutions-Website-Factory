import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "dotenv";
import { defineConfig } from "prisma/config";

const packageRoot = dirname(fileURLToPath(import.meta.url));
const workspaceRoot = resolve(packageRoot, "../..");

for (const envFile of [resolve(workspaceRoot, ".env.local"), resolve(workspaceRoot, ".env")]) {
  if (existsSync(envFile)) config({ path: envFile });
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations" },
  datasource: {
    url: process.env.DATABASE_URL ?? "postgresql://factory:factory@localhost:5432/factory",
  },
});
