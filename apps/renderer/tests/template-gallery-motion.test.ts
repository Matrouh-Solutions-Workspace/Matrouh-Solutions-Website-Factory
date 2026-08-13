import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("public template gallery motion", () => {
  it("uses a hydration-independent motion controller", async () => {
    const [page, controls, controller] = await Promise.all([
      readFile(resolve(process.cwd(), "src/app/templates/page.tsx"), "utf8"),
      readFile(resolve(process.cwd(), "src/app/templates/gallery-controls.tsx"), "utf8"),
      readFile(resolve(process.cwd(), "public/template-gallery-motion.js"), "utf8"),
    ]);

    expect(page).toContain('src="/template-gallery-motion.js?v=2"');
    expect(page).toContain('data-gallery-reveal="card"');
    expect(controls).not.toContain('"use client"');
    expect(controller).toContain("data-gallery-motion-ready");
    expect(controller).toContain("IntersectionObserver");
    expect(controller).toContain("window.setTimeout(initializeGallery, 240)");
  });
});
