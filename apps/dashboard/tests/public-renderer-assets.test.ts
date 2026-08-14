import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("public renderer asset gateway", () => {
  it("forwards the template gallery controller to the renderer", async () => {
    const middleware = await readFile(resolve(process.cwd(), "src/middleware.ts"), "utf8");

    expect(middleware).toMatch(
      /pathname === "\/template-gallery-motion\.js"[\s\S]*?rendererProxy\(request, dashboardHost\)/,
    );
  });

  it("forwards commerce preview branding and hero assets on the dashboard origin", async () => {
    const middleware = await readFile(resolve(process.cwd(), "src/middleware.ts"), "utf8");

    expect(middleware).toContain('pathname === "/commerce-storefront.css"');
    expect(middleware).toContain('pathname === "/matrouh-logo.png"');
    expect(middleware).toContain('pathname.startsWith("/commerce-heroes/")');
  });
});
