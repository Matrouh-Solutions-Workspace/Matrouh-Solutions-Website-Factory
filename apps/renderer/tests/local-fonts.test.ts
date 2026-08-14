import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("self-hosted application fonts", () => {
  it("keeps public rendering independent from Google font downloads", async () => {
    const [layout, styles] = await Promise.all([
      readFile(resolve(process.cwd(), "src/app/layout.tsx"), "utf8"),
      readFile(resolve(process.cwd(), "src/app/styles.css"), "utf8"),
    ]);

    expect(layout).not.toContain('from "next/font/google"');
    expect(layout).toContain('import "@fontsource/cairo/400.css"');
    expect(layout).toContain('import "@fontsource/tajawal/900.css"');
    expect(styles).toContain('--font-cairo: "Cairo"');
    expect(styles).toContain('--font-tajawal: "Tajawal"');
  });
});
