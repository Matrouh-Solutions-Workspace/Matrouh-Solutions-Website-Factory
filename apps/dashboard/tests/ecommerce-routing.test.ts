import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const appRoot = resolve(process.cwd());

describe("ecommerce storefront routing", () => {
  it("resolves commerce hostnames against the dashboard primary database", async () => {
    const [proxy, route, migration] = await Promise.all([
      readFile(resolve(appRoot, "src/proxy.ts"), "utf8"),
      readFile(resolve(appRoot, "src/app/api/internal/ecommerce/resolve/route.ts"), "utf8"),
      readFile(
        resolve(
          appRoot,
          "../../packages/database/prisma/migrations/0031_dashboard_ecommerce_storefront_access/migration.sql",
        ),
        "utf8",
      ),
    ]);

    expect(proxy).toContain('new URL("/api/internal/ecommerce/resolve", dashboardInternalBase)');
    expect(proxy).not.toContain('new URL("/api/storefront/resolve", rendererBase)');
    expect(route).toContain("resolve_active_ecommerce_store");
    expect(route).toContain('{ "Cache-Control": "private, no-store, max-age=0" }');
    expect(migration).toContain(
      "GRANT EXECUTE ON FUNCTION get_ecommerce_storefront(text, text) TO factory_app",
    );
  });
});
