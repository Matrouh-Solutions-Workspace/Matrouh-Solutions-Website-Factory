import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("commerce preview parity", () => {
  it("keeps nested storefront navigation inside the preview route", async () => {
    const [storefront, preview] = await Promise.all([
      readFile(resolve(process.cwd(), "src/app/ecommerce-storefront.tsx"), "utf8"),
      readFile(
        resolve(process.cwd(), "src/app/commerce-template-preview/[rendererKey]/page.tsx"),
        "utf8",
      ),
    ]);

    expect(preview).toContain("previewBasePath");
    expect(storefront).toContain("storefrontHref");
    expect(storefront).toContain('href={storefrontHref("/cart")}');
    expect(storefront).toContain("productHref={storefrontHref(`/products/${item.slug}`)}");
  });

  it("uses Matrouh branding and optimized photographic heroes", async () => {
    const storefront = await readFile(
      resolve(process.cwd(), "src/app/ecommerce-storefront.tsx"),
      "utf8",
    );

    expect(storefront.match(/src="\/matrouh-logo.png"/g)).toHaveLength(2);
    expect(storefront).toContain('className="shopHeroPhoto"');
    expect(storefront).toContain('kind === "pc" ? "pc-retail" : kind');
    expect(storefront).toContain('className="shopPcQuickLinks"');
  });
});
