import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("public template categories", () => {
  it("renders bilingual category filters and preserves them while switching languages", async () => {
    const source = await readFile(resolve(process.cwd(), "src/app/templates/page.tsx"), "utf8");

    expect(source).toContain("templateGalleryCategoryFilter");
    expect(source).toContain("selectedCategory");
    expect(source).toContain("visibleTemplates");
    expect(source).toContain("templateGalleryHref");
    expect(source).toContain("template.categoryAr || localized.category || template.category");
    expect(source).toContain("All categories");
    expect(source).toContain("كل التصنيفات");
  });

  it("loads catalog-owned category labels from the database", async () => {
    const source = await readFile(resolve(process.cwd(), "src/server/site.ts"), "utf8");

    expect(source).toContain("entry.catalog_category, entry.catalog_category_ar");
    expect(source).toContain("category: row.catalog_category || row.category");
    expect(source).toContain("categoryAr: row.catalog_category_ar");
  });

  it("includes the ready commerce library as EGP 400 public packages", async () => {
    const [page, site] = await Promise.all([
      readFile(resolve(process.cwd(), "src/app/templates/page.tsx"), "utf8"),
      readFile(resolve(process.cwd(), "src/server/site.ts"), "utf8"),
    ]);

    expect(site).toContain("loadPublicCommerceTemplateCatalog");
    expect(site).toContain('commerceCatalogItem("fashion-store", "1.0.0")');
    expect(site).toContain('commerceCatalogItem("hardware-store", "1.0.0")');
    expect(site).toContain('commerceCatalogItem("pc-hardware-store", "1.0.0")');
    expect(site).toContain('category: "E-commerce"');
    expect(site).toContain("priceMinor: 40000");
    expect(page).toContain('templateId.startsWith("ecommerce:")');
    expect(page).toContain("/commerce-template-preview/");
  });
});
