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

  it("includes the ready commerce library as public templates without catalog pricing", async () => {
    const [page, site] = await Promise.all([
      readFile(resolve(process.cwd(), "src/app/templates/page.tsx"), "utf8"),
      readFile(resolve(process.cwd(), "src/server/site.ts"), "utf8"),
    ]);

    expect(site).toContain("loadPublicCommerceTemplateCatalog");
    expect(site).toContain('commerceCatalogItem("fashion-store", "1.0.0")');
    expect(site).toContain('commerceCatalogItem("hardware-store", "1.0.0")');
    expect(site).toContain('commerceCatalogItem("pc-hardware-store", "1.0.0")');
    expect(site).toContain('category: "E-commerce"');
    expect(site).not.toContain("priceMinor: 40000");
    expect(page).toContain('templateId.startsWith("ecommerce:")');
    expect(page).toContain("/commerce-template-preview/");
  });

  it("uses concise category names instead of branded template names", async () => {
    const [page, site] = await Promise.all([
      readFile(resolve(process.cwd(), "src/app/templates/page.tsx"), "utf8"),
      readFile(resolve(process.cwd(), "src/server/site.ts"), "utf8"),
    ]);

    for (const name of ["Food Menu", "Clothes Store", "Hardware", "PC Hardware"]) {
      expect(site).toContain(`displayName: "${name}"`);
    }
    for (const brand of ["Saffron —", "Maison —", "Forge —", "Nexus —"]) {
      expect(site).not.toContain(brand);
    }
    for (const name of ["قائمة طعام", "متجر ملابس", "أدوات ومعدات", "مكونات كمبيوتر"]) {
      expect(page).toContain(`displayName: "${name}"`);
    }
  });

  it("includes the bilingual café QR menu in local catalog fallback metadata", async () => {
    const [page, site] = await Promise.all([
      readFile(resolve(process.cwd(), "src/app/templates/page.tsx"), "utf8"),
      readFile(resolve(process.cwd(), "src/server/site.ts"), "utf8"),
    ]);

    expect(site).toContain('templateId: "com.matrouh.cafe-menu"');
    expect(site).toContain('"qr-code"');
    expect(site).toContain('"printable-qr"');
    expect(page).toContain('displayName: "قائمة مقهى ومطعم بالـ QR"');
  });
});
