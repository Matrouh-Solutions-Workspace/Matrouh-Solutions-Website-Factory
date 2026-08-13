import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("public renderer asset gateway", () => {
  it("forwards the template gallery controller to the renderer", async () => {
    const middleware = await readFile(resolve(process.cwd(), "src/middleware.ts"), "utf8");

    expect(middleware).toMatch(
      /pathname === "\/template-gallery-motion\.js"[\s\S]*?rendererRewrite\(request, dashboardHost\)/,
    );
  });
});
