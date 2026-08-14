import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("template title scale", () => {
  it("caps commerce hero titles across desktop, RTL, and mobile layouts", async () => {
    const styles = await readFile(resolve(process.cwd(), "public/commerce-storefront.css"), "utf8");

    expect(styles).toContain(".commercePublicRoot .shopHeroCopy h1");
    expect(styles).toContain('.commercePublicRoot[dir="rtl"] .shopHeroCopy h1');
    expect(styles).toContain("font-size: clamp(2.8rem, 5vw, 5.6rem)");
    expect(styles).toContain("font-size: clamp(2.35rem, 11vw, 3.6rem)");
  });

  it("uses compact clinic 2.0 title scales with Arabic-aware line height", async () => {
    const styles = await readFile(resolve(process.cwd(), "src/app/styles.css"), "utf8");

    expect(styles).toContain(
      '.siteRoot[data-template-artifact-id="com.matrouh.clinic"][data-template-version="2.0.0"]',
    );
    expect(styles).toContain("Clinic 2.0 final title scale");
    expect(styles).toContain("font-size: clamp(2.75rem, 4vw, 4.5rem)");
    expect(styles).toContain("font-size: clamp(2.1rem, 3.2vw, 3.5rem)");
    expect(styles).toContain("font-size: clamp(2.65rem, 3.65vw, 4.15rem)");
    expect(styles).toContain("font-size: clamp(1.7rem, 8.5vw, 2.4rem)");
    expect(styles).toContain("line-height: 1.16");
  });

  it("uses the locally hosted Cairo and Tajawal families for Studio Folio Arabic titles", async () => {
    const styles = await readFile(resolve(process.cwd(), "src/app/styles.css"), "utf8");

    expect(styles).toContain(
      "font-family: var(--font-cairo), Cairo, var(--font-tajawal), Tajawal, Arial, sans-serif",
    );
    expect(styles).not.toContain("font-family: Tahoma, Arial, sans-serif");
  });

  it("keeps the PC retail campaign framed and responsive", async () => {
    const styles = await readFile(resolve(process.cwd(), "public/commerce-storefront.css"), "utf8");

    expect(styles).toContain("width: min(calc(100% - 3rem), 1500px)");
    expect(styles).toContain(".shopPcQuickLinks");
    expect(styles).toContain('.shopTheme--pc[dir="rtl"] .shopHeroPhoto');
    expect(styles).toContain("grid-template-columns: repeat(2, minmax(0, 1fr))");
  });
});
