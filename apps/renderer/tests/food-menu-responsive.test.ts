import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("food menu responsive layout", () => {
  it("does not apply page gutters or nested reveal animations to menu categories", async () => {
    const styles = await readFile(resolve(process.cwd(), "src/app/styles.css"), "utf8");

    expect(styles).toContain(".siteRoot main > section:not(.hero) > *");
    expect(styles).not.toContain(".siteRoot section:not(.hero) > *");
    expect(styles).toContain(
      '.siteRoot[data-template-artifact-id="com.matrouh.food-menu"] .foodMenuCategory',
    );
    expect(styles).toMatch(/\.foodMenuCategory\s*\{[^}]*padding:\s*0;/s);
  });

  it("keeps partially filled desktop menu grids compact and scalable", async () => {
    const styles = await readFile(resolve(process.cwd(), "src/app/styles.css"), "utf8");

    expect(styles).toContain(
      "grid-template-columns: repeat(auto-fill, minmax(min(16rem, 100%), 1fr));",
    );
    expect(styles).toContain("grid-template-columns: 6.75rem minmax(0, 1fr)");
    expect(styles).toContain("aspect-ratio: 4 / 3");
  });

  it("restores the café hamburger outside the immutable template artifact", async () => {
    const styles = await readFile(resolve(process.cwd(), "src/app/styles.css"), "utf8");

    expect(styles).toMatch(
      /data-template-artifact-id="com\.matrouh\.cafe-menu"[^}]*\.siteNavigationToggle\s*\{[^}]*display:\s*inline-flex !important;/s,
    );
  });
});
